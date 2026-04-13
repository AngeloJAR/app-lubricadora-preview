"use server";

import { createClient } from "@/lib/supabase/server";
import type { PagoEmpleado, PagoEmpleadoFormData } from "@/types";

async function requireAdmin() {
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

  if (error || !perfil || perfil.rol !== "admin") {
    throw new Error("No autorizado");
  }

  return { supabase, user };
}
async function getCajaAbiertaId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("cajas")
    .select("id")
    .eq("estado", "abierta")
    .order("fecha_apertura", { ascending: false })
    .maybeSingle();

  if (error) {
    console.error("Error obteniendo caja abierta para pago de empleado:", error.message);
    throw new Error("No se pudo validar la caja abierta");
  }

  if (!data?.id) {
    throw new Error("No hay una caja abierta");
  }

  return data.id as string;
}

export async function getEmpleadosActivos() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("usuarios_app")
    .select("id, nombre, email, rol, activo")
    .eq("activo", true)
    .in("rol", ["admin", "tecnico", "recepcion"])
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error al obtener empleados:", error.message);
    throw new Error("No se pudieron cargar los empleados");
  }

  return data ?? [];
}

export async function getPagosEmpleados(filters?: {
  from?: string;
  to?: string;
  empleado_id?: string;
  tipo_pago?:
  | "todos"
  | "sueldo"
  | "anticipo"
  | "bono"
  | "comision"
  | "descuento";
}): Promise<PagoEmpleado[]> {
  const { supabase } = await requireAdmin();

  let query = supabase
    .from("empleados_pagos")
    .select(`
      *,
      usuarios_app:empleado_id (
        id,
        nombre,
        email,
        rol
      )
    `)
    .order("fecha_pago", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.from) {
    query = query.gte("fecha_pago", filters.from);
  }

  if (filters?.to) {
    query = query.lte("fecha_pago", filters.to);
  }

  if (filters?.empleado_id) {
    query = query.eq("empleado_id", filters.empleado_id);
  }

  if (filters?.tipo_pago && filters.tipo_pago !== "todos") {
    query = query.eq("tipo_pago", filters.tipo_pago);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error al obtener pagos de empleados:", error.message);
    throw new Error("No se pudieron cargar los pagos de empleados");
  }

  return (data ?? []) as PagoEmpleado[];
}

export async function createPagoEmpleado(payload: PagoEmpleadoFormData) {
  const { supabase, user } = await requireAdmin();

  const empleado_id = payload.empleado_id.trim();
  const tipo_pago = payload.tipo_pago;
  const monto = Number(payload.monto);
  const fecha_pago = payload.fecha_pago.trim();
  const periodo_inicio = payload.periodo_inicio.trim() || null;
  const periodo_fin = payload.periodo_fin.trim() || null;
  const observaciones = payload.observaciones.trim() || null;

  if (!empleado_id) {
    throw new Error("El empleado es obligatorio");
  }

  if (
    !["sueldo", "anticipo", "bono", "comision", "descuento"].includes(tipo_pago)
  ) {
    throw new Error("El tipo de pago no es válido");
  }

  if (!monto || monto <= 0) {
    throw new Error("El monto debe ser mayor a 0");
  }

  if (!fecha_pago) {
    throw new Error("La fecha de pago es obligatoria");
  }

  const cajaId = await getCajaAbiertaId(supabase);

  const { data, error } = await supabase
    .from("empleados_pagos")
    .insert([
      {
        empleado_id,
        tipo_pago,
        monto,
        fecha_pago,
        periodo_inicio,
        periodo_fin,
        observaciones,
      },
    ])
    .select(`
      *,
      usuarios_app:empleado_id ( id, nombre, email, rol )
    `)
    .single();

  if (error || !data) {
    console.error("Error al registrar pago de empleado:", error?.message);
    throw new Error("No se pudo registrar el pago del empleado");
  }

  const nombreEmpleado =
    (data as PagoEmpleado & {
      usuarios_app?: { nombre?: string | null } | null;
    }).usuarios_app?.nombre?.trim() || "empleado";

  const { error: movimientoError } = await supabase
    .from("caja_movimientos")
    .insert({
      caja_id: cajaId,
      tipo: "egreso",
      categoria: "pago_empleado",
      monto,
      descripcion: `Pago de ${tipo_pago} a ${nombreEmpleado}`,
      cuenta: "caja",
      origen_fondo: "negocio",
      naturaleza: "gasto_operativo",
      metodo_pago: "efectivo",
      creado_por: user.id,
      referencia_tipo: "empleado_pago",
      referencia_id: data.id,
      fecha: fecha_pago,
    });

  if (movimientoError) {
    console.error("Error registrando movimiento de caja por pago de empleado:", {
      message: movimientoError.message,
      details: movimientoError.details,
      hint: movimientoError.hint,
      code: movimientoError.code,
    });

    await supabase.from("empleados_pagos").delete().eq("id", data.id);

    throw new Error("No se pudo registrar la salida en caja del pago del empleado");
  }

  return data as PagoEmpleado;
}

export async function deletePagoEmpleado(pagoId: string) {
  const { supabase } = await requireAdmin();

  const { error: movimientoError } = await supabase
    .from("caja_movimientos")
    .delete()
    .eq("referencia_tipo", "empleado_pago")
    .eq("referencia_id", pagoId);

  if (movimientoError) {
    console.error("Error al eliminar movimiento de caja del pago de empleado:", movimientoError.message);
    throw new Error("No se pudo eliminar el movimiento de caja del pago del empleado");
  }

  const { error } = await supabase
    .from("empleados_pagos")
    .delete()
    .eq("id", pagoId);

  if (error) {
    console.error("Error al eliminar pago de empleado:", error.message);
    throw new Error("No se pudo eliminar el pago del empleado");
  }

  return { success: true };
}