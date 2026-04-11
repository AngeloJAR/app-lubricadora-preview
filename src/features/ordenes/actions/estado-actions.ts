"use server";

import { createClient } from "@/lib/supabase/server";
import { validarTransicionEstadoOrden } from "@/features/ordenes/domain/orden.service";
import { registrarAuditoriaLog } from "@/lib/core/auditoria/logs";
import { calcularPuntosOrden } from "@/features/clientes/fidelizacion-utils";
import { registrarPuntosCliente } from "@/features/clientes/fidelizacion-actions";
import type { OrdenTrabajo, OrdenItem } from "@/types";

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

  const debeRegistrarPuntos =
    (estado === "completada" || estado === "entregada") &&
    ordenAntes.estado !== "completada" &&
    ordenAntes.estado !== "entregada";

  if (debeRegistrarPuntos) {
    const { data: movimientoExistente } = await supabase
      .from("cliente_puntos_movimientos")
      .select("id")
      .eq("orden_id", ordenId)
      .eq("tipo", "acumulacion")
      .maybeSingle();

    if (!movimientoExistente) {
      const { data: itemsOrden } = await supabase
        .from("orden_items")
        .select("*")
        .eq("orden_id", ordenId);

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
  }

  return data;
}