"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  Caja,
  CajaAperturaFormData,
  CajaCierreFormData,
  CajaMovimiento,
  CajaMovimientoFormData,
} from "@/types";
import { registrarCajaMovimiento } from "@/lib/core/finanzas/registrar-caja-movimiento";
import { getSaldosDineroActuales } from "@/lib/core/finanzas/saldos";
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

async function getSaldoDisponibleTransferencia(
  cuenta: "caja" | "boveda" | "banco" | "deuna"
) {
  if (cuenta === "caja") {
    const resumenActual = await getCajaResumenActual();
    return resumenActual?.esperado ?? 0;
  }

  const { saldoBoveda, saldoBanco, saldoDeuna } =
    await getSaldosDineroActuales();

  if (cuenta === "boveda") return saldoBoveda;
  if (cuenta === "banco") return saldoBanco;
  return saldoDeuna;
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
      fecha_apertura: new Date().toISOString(),
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
  if (montoApertura > 0) {
    try {
      await transferirEntreCuentas({
        cuenta_origen: "boveda",
        cuenta_destino: "caja",
        montoInput: String(montoApertura),
        descripcionInput:
          payload.observaciones.trim() || "Apertura de caja desde bóveda",
      });
    } catch (error) {
      await supabase.from("cajas").delete().eq("id", data.id);

      throw new Error(
        error instanceof Error
          ? error.message
          : "No se pudo mover el dinero de bóveda a caja para la apertura."
      );
    }
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
  let naturalezaFinal = payload.naturaleza;

  if (payload.tipo === "ingreso") {
    if (!naturalezaFinal || naturalezaFinal === "gasto_operativo") {
      naturalezaFinal = "ingreso_operativo";
    }
  }

  if (payload.tipo === "egreso") {
    if (!naturalezaFinal || naturalezaFinal === "ingreso_operativo") {
      naturalezaFinal = "gasto_operativo";
    }
  }
  const data = await registrarCajaMovimiento({
    supabase,
    caja_id: cajaAbierta.id,
    tipo: payload.tipo,
    categoria: payload.categoria,
    monto,
    descripcion: descripcion || null,
    cuenta: payload.cuenta ?? "caja",
    origen_fondo: payload.origen_fondo ?? "negocio",
    naturaleza: naturalezaFinal,
    metodo_pago: payload.metodo_pago,
    referencia_tipo: "manual",
    referencia_id: crypto.randomUUID(),
    creado_por: user.id,
  });

  return data as CajaMovimiento;
}

export async function transferirCajaABoveda(
  montoInput: string,
  descripcionInput?: string | null
): Promise<{ success: true }> {
  return transferirEntreCuentas({
    cuenta_origen: "caja",
    cuenta_destino: "boveda",
    montoInput,
    descripcionInput,
  });
}

export async function transferirEntreCuentas({
  cuenta_origen,
  cuenta_destino,
  montoInput,
  descripcionInput,
}: {
  cuenta_origen: "caja" | "boveda" | "banco" | "deuna";
  cuenta_destino: "caja" | "boveda" | "banco" | "deuna";
  montoInput: string;
  descripcionInput?: string | null;
}): Promise<{ success: true }> {
  const { supabase, user } = await requireCajaAccess();

  if (cuenta_origen === cuenta_destino) {
    throw new Error("La cuenta origen y destino no pueden ser iguales");
  }

  const cajaAbierta = await getCajaAbiertaInterna();

  if (!cajaAbierta) {
    throw new Error("No hay una caja abierta");
  }

  const monto = toNumber(montoInput);

  if (Number.isNaN(monto) || monto <= 0) {
    throw new Error("El monto no es válido");
  }
  const saldoDisponible = await getSaldoDisponibleTransferencia(cuenta_origen);

  if (monto > saldoDisponible) {
    throw new Error(
      `No puedes transferir más dinero del disponible en ${cuenta_origen}`
    );
  }

  const descripcionBase =
    descripcionInput?.trim() ||
    `Transferencia de ${cuenta_origen} a ${cuenta_destino}`;

  const referenciaTransferencia =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `transferencia-${Date.now()}`;

  let egresoId: string | null = null;

  try {
    const egreso = await registrarCajaMovimiento({
      supabase,
      caja_id: cajaAbierta.id,
      tipo: "egreso",
      categoria: "transferencia_interna",
      monto,
      descripcion: descripcionBase,
      cuenta: cuenta_origen,
      origen_fondo: "negocio",
      naturaleza: "transferencia_interna",
      metodo_pago: "efectivo",
      referencia_tipo: "transferencia_interna",
      referencia_id: referenciaTransferencia,
      creado_por: user.id,
      cuenta_destino,
    });

    egresoId = egreso.id;

    await registrarCajaMovimiento({
      supabase,
      caja_id: cajaAbierta.id,
      tipo: "ingreso",
      categoria: "transferencia_interna",
      monto,
      descripcion: descripcionBase,
      cuenta: cuenta_destino,
      origen_fondo: "negocio",
      naturaleza: "transferencia_interna",
      metodo_pago: "efectivo",
      referencia_tipo: "transferencia_interna",
      referencia_id: referenciaTransferencia,
      creado_por: user.id,
      cuenta_destino: cuenta_origen,
    });
  } catch (error) {
    if (egresoId) {
      await supabase.from("caja_movimientos").delete().eq("id", egresoId);
    }

    throw new Error("No se pudo completar la transferencia entre cuentas");
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

  if (montoCierre > 0) {
    await transferirEntreCuentas({
      cuenta_origen: "caja",
      cuenta_destino: "boveda",
      montoInput: String(montoCierre),
      descripcionInput:
        payload.observaciones.trim() || "Cierre de caja enviado a bóveda",
    });
  }
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
    console.error("Error cerrando caja:", error);
    throw new Error(error?.message || "No se pudo cerrar la caja.");
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
      : ingresos - egresos;

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

  const esperado = ingresos - egresos;
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
}> {
  const { supabase } = await requireCajaAccess();

  const { data, error } = await supabase
    .from("caja_movimientos")
    .select("tipo, monto, cuenta")
    .eq("cuenta", "boveda")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error obteniendo movimientos de bóveda:", error.message);
    throw new Error("No se pudo obtener el resumen de bóveda");
  }

  const movimientos = (data ?? []) as CajaMovimiento[];

  const ingresos = movimientos
    .filter((item) => item.tipo === "ingreso")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);

  const egresos = movimientos
    .filter((item) => item.tipo === "egreso")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);

  const { saldoBoveda } = await getSaldosDineroActuales();

  return {
    ingresos,
    egresos,
    saldo: saldoBoveda,
    cantidadMovimientos: movimientos.length,
  };
}
