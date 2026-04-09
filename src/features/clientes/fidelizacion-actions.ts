"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  ClienteFidelizacionResumen,
  ClientePuntosMovimiento,
} from "@/types";

export async function getClienteFidelizacionResumen(
  clienteId: string
): Promise<ClienteFidelizacionResumen> {
  const supabase = await createClient();

  const movimientosResponse = await supabase
    .from("cliente_puntos_movimientos")
    .select("id, tipo, puntos, cliente_id")
    .eq("cliente_id", clienteId);

  if (movimientosResponse.error) {
    console.error("Error tabla cliente_puntos_movimientos:", {
      message: movimientosResponse.error.message,
      details: movimientosResponse.error.details,
      hint: movimientosResponse.error.hint,
      code: movimientosResponse.error.code,
    });

    return {
      puntosDisponibles: 0,
      puntosGanados: 0,
      puntosCanjeados: 0,
      totalVisitas: 0,
      promocionesDisponibles: 0,
    };
  }

  const promocionesResponse = await supabase
    .from("cliente_promociones")
    .select("id")
    .eq("cliente_id", clienteId)
    .eq("activa", true)
    .eq("usada", false);

  if (promocionesResponse.error) {
    console.error("Error tabla cliente_promociones:", {
      message: promocionesResponse.error.message,
      details: promocionesResponse.error.details,
      hint: promocionesResponse.error.hint,
      code: promocionesResponse.error.code,
    });

    return {
      puntosDisponibles: 0,
      puntosGanados: 0,
      puntosCanjeados: 0,
      totalVisitas: 0,
      promocionesDisponibles: 0,
    };
  }

  const ordenesResponse = await supabase
    .from("ordenes_trabajo")
    .select("id")
    .eq("cliente_id", clienteId);

  if (ordenesResponse.error) {
    console.error("Error tabla ordenes_trabajo:", {
      message: ordenesResponse.error.message,
      details: ordenesResponse.error.details,
      hint: ordenesResponse.error.hint,
      code: ordenesResponse.error.code,
    });

    return {
      puntosDisponibles: 0,
      puntosGanados: 0,
      puntosCanjeados: 0,
      totalVisitas: 0,
      promocionesDisponibles: 0,
    };
  }

  const movimientos = movimientosResponse.data ?? [];

  const puntosGanados = movimientos
    .filter(
      (item) =>
        item.tipo === "acumulacion" ||
        (item.tipo === "ajuste" && Number(item.puntos) > 0)
    )
    .reduce((acc, item) => acc + Number(item.puntos || 0), 0);

  const puntosCanjeados = movimientos
    .filter(
      (item) =>
        item.tipo === "canje" ||
        (item.tipo === "ajuste" && Number(item.puntos) < 0)
    )
    .reduce((acc, item) => acc + Math.abs(Number(item.puntos || 0)), 0);

  return {
    puntosDisponibles: puntosGanados - puntosCanjeados,
    puntosGanados,
    puntosCanjeados,
    totalVisitas: ordenesResponse.data?.length ?? 0,
    promocionesDisponibles: promocionesResponse.data?.length ?? 0,
  };
}

export async function getClientePuntosMovimientos(
  clienteId: string
): Promise<ClientePuntosMovimiento[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cliente_puntos_movimientos")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error getClientePuntosMovimientos:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    return [];
  }

  return (data ?? []) as ClientePuntosMovimiento[];
}

export async function registrarPuntosCliente({
  clienteId,
  vehiculoId,
  ordenId,
  puntos,
  motivo,
}: {
  clienteId: string;
  vehiculoId: string | null;
  ordenId: string | null;
  puntos: number;
  motivo: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase.from("cliente_puntos_movimientos").insert({
    cliente_id: clienteId,
    vehiculo_id: vehiculoId,
    orden_id: ordenId,
    tipo: "acumulacion",
    puntos,
    motivo,
  });

  if (error) {
    console.error("Error registrarPuntosCliente:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error("No se pudieron registrar los puntos del cliente");
  }
}

export async function canjearPuntosCliente({
  clienteId,
  puntos,
  motivo,
  ordenId,
}: {
  clienteId: string;
  puntos: number;
  motivo: string;
  ordenId?: string | null;
}) {
  const supabase = await createClient();

  if (!Number.isFinite(puntos) || puntos <= 0) {
    throw new Error("Los puntos a canjear no son válidos");
  }

  const resumen = await getClienteFidelizacionResumen(clienteId);

  if (resumen.puntosDisponibles < puntos) {
    throw new Error("El cliente no tiene suficientes puntos disponibles");
  }

  const { error } = await supabase.from("cliente_puntos_movimientos").insert({
    cliente_id: clienteId,
    vehiculo_id: null,
    orden_id: ordenId ?? null,
    tipo: "canje",
    puntos: -Math.abs(puntos),
    motivo: motivo.trim() || "Canje manual de puntos",
  });

  if (error) {
    console.error("Error canjearPuntosCliente:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error("No se pudieron canjear los puntos del cliente");
  }

  return { success: true };
}