"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  Caja,
  CajaAperturaFormData,
  CajaCierreFormData,
  CajaMovimiento,
  CajaMovimientoFormData,
} from "@/types";

type PerfilActivo = {
  id: string;
  rol: "admin" | "recepcion" | "tecnico";
  activo: boolean;
};

type CajaResumen = {
  caja: Caja;
  ingresos: number;
  egresos: number;
  esperado: number;
  cantidadMovimientos: number;
};

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

async function requireCajaAccess() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("No autorizado");
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("usuarios_app")
    .select("id, rol, activo")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();

  if (perfilError || !perfil) {
    throw new Error("No autorizado");
  }

  const perfilActivo = perfil as PerfilActivo;

  if (perfilActivo.rol !== "admin" && perfilActivo.rol !== "recepcion") {
    throw new Error("No autorizado");
  }

  return {
    supabase,
    user,
    perfil: perfilActivo,
  };
}

async function getCajaAbiertaInterna() {
  const { supabase } = await requireCajaAccess();

  const { data, error } = await supabase
    .from("cajas")
    .select("*")
    .eq("estado", "abierta")
    .order("fecha_apertura", { ascending: false })
    .maybeSingle();

  if (error) {
    console.error("Error obteniendo caja abierta:", error.message);
    throw new Error("No se pudo obtener la caja abierta");
  }

  return (data ?? null) as Caja | null;
}

export async function getCajaAbierta(): Promise<Caja | null> {
  return getCajaAbiertaInterna();
}

export async function getCajaById(cajaId: string): Promise<Caja> {
  const { supabase } = await requireCajaAccess();

  const { data, error } = await supabase
    .from("cajas")
    .select("*")
    .eq("id", cajaId)
    .single();

  if (error || !data) {
    console.error("Error obteniendo caja por id:", error?.message);
    throw new Error("No se pudo obtener la caja");
  }

  return data as Caja;
}

export async function abrirCaja(
  payload: CajaAperturaFormData
): Promise<Caja> {
  const { supabase, user } = await requireCajaAccess();

  const cajaAbierta = await getCajaAbiertaInterna();

  if (cajaAbierta) {
    throw new Error("Ya existe una caja abierta");
  }

  const montoApertura = toNumber(payload.monto_apertura);

  if (Number.isNaN(montoApertura) || montoApertura < 0) {
    throw new Error("El monto de apertura no es válido");
  }

  const hoy = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("cajas")
    .insert({
      fecha: hoy,
      estado: "abierta",
      monto_apertura: montoApertura,
      observaciones: payload.observaciones.trim() || null,
      abierto_por: user.id,
      monto_esperado: montoApertura,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Error abriendo caja:", error?.message);
    throw new Error("No se pudo abrir la caja");
  }

  return data as Caja;
}

export async function getCajaMovimientos(
  cajaId: string
): Promise<CajaMovimiento[]> {
  const { supabase } = await requireCajaAccess();

  const { data, error } = await supabase
    .from("caja_movimientos")
    .select("*")
    .eq("caja_id", cajaId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error obteniendo movimientos de caja:", error.message);
    throw new Error("No se pudieron obtener los movimientos de caja");
  }

  return (data ?? []) as CajaMovimiento[];
}

export async function registrarMovimientoCaja(
  payload: CajaMovimientoFormData
): Promise<CajaMovimiento> {
  const { supabase, user } = await requireCajaAccess();

  const cajaAbierta = await getCajaAbiertaInterna();

  if (!cajaAbierta) {
    throw new Error("No hay una caja abierta");
  }

  const monto = toNumber(payload.monto);

  if (Number.isNaN(monto) || monto <= 0) {
    throw new Error("El monto no es válido");
  }

  const descripcion = payload.descripcion.trim();

  const { data, error } = await supabase
    .from("caja_movimientos")
    .insert({
      caja_id: cajaAbierta.id,
      tipo: payload.tipo,
      categoria: payload.categoria,
      monto,
      descripcion: descripcion || null,

      cuenta: payload.cuenta ?? "caja",
      origen_fondo: payload.origen_fondo ?? "negocio",
      naturaleza: payload.naturaleza ?? "gasto_operativo",

      metodo_pago: payload.metodo_pago,
      creado_por: user.id,
      referencia_tipo: "manual",
      referencia_id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Error registrando movimiento de caja:", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
    });
    throw new Error("No se pudo registrar el movimiento");
  }

  return data as CajaMovimiento;
}

export async function transferirCajaABoveda(
  montoInput: string,
  descripcionInput?: string | null
): Promise<{ success: true }> {
  const { supabase, user } = await requireCajaAccess();

  const cajaAbierta = await getCajaAbiertaInterna();

  if (!cajaAbierta) {
    throw new Error("No hay una caja abierta");
  }

  const monto = toNumber(montoInput);

  if (Number.isNaN(monto) || monto <= 0) {
    throw new Error("El monto no es válido");
  }

  const movimientos = await getCajaMovimientos(cajaAbierta.id);

  const ingresosCaja = movimientos
    .filter((item) => item.tipo === "ingreso" && item.cuenta === "caja")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);

  const egresosCaja = movimientos
    .filter((item) => item.tipo === "egreso" && item.cuenta === "caja")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);

  const saldoCajaActual =
    toNumber(cajaAbierta.monto_apertura) + ingresosCaja - egresosCaja;

  if (monto > saldoCajaActual) {
    throw new Error("No puedes transferir más dinero del disponible en caja");
  }

  const descripcionBase =
    descripcionInput?.trim() || "Transferencia de caja a bóveda";

  const referenciaTransferencia =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `transferencia-${Date.now()}`;

  const { data: egresoCaja, error: errorEgresoCaja } = await supabase
    .from("caja_movimientos")
    .insert({
      caja_id: cajaAbierta.id,
      tipo: "egreso",
      categoria: "ajuste",
      monto,
      descripcion: descripcionBase,
      cuenta: "caja",
      origen_fondo: "negocio",
      naturaleza: "transferencia_interna",
      metodo_pago: "efectivo",
      creado_por: user.id,
      referencia_tipo: "transferencia_interna",
      referencia_id: referenciaTransferencia,
    })
    .select("id")
    .single();

  if (errorEgresoCaja || !egresoCaja) {
    console.error("Error registrando egreso de caja:", {
      message: errorEgresoCaja?.message,
      details: errorEgresoCaja?.details,
      hint: errorEgresoCaja?.hint,
      code: errorEgresoCaja?.code,
    });
    throw new Error("No se pudo registrar la salida de caja");
  }

  const { error: errorIngresoBoveda } = await supabase
    .from("caja_movimientos")
    .insert({
      caja_id: cajaAbierta.id,
      tipo: "ingreso",
      categoria: "ajuste",
      monto,
      descripcion: descripcionBase,
      cuenta: "boveda",
      origen_fondo: "negocio",
      naturaleza: "transferencia_interna",
      metodo_pago: "efectivo",
      creado_por: user.id,
      referencia_tipo: "transferencia_interna",
      referencia_id: referenciaTransferencia,
    });

  if (errorIngresoBoveda) {
    console.error("Error registrando ingreso en bóveda:", {
      message: errorIngresoBoveda.message,
      details: errorIngresoBoveda.details,
      hint: errorIngresoBoveda.hint,
      code: errorIngresoBoveda.code,
    });

    await supabase.from("caja_movimientos").delete().eq("id", egresoCaja.id);

    throw new Error("No se pudo registrar el ingreso en bóveda");
  }

  return { success: true };
}


export async function cerrarCaja(
  payload: CajaCierreFormData
): Promise<Caja> {
  const { supabase, user } = await requireCajaAccess();

  const resumen = await getCajaResumenActual();

  if (!resumen) {
    throw new Error("No hay una caja abierta");
  }

  const montoCierre = toNumber(payload.monto_cierre);

  if (Number.isNaN(montoCierre) || montoCierre < 0) {
    throw new Error("El monto de cierre no es válido");
  }

  const montoEsperado = resumen.esperado;
  const diferencia = montoCierre - montoEsperado;

  const { data, error } = await supabase
    .from("cajas")
    .update({
      estado: "cerrada",
      monto_cierre: montoCierre,
      monto_esperado: montoEsperado,
      diferencia,
      observaciones: payload.observaciones.trim() || resumen.caja.observaciones,
      cerrado_por: user.id,
      fecha_cierre: new Date().toISOString(),
    })
    .eq("id", resumen.caja.id)
    .select()
    .single();

  if (error || !data) {
    console.error("Error cerrando caja:", error?.message);
    throw new Error("No se pudo cerrar la caja");
  }

  return data as Caja;
}

export async function getCajasRecientes(limit = 15): Promise<Caja[]> {
  const { supabase } = await requireCajaAccess();

  const safeLimit = Math.max(1, Math.min(limit, 50));

  const { data, error } = await supabase
    .from("cajas")
    .select("*")
    .order("fecha_apertura", { ascending: false })
    .limit(safeLimit);

  if (error) {
    console.error("Error obteniendo cajas recientes:", error.message);
    throw new Error("No se pudieron obtener las cajas");
  }

  return (data ?? []) as Caja[];
}

export async function getCajaResumenById(
  cajaId: string
): Promise<CajaResumen> {
  const caja = await getCajaById(cajaId);
  const movimientos = await getCajaMovimientos(cajaId);

  const ingresos = movimientos
    .filter((item) => item.tipo === "ingreso" && item.cuenta === "caja")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);

  const egresos = movimientos
    .filter((item) => item.tipo === "egreso" && item.cuenta === "caja")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);

  const esperado =
    caja.estado === "cerrada" && caja.monto_esperado !== null
      ? toNumber(caja.monto_esperado)
      : toNumber(caja.monto_apertura) + ingresos - egresos;

  return {
    caja,
    ingresos,
    egresos,
    esperado,
    cantidadMovimientos: movimientos.length,
  };
}

export async function getCajaResumenActual(): Promise<CajaResumen | null> {
  const caja = await getCajaAbiertaInterna();

  if (!caja) return null;

  const movimientos = await getCajaMovimientos(caja.id);

  const ingresos = movimientos
    .filter((m) => m.tipo === "ingreso" && m.cuenta === "caja")
    .reduce((acc, m) => acc + toNumber(m.monto), 0);

  const egresos = movimientos
    .filter((m) => m.tipo === "egreso" && m.cuenta === "caja")
    .reduce((acc, m) => acc + toNumber(m.monto), 0);

  const esperado = toNumber(caja.monto_apertura) + ingresos - egresos;

  return {
    caja,
    ingresos,
    egresos,
    esperado,
    cantidadMovimientos: movimientos.length,
  };
}

export async function getBovedaResumenActual(): Promise<{
  ingresos: number;
  egresos: number;
  saldo: number;
  cantidadMovimientos: number;
} | null> {
  const caja = await getCajaAbiertaInterna();

  if (!caja) return null;

  const movimientos = await getCajaMovimientos(caja.id);

  const ingresos = movimientos
    .filter((item) => item.tipo === "ingreso" && item.cuenta === "boveda")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);

  const egresos = movimientos
    .filter((item) => item.tipo === "egreso" && item.cuenta === "boveda")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);

  const saldo = ingresos - egresos;

  return {
    ingresos,
    egresos,
    saldo,
    cantidadMovimientos: movimientos.length,
  };
}
