import { createClient } from "@/lib/supabase/server";
import {
  normalizeCuentaDinero,
  normalizeMetodoPago,
  normalizeNaturalezaMovimiento,
} from "./reglas";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function registrarCajaMovimiento(params: {
  supabase: SupabaseServerClient;
  caja_id: string | null;
  tipo: "ingreso" | "egreso";
  categoria: string;
  monto: number;
  descripcion?: string | null;
  referencia_tipo: string;
  referencia_id: string;
  metodo_pago?: string | null;
  cuenta?: string | null;
  origen_fondo?: string | null;
  naturaleza?: string | null;
  cuenta_destino?: string | null;
  creado_por: string;
}) {
  const monto = Number(params.monto ?? 0);

  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("El monto del movimiento no es válido.");
  }

  if (!params.caja_id) {
    throw new Error("No se puede registrar el movimiento porque no hay una caja válida.");
  }

  const cuenta = normalizeCuentaDinero(params.cuenta);
  const metodo_pago = normalizeMetodoPago(params.metodo_pago);
  const naturaleza = normalizeNaturalezaMovimiento(params.naturaleza);

  const { data, error } = await params.supabase
    .from("caja_movimientos")
    .insert({
      caja_id: params.caja_id,
      tipo: params.tipo,
      categoria: params.categoria,
      monto,
      descripcion: params.descripcion?.trim() || null,
      referencia_tipo: params.referencia_tipo,
      referencia_id: params.referencia_id,
      metodo_pago,
      cuenta,
      origen_fondo: params.origen_fondo ?? "negocio",
      naturaleza,
      cuenta_destino: params.cuenta_destino ?? null,
      creado_por: params.creado_por,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Error registrarCajaMovimiento:", error);
    throw new Error(
      error?.message || "No se pudo registrar el movimiento financiero."
    );
  }

  return data;
}