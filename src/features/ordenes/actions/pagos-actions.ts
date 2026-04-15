"use server";

import { createClient } from "@/lib/supabase/server";
import {
  normalizeMetodoPago,
  normalizeCuentaDinero,
  resolveCuentaDesdeMetodoPago,
} from "@/lib/core/finanzas/reglas";

export async function registrarPagoOrden({
  ordenId,
  monto,
  metodo_pago,
  cuenta: cuentaInput,
}: {
  ordenId: string;
  monto: number;
  metodo_pago: "efectivo" | "transferencia" | "deuna" | "tarjeta" | "mixto";
  cuenta?: "caja" | "banco" | "deuna" | "boveda" | "tarjeta_por_cobrar";
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuario no autenticado");

  const metodo = normalizeMetodoPago(metodo_pago);

  if (metodo === "mixto" && !cuentaInput) {
    throw new Error("Debes indicar la cuenta cuando el método de pago es mixto.");
  }

  const cuenta = normalizeCuentaDinero(
    cuentaInput ?? resolveCuentaDesdeMetodoPago(metodo)
  );

  if (cuenta === "boveda") {
    throw new Error("La bóveda no es una cuenta válida para cobrar órdenes.");
  }

  const { data, error } = await supabase.rpc("registrar_pago_orden_atomic", {
    p_orden_id: ordenId,
    p_monto: Number(monto),
    p_metodo_pago: metodo,
    p_cuenta: cuenta,
    p_user_id: user.id,
  });

  if (error) {
    throw new Error(error.message || "No se pudo registrar el pago");
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result?.ok) {
    throw new Error("No se pudo registrar el pago");
  }

  return {
    ok: true as const,
    saldo_restante: Number(result.saldo_restante ?? 0),
    total_pagado: Number(result.total_pagado ?? 0),
    estado_pago: result.estado_pago as "pendiente" | "abonada" | "pagada",
    orden_estado: result.orden_estado as "completada" | "entregada",
  };
}