"use server";

import { createClient } from "@/lib/supabase/server";
import { validarTransicionEstadoOrden } from "@/features/ordenes/domain/orden.service";
import { registrarAuditoriaLog } from "@/lib/core/auditoria/logs";
import { calcularPuntosOrden } from "@/features/clientes/fidelizacion-utils";
import { registrarPuntosCliente } from "@/features/clientes/fidelizacion-actions";
import type { OrdenTrabajo, OrdenItem } from "@/types";

import {
  procesarSalidaStockPorOrden,
  procesarEntradaStockPorCancelacion,
} from "@/features/ordenes/domain/orden-stock.service";


export async function updateOrdenEstado(
  ordenId: string,
  estado: OrdenTrabajo["estado"]
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autorizado");
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("usuarios_app")
    .select("rol, activo")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();

  if (perfilError || !perfil) {
    throw new Error("No autorizado");
  }

  const { data: ordenAntes, error: ordenAntesError } = await supabase
    .from("ordenes_trabajo")
    .select("id, cliente_id, vehiculo_id, estado, hora_inicio, hora_fin")
    .eq("id", ordenId)
    .single();

  if (ordenAntesError || !ordenAntes) {
    throw new Error("No se pudo validar la orden");
  }

  const validacionTransicion = validarTransicionEstadoOrden({
    rol: perfil.rol as "admin" | "recepcion" | "tecnico",
    estadoActual: ordenAntes.estado,
    nuevoEstado: estado,
  });

  if (!validacionTransicion.ok) {
    throw new Error(validacionTransicion.errores.join(" | "));
  }

  const { data: itemsOrden, error: itemsError } = await supabase
    .from("orden_items")
    .select("tipo_item, producto_id, nombre_item, cantidad, precio_unitario")
    .eq("orden_id", ordenId);

  if (itemsError) {
    throw new Error("No se pudieron obtener los items de la orden");
  }

  const items = itemsOrden ?? [];

  const stockYaDescontado =
    ordenAntes.estado === "completada" || ordenAntes.estado === "entregada";

  const stockDebeDescontarseAhora =
    (estado === "completada" || estado === "entregada") && !stockYaDescontado;

  const stockDebeDevolverseAhora =
    stockYaDescontado &&
    (estado === "pendiente" || estado === "en_proceso" || estado === "cancelada");

  if (stockDebeDescontarseAhora) {
    await procesarSalidaStockPorOrden({
      supabase,
      ordenId,
      items,
    });
  }

  if (stockDebeDevolverseAhora) {
    await procesarEntradaStockPorCancelacion({
      supabase,
      ordenId,
      items,
    });
  }

  const payloadUpdate: Partial<OrdenTrabajo> = {
    estado,
  };

  if (estado === "en_proceso" && !ordenAntes.hora_inicio) {
    payloadUpdate.hora_inicio = new Date().toISOString();
  }

  if (estado === "completada") {
    if (!ordenAntes.hora_inicio) {
      payloadUpdate.hora_inicio = new Date().toISOString();
    }
    payloadUpdate.hora_fin = new Date().toISOString();
  }

  if (estado === "pendiente" || estado === "en_proceso") {
    payloadUpdate.hora_fin = null;
  }

  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .update(payloadUpdate)
    .eq("id", ordenId)
    .select()
    .single();

  if (error) {
    throw new Error("No se pudo actualizar el estado de la orden");
  }

  try {
    await registrarAuditoriaLog({
      supabase,
      usuario_id: user.id,
      entidad: "orden",
      entidad_id: ordenId,
      accion: "cambio_estado",
      descripcion: `Cambio de estado de ${ordenAntes.estado} a ${estado}`,
      datos_antes: { estado: ordenAntes.estado },
      datos_despues: { estado },
    });
  } catch (auditError) {
    console.error("No se pudo registrar auditoría de cambio de estado:", auditError);
  }

  const debeRegistrarPuntos =
    (estado === "completada" || estado === "entregada") &&
    ordenAntes.estado !== "completada" &&
    ordenAntes.estado !== "entregada";

  if (debeRegistrarPuntos) {
    try {
      const { data: movimientoExistente } = await supabase
        .from("cliente_puntos_movimientos")
        .select("id")
        .eq("orden_id", ordenId)
        .eq("tipo", "acumulacion")
        .maybeSingle();

      if (!movimientoExistente) {
        const puntos = calcularPuntosOrden((itemsOrden ?? []) as OrdenItem[]);

        if (puntos > 0) {
          await registrarPuntosCliente({
            clienteId: ordenAntes.cliente_id,
            vehiculoId: ordenAntes.vehiculo_id,
            ordenId,
            puntos,
            motivo: `Puntos generados por la orden ${ordenId}`,
          });
        }
      }
    } catch (puntosError) {
      console.error("No se pudieron registrar los puntos de la orden:", puntosError);
    }
  }

  return data;
}