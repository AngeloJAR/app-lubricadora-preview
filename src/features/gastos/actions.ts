"use server";

import { createClient } from "@/lib/supabase/server";
import type { Gasto, GastoFormData } from "@/types";
import { revalidatePath } from "next/cache";

type GetGastosFilters = {
  from?: string;
  to?: string;
  tipo_gasto?: "fijo" | "variable" | "todos";
  ambito?: "negocio" | "personal" | "todos";
  metodo_pago?:
  | "efectivo"
  | "transferencia"
  | "deuna"
  | "tarjeta"
  | "mixto"
  | "todos";
  afecta_caja?: "si" | "no" | "todos";
};

async function requireAdminOrRecepcion() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autorizado");
  }

  const { data: perfil, error } = await supabase
    .from("usuarios_app")
    .select("rol, activo")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();

  if (
    error ||
    !perfil ||
    (perfil.rol !== "admin" && perfil.rol !== "recepcion")
  ) {
    throw new Error("No autorizado");
  }

  return { supabase, user, perfil };
}

async function getCajaAbiertaInterna() {
  const { supabase } = await requireAdminOrRecepcion();

  const { data, error } = await supabase
    .from("cajas")
    .select("id, estado")
    .eq("estado", "abierta")
    .order("fecha_apertura", { ascending: false })
    .maybeSingle();

  if (error) {
    console.error("Error obteniendo caja abierta para gasto:", error.message);
    throw new Error("No se pudo verificar la caja abierta");
  }

  return data ?? null;
}

function normalizarTipoGasto(
  value: GastoFormData["tipo_gasto"]
): "fijo" | "variable" {
  return value === "fijo" || value === "variable" ? value : "variable";
}

function normalizarAmbito(
  value: GastoFormData["ambito"]
): "negocio" | "personal" {
  return value === "personal" ? "personal" : "negocio";
}

function normalizarMetodoPago(
  value?: string | null
): "efectivo" | "transferencia" | "deuna" | "tarjeta" | "mixto" {
  if (
    value === "efectivo" ||
    value === "transferencia" ||
    value === "deuna" ||
    value === "tarjeta" ||
    value === "mixto"
  ) {
    return value;
  }

  return "efectivo";
}

export async function getGastos(
  filters?: GetGastosFilters
): Promise<Gasto[]> {
  const supabase = await createClient();

  let query = supabase
    .from("gastos")
    .select("*")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.from) {
    query = query.gte("fecha", filters.from);
  }

  if (filters?.to) {
    query = query.lte("fecha", filters.to);
  }

  if (filters?.tipo_gasto && filters.tipo_gasto !== "todos") {
    query = query.eq("tipo_gasto", filters.tipo_gasto);
  }

  if (filters?.ambito && filters.ambito !== "todos") {
    query = query.eq("ambito", filters.ambito);
  }

  if (filters?.metodo_pago && filters.metodo_pago !== "todos") {
    query = query.eq("metodo_pago", filters.metodo_pago);
  }

  if (filters?.afecta_caja && filters.afecta_caja !== "todos") {
    query = query.eq("afecta_caja", filters.afecta_caja === "si");
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error al obtener gastos:", error.message);
    throw new Error("No se pudieron cargar los gastos");
  }

  return (data ?? []) as Gasto[];
}

export async function createGasto(payload: GastoFormData) {
  const { supabase, user } = await requireAdminOrRecepcion();

  const categoria = payload.categoria.trim();
  const descripcion = payload.descripcion.trim() || null;
  const monto = Number(payload.monto);
  const fecha = payload.fecha.trim();
  const tipo_gasto = normalizarTipoGasto(payload.tipo_gasto);
  const ambito = normalizarAmbito(payload.ambito);
  const metodo_pago = normalizarMetodoPago(payload.metodo_pago);
  const afecta_caja = Boolean(payload.afecta_caja);

  if (!categoria) {
    throw new Error("La categoría es obligatoria");
  }

  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("El monto debe ser mayor a 0");
  }

  if (!fecha) {
    throw new Error("La fecha es obligatoria");
  }

  let cajaAbierta: Awaited<ReturnType<typeof getCajaAbiertaInterna>> = null;

  if (afecta_caja) {
    cajaAbierta = await getCajaAbiertaInterna();

    if (!cajaAbierta) {
      throw new Error(
        "No hay una caja abierta. Abre caja antes de registrar un gasto que afecte caja."
      );
    }
  }

  const { data: gasto, error: gastoError } = await supabase
    .from("gastos")
    .insert([
      {
        categoria,
        descripcion,
        monto,
        fecha,
        tipo_gasto,
        ambito,
        metodo_pago,
        afecta_caja,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (gastoError || !gasto) {
    console.error("Error al crear gasto:", gastoError?.message);
    throw new Error("No se pudo registrar el gasto");
  }

  if (afecta_caja && cajaAbierta) {
    const descripcionCaja = [
      ambito === "negocio" ? "Gasto negocio" : "Gasto personal",
      categoria,
      descripcion,
    ]
      .filter(Boolean)
      .join(" · ");

    const { error: cajaMovimientoError } = await supabase
      .from("caja_movimientos")
      .insert({
        caja_id: cajaAbierta.id,
        gasto_id: gasto.id,
        tipo: "egreso",
        categoria: ambito === "negocio" ? "gasto" : "gasto_personal",
        monto,
        descripcion: descripcionCaja || categoria,
        metodo_pago,
        cuenta: metodo_pago === "efectivo" ? "caja" : metodo_pago === "deuna" ? "deuna" : "banco",
        origen_fondo: "negocio",
        naturaleza: ambito === "negocio" ? "gasto_operativo" : "retiro_dueno",
        creado_por: user.id,
      });

    if (cajaMovimientoError) {
      console.error(
        "Error al registrar movimiento de caja por gasto:",
        cajaMovimientoError.message
      );

      await supabase.from("gastos").delete().eq("id", gasto.id);

      throw new Error(
        "No se pudo registrar el egreso en caja. El gasto no fue guardado."
      );
    }
  }

  return gasto as Gasto;
}

export async function deleteGasto(gastoId: string) {
  const supabase = await createClient();

  const { error: movimientoError } = await supabase
    .from("caja_movimientos")
    .delete()
    .eq("gasto_id", gastoId);

  if (movimientoError) {
    console.error("Error eliminando movimiento de caja:", movimientoError);
    throw new Error("No se pudo eliminar el movimiento de caja del gasto");
  }

  const { error: gastoError } = await supabase
    .from("gastos")
    .delete()
    .eq("id", gastoId);

  if (gastoError) {
    console.error("Error eliminando gasto:", gastoError);
    throw new Error("No se pudo eliminar el gasto");
  }

  revalidatePath("/gastos");
  revalidatePath("/caja");

  return { success: true };
}