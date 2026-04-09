"use server";

import { createClient } from "@/lib/supabase/server";
import { getAlertasStock } from "@/features/productos/actions";
import {
  getDashboardRange,
  type DashboardPeriodo,
} from "./dashboard-periodo";

import type {
  DashboardClienteReciente,
  DashboardMantenimientoProximo,
  DashboardMetricas,
  DashboardServicioTop,
  DashboardProductoRentable,
  DashboardAlerta,
  DashboardAccionSugerida,
  DashboardSerieFinanciera,
  ClienteCampaniaReactivacion,
  DashboardClienteInactivo,
} from "@/types";

type VentaTotalRow = {
  total: number | null;
};

type MovimientoCostoRow = {
  cantidad: number | null;
  costo_unitario: number | null;
  total?: number | null;
};

type GastoMontoRow = {
  monto: number | null;
  fecha?: string | null;
  tipo_gasto?: "fijo" | "variable" | null;
  naturaleza?: string | null;
  cuenta?: string | null;
  origen_fondo?: string | null;
};

type PagoEmpleadoRow = {
  monto: number | null;
  fecha_pago: string | null;
  naturaleza?: string | null;
  cuenta?: string | null;
  origen_fondo?: string | null;
};

type CajaMovimientoRow = {
  tipo: "ingreso" | "egreso";
  monto: number | null;
  cuenta: "caja" | "banco" | "deuna" | "boveda" | "tarjeta_por_cobrar" | null;
  origen_fondo: "negocio" | "prestamo" | "personal" | "socio" | null;
  naturaleza:
  | "ingreso_operativo"
  | "gasto_operativo"
  | "aporte"
  | "prestamo_recibido"
  | "pago_prestamo"
  | "retiro_dueno"
  | "transferencia_interna"
  | null;
  created_at: string | null;
};

type DashboardResumenDinero = {
  saldoCaja: number;
  saldoBanco: number;
  saldoDeuna: number;
  saldoBoveda: number;
  saldoTarjetaPorCobrar: number;
  saldoTotalLiquido: number;
  dineroPrestamoDisponible: number;
  dineroPrestamoIngresado: number;
  dineroPrestamoUsado: number;
  pagoPrestamo: number;
  utilidadRealPeriodo: number;
  utilidadRealMes: number;
};

type DashboardTecnicoMetricas = {
  ordenesPendientes: number;
  ordenesEnProceso: number;
  ordenesTerminadasHoy: number;
};

type OrdenTecnicoAsignacionRow = {
  orden_id: string;
};

type OrdenDashboardRow = {
  id: string;
  estado: string;
  hora_fin: string | null;
};

type ProductoRentableMovimientoRow = {
  producto_id: string;
  cantidad: number;
  costo_unitario: number | null;
  precio_unitario: number | null;
  productos:
  | {
    id: string;
    nombre: string;
  }
  | {
    id: string;
    nombre: string;
  }[]
  | null;
};

type ServicioRentabilidadRow = {
  nombre_item: string;
  total: number | null;
};

type ClienteInactivoRow = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  ordenes_trabajo: {
    created_at: string;
  }[];
};

type ClienteInactivoParaCampania = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  whatsapp: string | null;
  acepta_promociones: boolean | null;
  ordenes_trabajo: {
    created_at: string;
  }[];
};

type MantenimientoRow = {
  id: string;
  numero: string;
  proximo_mantenimiento_fecha: string | null;
  proximo_mantenimiento_km: number | null;
  clientes:
  | {
    id: string;
    nombres: string;
    apellidos: string;
    telefono: string;
  }
  | {
    id: string;
    nombres: string;
    apellidos: string;
    telefono: string;
  }[]
  | null;
  vehiculos:
  | {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
  }
  | {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
  }[]
  | null;
};

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function sumBy<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((acc, item) => acc + getValue(item), 0);
}

function calcMargen(ventas: number, utilidad: number) {
  if (ventas <= 0) return 0;
  return (utilidad / ventas) * 100;
}

function logSupabaseError(label: string, error: unknown) {
  if (!error || typeof error !== "object") {
    console.error(label, error);
    return;
  }

  const supabaseError = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  console.error(label, {
    message: supabaseError.message ?? null,
    details: supabaseError.details ?? null,
    hint: supabaseError.hint ?? null,
    code: supabaseError.code ?? null,
  });
}

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function isNaturalezaOperativa(naturaleza?: string | null) {
  return !naturaleza || naturaleza === "gasto_operativo";
}

function calcularSaldoPorCuenta(
  movimientos: CajaMovimientoRow[],
  cuenta: "caja" | "banco" | "deuna" | "boveda" | "tarjeta_por_cobrar",
  montoApertura = 0
) {
  const saldoMovimientos = movimientos
    .filter((item) => item.cuenta === cuenta)
    .reduce((acc, item) => {
      const monto = toNumber(item.monto);
      return item.tipo === "ingreso" ? acc + monto : acc - monto;
    }, 0);

  if (cuenta === "caja") {
    return montoApertura + saldoMovimientos;
  }

  return saldoMovimientos;
}

function calcularPrestamoIngresado(movimientos: CajaMovimientoRow[]) {
  return movimientos
    .filter((item) => item.naturaleza === "prestamo_recibido")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);
}

function calcularPrestamoUsado(
  movimientos: CajaMovimientoRow[],
  gastos: GastoMontoRow[],
  pagosProveedor: GastoMontoRow[],
  pagosEmpleado: PagoEmpleadoRow[]
) {
  const desdeCajaMovimientos = movimientos
    .filter(
      (item) =>
        item.tipo === "egreso" &&
        item.origen_fondo === "prestamo" &&
        item.naturaleza !== "pago_prestamo"
    )
    .reduce((acc, item) => acc + toNumber(item.monto), 0);

  const desdeGastos = gastos
    .filter((item) => item.origen_fondo === "prestamo")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);

  const desdeProveedores = pagosProveedor
    .filter((item) => item.origen_fondo === "prestamo")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);

  const desdeEmpleados = pagosEmpleado
    .filter((item) => item.origen_fondo === "prestamo")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);

  return desdeCajaMovimientos + desdeGastos + desdeProveedores + desdeEmpleados;
}

function calcularPagoPrestamo(
  movimientos: CajaMovimientoRow[],
  gastos: GastoMontoRow[],
  pagosProveedor: GastoMontoRow[],
  pagosEmpleado: PagoEmpleadoRow[]
) {
  const desdeCajaMovimientos = movimientos
    .filter((item) => item.naturaleza === "pago_prestamo")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);

  const desdeGastos = gastos
    .filter((item) => item.naturaleza === "pago_prestamo")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);

  const desdeProveedores = pagosProveedor
    .filter((item) => item.naturaleza === "pago_prestamo")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);

  const desdeEmpleados = pagosEmpleado
    .filter((item) => item.naturaleza === "pago_prestamo")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);

  return desdeCajaMovimientos + desdeGastos + desdeProveedores + desdeEmpleados;
}

export async function getDashboardTecnicoMetricas(
  tecnicoId: string
): Promise<DashboardTecnicoMetricas> {
  const supabase = await createClient();

  const hoy = new Date();

  const inicioDia = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate(),
    0,
    0,
    0
  ).toISOString();

  const finDia = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate(),
    23,
    59,
    59
  ).toISOString();

  const { data: asignacionesData, error: asignacionesError } = await supabase
    .from("ordenes_tecnicos")
    .select("orden_id")
    .eq("tecnico_id", tecnicoId);

  if (asignacionesError) {
    console.error(
      "Error obteniendo asignaciones del dashboard técnico:",
      asignacionesError.message
    );
    throw new Error("No se pudieron obtener las métricas del técnico");
  }

  const ordenIds = Array.from(
    new Set(
      ((asignacionesData ?? []) as OrdenTecnicoAsignacionRow[]).map(
        (item) => item.orden_id
      )
    )
  );

  if (ordenIds.length === 0) {
    return {
      ordenesPendientes: 0,
      ordenesEnProceso: 0,
      ordenesTerminadasHoy: 0,
    };
  }

  const { data: ordenesData, error: ordenesError } = await supabase
    .from("ordenes_trabajo")
    .select("id, estado, hora_fin")
    .in("id", ordenIds);

  if (ordenesError) {
    console.error(
      "Error obteniendo órdenes del dashboard técnico:",
      ordenesError.message
    );
    throw new Error("No se pudieron obtener las métricas del técnico");
  }

  const ordenes = (ordenesData ?? []) as OrdenDashboardRow[];

  const ordenesPendientes = ordenes.filter(
    (orden) => orden.estado === "pendiente"
  ).length;

  const ordenesEnProceso = ordenes.filter(
    (orden) => orden.estado === "en_proceso"
  ).length;

  const ordenesTerminadasHoy = ordenes.filter((orden) => {
    if (orden.estado !== "completada" || !orden.hora_fin) {
      return false;
    }

    return orden.hora_fin >= inicioDia && orden.hora_fin <= finDia;
  }).length;

  return {
    ordenesPendientes,
    ordenesEnProceso,
    ordenesTerminadasHoy,
  };
}

export async function getDashboardResumenDinero(
  periodo: DashboardPeriodo = "7d"
): Promise<DashboardResumenDinero> {
  const supabase = await createClient();

  const rangePeriodo = getDashboardRange(periodo);
  const rangeMes = getDashboardRange("30d");

  const [
    cajaMovimientosPeriodoResponse,
    cajaMovimientosMesResponse,
    ventasPeriodoResponse,
    ventasMesResponse,
    movimientosPeriodoResponse,
    movimientosMesResponse,
    gastosPeriodoResponse,
    gastosMesResponse,
    pagosProveedorPeriodoResponse,
    pagosProveedorMesResponse,
    pagosEmpleadosPeriodoResponse,
    pagosEmpleadosMesResponse,
  ] = await Promise.all([
    supabase
      .from("caja_movimientos")
      .select("tipo, monto, cuenta, origen_fondo, naturaleza, created_at")
      .gte("created_at", rangePeriodo.start)
      .lte("created_at", rangePeriodo.end),

    supabase
      .from("caja_movimientos")
      .select("tipo, monto, cuenta, origen_fondo, naturaleza, created_at")
      .gte("created_at", rangeMes.start)
      .lte("created_at", rangeMes.end),

    supabase
      .from("ordenes_trabajo")
      .select("total")
      .in("estado", ["completada", "entregada"])
      .gte("created_at", rangePeriodo.start)
      .lte("created_at", rangePeriodo.end),

    supabase
      .from("ordenes_trabajo")
      .select("total")
      .in("estado", ["completada", "entregada"])
      .gte("created_at", rangeMes.start)
      .lte("created_at", rangeMes.end),

    supabase
      .from("producto_movimientos")
      .select("cantidad, costo_unitario, total")
      .eq("tipo", "salida")
      .gte("created_at", rangePeriodo.start)
      .lte("created_at", rangePeriodo.end),

    supabase
      .from("producto_movimientos")
      .select("cantidad, costo_unitario, total")
      .eq("tipo", "salida")
      .gte("created_at", rangeMes.start)
      .lte("created_at", rangeMes.end),

    supabase
      .from("gastos")
      .select("monto, fecha, tipo_gasto, naturaleza, cuenta, origen_fondo")
      .gte("fecha", rangePeriodo.startDate)
      .lte("fecha", rangePeriodo.endDate),

    supabase
      .from("gastos")
      .select("monto, fecha, tipo_gasto, naturaleza, cuenta, origen_fondo")
      .gte("fecha", rangeMes.startDate)
      .lte("fecha", rangeMes.endDate),

    supabase
      .from("pagos_proveedor")
      .select("monto, fecha, naturaleza, cuenta, origen_fondo")
      .gte("fecha", rangePeriodo.startDate)
      .lte("fecha", rangePeriodo.endDate),

    supabase
      .from("pagos_proveedor")
      .select("monto, fecha, naturaleza, cuenta, origen_fondo")
      .gte("fecha", rangeMes.startDate)
      .lte("fecha", rangeMes.endDate),

    supabase
      .from("empleados_pagos")
      .select("monto, fecha_pago, naturaleza, cuenta, origen_fondo")
      .gte("fecha_pago", rangePeriodo.startDate)
      .lte("fecha_pago", rangePeriodo.endDate),

    supabase
      .from("empleados_pagos")
      .select("monto, fecha_pago, naturaleza, cuenta, origen_fondo")
      .gte("fecha_pago", rangeMes.startDate)
      .lte("fecha_pago", rangeMes.endDate),
  ]);

  if (cajaMovimientosPeriodoResponse.error) {
    console.error(
      "Error caja movimientos período:",
      cajaMovimientosPeriodoResponse.error
    );
    throw new Error("No se pudieron obtener los movimientos de caja del período");
  }

  if (cajaMovimientosMesResponse.error) {
    console.error("Error caja movimientos mes:", cajaMovimientosMesResponse.error);
    throw new Error("No se pudieron obtener los movimientos de caja del mes");
  }

  if (ventasPeriodoResponse.error) {
    console.error("Error ventas período:", ventasPeriodoResponse.error);
    throw new Error("No se pudieron obtener las ventas del período");
  }

  if (ventasMesResponse.error) {
    console.error("Error ventas mes:", ventasMesResponse.error);
    throw new Error("No se pudieron obtener las ventas del mes");
  }

  if (movimientosPeriodoResponse.error) {
    console.error("Error costos período:", movimientosPeriodoResponse.error);
    throw new Error("No se pudieron obtener los costos del período");
  }

  if (movimientosMesResponse.error) {
    console.error("Error costos mes:", movimientosMesResponse.error);
    throw new Error("No se pudieron obtener los costos del mes");
  }

  if (gastosPeriodoResponse.error) {
    console.error("Error gastos período:", gastosPeriodoResponse.error);
    throw new Error("No se pudieron obtener los gastos del período");
  }

  if (gastosMesResponse.error) {
    console.error("Error gastos mes:", gastosMesResponse.error);
    throw new Error("No se pudieron obtener los gastos del mes");
  }

  if (pagosProveedorPeriodoResponse.error) {
    console.error(
      "Error pagos proveedor período:",
      pagosProveedorPeriodoResponse.error
    );
    throw new Error("No se pudieron obtener los pagos a proveedor del período");
  }

  if (pagosProveedorMesResponse.error) {
    console.error("Error pagos proveedor mes:", pagosProveedorMesResponse.error);
    throw new Error("No se pudieron obtener los pagos a proveedor del mes");
  }

  if (pagosEmpleadosPeriodoResponse.error) {
    console.error(
      "Error pagos empleados período:",
      pagosEmpleadosPeriodoResponse.error
    );
    throw new Error("No se pudieron obtener los pagos a empleados del período");
  }

  if (pagosEmpleadosMesResponse.error) {
    console.error("Error pagos empleados mes:", pagosEmpleadosMesResponse.error);
    throw new Error("No se pudieron obtener los pagos a empleados del mes");
  }

  const cajaMovimientosPeriodo = (cajaMovimientosPeriodoResponse.data ??
    []) as CajaMovimientoRow[];

  const ventasPeriodoRows = (ventasPeriodoResponse.data ?? []) as VentaTotalRow[];
  const ventasMesRows = (ventasMesResponse.data ?? []) as VentaTotalRow[];

  const costosPeriodoRows = (movimientosPeriodoResponse.data ??
    []) as MovimientoCostoRow[];
  const costosMesRows = (movimientosMesResponse.data ??
    []) as MovimientoCostoRow[];

  const gastosPeriodoRows = (gastosPeriodoResponse.data ?? []) as GastoMontoRow[];
  const gastosMesRows = (gastosMesResponse.data ?? []) as GastoMontoRow[];

  const pagosProveedorPeriodoRows = (pagosProveedorPeriodoResponse.data ??
    []) as GastoMontoRow[];
  const pagosProveedorMesRows = (pagosProveedorMesResponse.data ??
    []) as GastoMontoRow[];

  const pagosEmpleadosPeriodoRows = (pagosEmpleadosPeriodoResponse.data ??
    []) as PagoEmpleadoRow[];
  const pagosEmpleadosMesRows = (pagosEmpleadosMesResponse.data ??
    []) as PagoEmpleadoRow[];

  const { data: cajaAbierta } = await supabase
    .from("cajas")
    .select("id, monto_apertura")
    .eq("estado", "abierta")
    .maybeSingle();

  let saldoCaja = 0;

  if (cajaAbierta) {
    const { data: movimientosCajaActual } = await supabase
      .from("caja_movimientos")
      .select("tipo, monto, cuenta")
      .eq("caja_id", cajaAbierta.id);

    const movimientos = (movimientosCajaActual ?? []) as CajaMovimientoRow[];

    saldoCaja = calcularSaldoPorCuenta(
      movimientos,
      "caja",
      toNumber(cajaAbierta.monto_apertura)
    );
  }
  const saldoBanco = calcularSaldoPorCuenta(cajaMovimientosPeriodo, "banco");
  const saldoDeuna = calcularSaldoPorCuenta(cajaMovimientosPeriodo, "deuna");

  let saldoBoveda = 0;

  if (cajaAbierta) {
    const { data: movimientosCajaActual } = await supabase
      .from("caja_movimientos")
      .select("tipo, monto, cuenta")
      .eq("caja_id", cajaAbierta.id);

    const movimientos = (movimientosCajaActual ?? []) as CajaMovimientoRow[];

    saldoBoveda = calcularSaldoPorCuenta(movimientos, "boveda");
  }
  const saldoTarjetaPorCobrar = calcularSaldoPorCuenta(
    cajaMovimientosPeriodo,
    "tarjeta_por_cobrar"
  );

  const dineroPrestamoIngresado = calcularPrestamoIngresado(cajaMovimientosPeriodo);
  const dineroPrestamoUsado = calcularPrestamoUsado(
    cajaMovimientosPeriodo,
    gastosPeriodoRows,
    pagosProveedorPeriodoRows,
    pagosEmpleadosPeriodoRows
  );
  const pagoPrestamo = calcularPagoPrestamo(
    cajaMovimientosPeriodo,
    gastosPeriodoRows,
    pagosProveedorPeriodoRows,
    pagosEmpleadosPeriodoRows
  );

  const ventasPeriodo = sumBy(ventasPeriodoRows, (item) => toNumber(item.total));
  const ventasMes = sumBy(ventasMesRows, (item) => toNumber(item.total));

  const costosPeriodo = sumBy(costosPeriodoRows, (item) => {
    const total = toNumber(item.total);
    if (total > 0) return total;
    return toNumber(item.cantidad) * toNumber(item.costo_unitario);
  });

  const costosMes = sumBy(costosMesRows, (item) => {
    const total = toNumber(item.total);
    if (total > 0) return total;
    return toNumber(item.cantidad) * toNumber(item.costo_unitario);
  });

  const gastosOperativosPeriodo = sumBy(
    gastosPeriodoRows.filter((item) => isNaturalezaOperativa(item.naturaleza)),
    (item) => toNumber(item.monto)
  );

  const gastosOperativosMes = sumBy(
    gastosMesRows.filter((item) => isNaturalezaOperativa(item.naturaleza)),
    (item) => toNumber(item.monto)
  );

  const pagosProveedorOperativosPeriodo = sumBy(
    pagosProveedorPeriodoRows.filter((item) => isNaturalezaOperativa(item.naturaleza)),
    (item) => toNumber(item.monto)
  );

  const pagosProveedorOperativosMes = sumBy(
    pagosProveedorMesRows.filter((item) => isNaturalezaOperativa(item.naturaleza)),
    (item) => toNumber(item.monto)
  );

  const pagosEmpleadosOperativosPeriodo = sumBy(
    pagosEmpleadosPeriodoRows.filter((item) => isNaturalezaOperativa(item.naturaleza)),
    (item) => toNumber(item.monto)
  );

  const pagosEmpleadosOperativosMes = sumBy(
    pagosEmpleadosMesRows.filter((item) => isNaturalezaOperativa(item.naturaleza)),
    (item) => toNumber(item.monto)
  );

  const utilidadRealPeriodo =
    ventasPeriodo -
    costosPeriodo -
    gastosOperativosPeriodo -
    pagosProveedorOperativosPeriodo -
    pagosEmpleadosOperativosPeriodo;

  const utilidadRealMes =
    ventasMes -
    costosMes -
    gastosOperativosMes -
    pagosProveedorOperativosMes -
    pagosEmpleadosOperativosMes;

  return {
    saldoCaja,
    saldoBanco,
    saldoDeuna,
    saldoBoveda,
    saldoTarjetaPorCobrar,
    saldoTotalLiquido: saldoCaja + saldoBanco + saldoDeuna + saldoBoveda,
    dineroPrestamoDisponible:
      dineroPrestamoIngresado - dineroPrestamoUsado - pagoPrestamo,
    dineroPrestamoIngresado,
    dineroPrestamoUsado,
    pagoPrestamo,
    utilidadRealPeriodo,
    utilidadRealMes,
  };
}

export async function getDashboardMetricas(
  periodo: DashboardPeriodo = "7d"
): Promise<DashboardMetricas> {
  const supabase = await createClient();

  const rangePeriodo = getDashboardRange(periodo);
  const rangeMes = getDashboardRange("30d");

  const startPeriodo = rangePeriodo.startDate;
  const endPeriodo = rangePeriodo.endDate;

  const startMes = rangeMes.startDate;
  const endMes = rangeMes.endDate;

  const [
    ordenesAbiertasResponse,
    ventasPeriodoResponse,
    ventasMesResponse,
    movimientosPeriodoResponse,
    movimientosMesResponse,
    gastosPeriodoResponse,
    gastosMesResponse,
    pagosPeriodoResponse,
    pagosMesResponse,
    pagosProveedorPeriodoResponse,
    pagosProveedorMesResponse,
  ] = await Promise.all([
    supabase
      .from("ordenes_trabajo")
      .select("id", { count: "exact", head: true })
      .in("estado", ["pendiente", "en_proceso"]),

    supabase
      .from("ordenes_trabajo")
      .select("total")
      .in("estado", ["completada", "entregada"])
      .gte("created_at", rangePeriodo.start)
      .lte("created_at", rangePeriodo.end),

    supabase
      .from("ordenes_trabajo")
      .select("total")
      .in("estado", ["completada", "entregada"])
      .gte("created_at", rangeMes.start)
      .lte("created_at", rangeMes.end),

    supabase
      .from("producto_movimientos")
      .select("cantidad, costo_unitario, total")
      .eq("tipo", "salida")
      .gte("created_at", rangePeriodo.start)
      .lte("created_at", rangePeriodo.end),

    supabase
      .from("producto_movimientos")
      .select("cantidad, costo_unitario, total")
      .eq("tipo", "salida")
      .gte("created_at", rangeMes.start)
      .lte("created_at", rangeMes.end),

    supabase
      .from("gastos")
      .select("monto, fecha, tipo_gasto, naturaleza")
      .gte("fecha", startPeriodo)
      .lte("fecha", endPeriodo),

    supabase
      .from("gastos")
      .select("monto, fecha, tipo_gasto, naturaleza")
      .gte("fecha", startMes)
      .lte("fecha", endMes),

    supabase
      .from("empleados_pagos")
      .select("monto, fecha_pago, naturaleza")
      .gte("fecha_pago", startPeriodo)
      .lte("fecha_pago", endPeriodo),

    supabase
      .from("empleados_pagos")
      .select("monto, fecha_pago, naturaleza")
      .gte("fecha_pago", startMes)
      .lte("fecha_pago", endMes),

    supabase
      .from("pagos_proveedor")
      .select("monto, fecha, naturaleza")
      .gte("fecha", startPeriodo)
      .lte("fecha", endPeriodo),

    supabase
      .from("pagos_proveedor")
      .select("monto, fecha, naturaleza")
      .gte("fecha", startMes)
      .lte("fecha", endMes),
  ]);

  if (ordenesAbiertasResponse.error) {
    console.error("Error ordenes abiertas:", ordenesAbiertasResponse.error);
    throw new Error("No se pudieron obtener las órdenes abiertas");
  }

  if (ventasPeriodoResponse.error) {
    console.error("Error ventas período:", ventasPeriodoResponse.error);
    throw new Error("No se pudieron obtener las ventas del período");
  }

  if (ventasMesResponse.error) {
    console.error("Error ventas mes:", ventasMesResponse.error);
    throw new Error("No se pudieron obtener las ventas del mes");
  }

  if (movimientosPeriodoResponse.error) {
    console.error("Error movimientos período:", movimientosPeriodoResponse.error);
    throw new Error("No se pudieron obtener los movimientos del período");
  }

  if (movimientosMesResponse.error) {
    console.error("Error movimientos mes:", movimientosMesResponse.error);
    throw new Error("No se pudieron obtener los movimientos del mes");
  }

  if (gastosPeriodoResponse.error) {
    console.error("Error gastos período:", gastosPeriodoResponse.error);
    throw new Error("No se pudieron obtener los gastos del período");
  }

  if (gastosMesResponse.error) {
    console.error("Error gastos mes:", gastosMesResponse.error);
    throw new Error("No se pudieron obtener los gastos del mes");
  }

  if (pagosPeriodoResponse.error) {
    logSupabaseError("Error pagos empleados período:", pagosPeriodoResponse.error);
    throw new Error("No se pudieron obtener los pagos del período");
  }

  if (pagosMesResponse.error) {
    logSupabaseError("Error pagos empleados mes:", pagosMesResponse.error);
    throw new Error("No se pudieron obtener los pagos del mes");
  }

  if (pagosProveedorPeriodoResponse.error) {
    console.error(
      "Error pagos proveedor período:",
      pagosProveedorPeriodoResponse.error
    );
    throw new Error("No se pudieron obtener los pagos a proveedor del período");
  }

  if (pagosProveedorMesResponse.error) {
    console.error("Error pagos proveedor mes:", pagosProveedorMesResponse.error);
    throw new Error("No se pudieron obtener los pagos a proveedor del mes");
  }

  const ordenesAbiertas = ordenesAbiertasResponse.count ?? 0;

  const ventasPeriodoRows = (ventasPeriodoResponse.data ?? []) as VentaTotalRow[];
  const ventasMesRows = (ventasMesResponse.data ?? []) as VentaTotalRow[];

  const movimientosPeriodo = (movimientosPeriodoResponse.data ??
    []) as MovimientoCostoRow[];
  const movimientosMes = (movimientosMesResponse.data ??
    []) as MovimientoCostoRow[];

  const gastosPeriodo = (gastosPeriodoResponse.data ?? []) as GastoMontoRow[];
  const gastosMes = (gastosMesResponse.data ?? []) as GastoMontoRow[];

  const pagosPeriodo = (pagosPeriodoResponse.data ?? []) as PagoEmpleadoRow[];
  const pagosMes = (pagosMesResponse.data ?? []) as PagoEmpleadoRow[];

  const pagosProveedorPeriodo = (pagosProveedorPeriodoResponse.data ??
    []) as GastoMontoRow[];
  const pagosProveedorMes = (pagosProveedorMesResponse.data ??
    []) as GastoMontoRow[];

  const ventasPeriodo = sumBy(ventasPeriodoRows, (item) => toNumber(item.total));
  const ventasMes = sumBy(ventasMesRows, (item) => toNumber(item.total));

  const costosPeriodo = sumBy(movimientosPeriodo, (item) => {
    const total = toNumber(item.total);
    if (total > 0) return total;
    return toNumber(item.cantidad) * toNumber(item.costo_unitario);
  });

  const costosMes = sumBy(movimientosMes, (item) => {
    const total = toNumber(item.total);
    if (total > 0) return total;
    return toNumber(item.cantidad) * toNumber(item.costo_unitario);
  });

  const gastosTotalPeriodo = sumBy(
    gastosPeriodo.filter((item) => isNaturalezaOperativa(item.naturaleza)),
    (item) => toNumber(item.monto)
  );

  const gastosTotalMes = sumBy(
    gastosMes.filter((item) => isNaturalezaOperativa(item.naturaleza)),
    (item) => toNumber(item.monto)
  );

  const pagosTotalPeriodo = sumBy(
    pagosPeriodo.filter((item) => isNaturalezaOperativa(item.naturaleza)),
    (item) => toNumber(item.monto)
  );

  const pagosTotalMes = sumBy(
    pagosMes.filter((item) => isNaturalezaOperativa(item.naturaleza)),
    (item) => toNumber(item.monto)
  );

  const pagosProveedorTotalPeriodo = sumBy(
    pagosProveedorPeriodo.filter((item) => isNaturalezaOperativa(item.naturaleza)),
    (item) => toNumber(item.monto)
  );

  const pagosProveedorTotalMes = sumBy(
    pagosProveedorMes.filter((item) => isNaturalezaOperativa(item.naturaleza)),
    (item) => toNumber(item.monto)
  );

  const gastosFijosMes = sumBy(
    gastosMes.filter(
      (item) => item.tipo_gasto === "fijo" && isNaturalezaOperativa(item.naturaleza)
    ),
    (item) => toNumber(item.monto)
  );

  const utilidadPeriodo =
    ventasPeriodo -
    costosPeriodo -
    gastosTotalPeriodo -
    pagosTotalPeriodo -
    pagosProveedorTotalPeriodo;

  const utilidadMes =
    ventasMes - costosMes - gastosTotalMes - pagosTotalMes - pagosProveedorTotalMes;

  const margenPeriodo = calcMargen(ventasPeriodo, utilidadPeriodo);
  const margenMes = calcMargen(ventasMes, utilidadMes);

  const ordenesCerradasPeriodo = ventasPeriodoRows.length;
  const ticketPromedio =
    ordenesCerradasPeriodo > 0 ? ventasPeriodo / ordenesCerradasPeriodo : 0;

  return {
    ordenes_abiertas: ordenesAbiertas,

    ventas_hoy: ventasPeriodo,
    costos_hoy: costosPeriodo,
    gastos_hoy:
      gastosTotalPeriodo + pagosTotalPeriodo + pagosProveedorTotalPeriodo,
    utilidad_hoy: utilidadPeriodo,
    margen_hoy: margenPeriodo,

    ventas_mes: ventasMes,
    costos_mes: costosMes,
    gastos_mes: gastosTotalMes + pagosTotalMes + pagosProveedorTotalMes,
    utilidad_mes: utilidadMes,
    margen_mes: margenMes,

    ticket_promedio: ticketPromedio,
    ordenes_cerradas_periodo: ordenesCerradasPeriodo,
    punto_equilibrio: gastosFijosMes,
  };
}

export async function getServiciosTop(): Promise<DashboardServicioTop[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orden_items")
    .select("nombre_item, total")
    .eq("tipo_item", "servicio");

  if (error) {
    console.error("Error en getServiciosTop:", error.message);
    throw new Error("No se pudieron cargar los servicios más vendidos");
  }

  const rows = (data ?? []) as ServicioRentabilidadRow[];

  const grouped = new Map<
    string,
    {
      nombre_item: string;
      total_servicios: number;
      total_ingresos: number;
    }
  >();

  for (const item of rows) {
    const nombre = item.nombre_item ?? "Servicio";
    const total = Number(item.total ?? 0);
    const existente = grouped.get(nombre);

    if (existente) {
      existente.total_servicios += 1;
      existente.total_ingresos += total;
    } else {
      grouped.set(nombre, {
        nombre_item: nombre,
        total_servicios: 1,
        total_ingresos: total,
      });
    }
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.total_ingresos - a.total_ingresos)
    .slice(0, 5);
}

export async function getProximosMantenimientos(): Promise<
  DashboardMantenimientoProximo[]
> {
  const today = new Date().toISOString().split("T")[0];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .select(`
      id,
      numero,
      proximo_mantenimiento_fecha,
      proximo_mantenimiento_km,
      clientes (
        id,
        nombres,
        apellidos,
        telefono
      ),
      vehiculos (
        id,
        placa,
        marca,
        modelo
      )
    `)
    .not("proximo_mantenimiento_fecha", "is", null)
    .gte("proximo_mantenimiento_fecha", today)
    .order("proximo_mantenimiento_fecha", { ascending: true })
    .limit(5);

  if (error) {
    throw new Error("No se pudieron cargar los próximos mantenimientos");
  }

  const rows = (data ?? []) as MantenimientoRow[];

  return rows.map((row) => ({
    ...row,
    clientes: normalizeRelation(row.clientes),
    vehiculos: normalizeRelation(row.vehiculos),
  }));
}

export async function getClientesRecientes(): Promise<DashboardClienteReciente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombres, apellidos, telefono, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error en getClientesRecientes:", error.message);
    throw new Error("No se pudieron cargar los clientes recientes");
  }

  return (data ?? []) as DashboardClienteReciente[];
}

export async function marcarMantenimientoRealizado(ordenId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("ordenes_trabajo")
    .update({
      proximo_mantenimiento_fecha: null,
      proximo_mantenimiento_km: null,
    })
    .eq("id", ordenId);

  if (error) {
    console.error("Error al marcar mantenimiento:", error.message);
    throw new Error("No se pudo actualizar el mantenimiento");
  }

  return { success: true };
}

export async function getProductosRentables(): Promise<DashboardProductoRentable[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("producto_movimientos")
    .select(`
      producto_id,
      cantidad,
      costo_unitario,
      precio_unitario,
      productos (
        id,
        nombre
      )
    `)
    .eq("tipo", "salida")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al cargar productos rentables:", error.message);
    throw new Error("No se pudieron cargar los productos rentables");
  }

  const rows = (data ?? []) as ProductoRentableMovimientoRow[];

  const grouped = new Map<string, DashboardProductoRentable>();

  for (const item of rows) {
    const producto = normalizeRelation(item.productos);
    const productoId = item.producto_id;
    const nombre = producto?.nombre ?? "Producto";

    const cantidad = Number(item.cantidad ?? 0);
    const precioVenta = Number(item.precio_unitario ?? 0);
    const costoUnitario = Number(item.costo_unitario ?? 0);

    const ingresos = cantidad * precioVenta;
    const costos = cantidad * costoUnitario;
    const ganancia = ingresos - costos;
    const existente = grouped.get(productoId);

    if (existente) {
      existente.cantidad_vendida += cantidad;
      existente.total_ingresos += ingresos;
      existente.total_costos += costos;
      existente.total_ganancia += ganancia;
      existente.margen_promedio =
        existente.total_ingresos > 0
          ? (existente.total_ganancia / existente.total_ingresos) * 100
          : 0;
    } else {
      grouped.set(productoId, {
        producto_id: productoId,
        nombre,
        cantidad_vendida: cantidad,
        total_ingresos: ingresos,
        total_costos: costos,
        total_ganancia: ganancia,
        margen_promedio: ingresos > 0 ? (ganancia / ingresos) * 100 : 0,
      });
    }
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.total_ganancia - a.total_ganancia)
    .slice(0, 5);
}

export async function getDashboardAlertas(
  periodo: DashboardPeriodo = "7d"
): Promise<DashboardAlerta[]> {
  const [metricas, productosRentables, alertasStock] = await Promise.all([
    getDashboardMetricas(periodo),
    getProductosRentables(),
    getAlertasStock(),
  ]);

  const alertas: DashboardAlerta[] = [];

  if (Number(metricas.utilidad_hoy) < 0) {
    alertas.push({
      tipo: "error",
      titulo: "Utilidad negativa en el período",
      descripcion:
        "En el período seleccionado los costos y gastos superan las ventas. Revisa precios, gastos o productos vendidos.",
    });
  }

  if (Number(metricas.gastos_hoy) > Number(metricas.ventas_hoy)) {
    alertas.push({
      tipo: "error",
      titulo: "Gastos del período por encima de ventas",
      descripcion:
        "Los gastos registrados en el período seleccionado son mayores que las ventas.",
    });
  }

  if (
    Number(metricas.costos_hoy) > Number(metricas.ventas_hoy) &&
    Number(metricas.ventas_hoy) > 0
  ) {
    alertas.push({
      tipo: "warning",
      titulo: "Costos del período muy altos",
      descripcion:
        "El costo de los productos vendidos en el período supera las ventas registradas.",
    });
  }

  const productosPerdida = productosRentables.filter(
    (producto) => Number(producto.total_ganancia) < 0
  );

  if (productosPerdida.length > 0) {
    alertas.push({
      tipo: "error",
      titulo: "Productos con pérdida",
      descripcion: `Tienes ${productosPerdida.length} producto(s) con ganancia negativa. Revisa sus precios de venta.`,
    });
  }

  const productosMargenBajo = productosRentables.filter(
    (producto) =>
      Number(producto.margen_promedio) >= 0 &&
      Number(producto.margen_promedio) < 20
  );

  if (productosMargenBajo.length > 0) {
    alertas.push({
      tipo: "warning",
      titulo: "Productos con margen bajo",
      descripcion: `Tienes ${productosMargenBajo.length} producto(s) con margen menor al 20%.`,
    });
  }

  if (alertas.length === 0) {
    alertas.push({
      tipo: "info",
      titulo: "Negocio estable",
      descripcion:
        "No se detectaron alertas importantes con la información actual.",
    });
  }

  return [...alertas, ...alertasStock];
}

export async function getDashboardAccionesSugeridas(
  periodo: DashboardPeriodo = "7d"
): Promise<DashboardAccionSugerida[]> {
  const [metricas, productosRentables] = await Promise.all([
    getDashboardMetricas(periodo),
    getProductosRentables(),
  ]);

  const acciones: DashboardAccionSugerida[] = [];

  if (Number(metricas.utilidad_hoy) < 0) {
    acciones.push({
      tipo: "error",
      titulo: "Revisar utilidad negativa del período",
      descripcion:
        "Reduce gastos del período o revisa precios de productos y servicios porque el negocio perdió dinero en el rango seleccionado.",
    });
  }

  if (
    Number(metricas.ventas_hoy) > 0 &&
    Number(metricas.gastos_hoy) / Number(metricas.ventas_hoy) > 0.5
  ) {
    acciones.push({
      tipo: "warning",
      titulo: "Controlar gastos del período",
      descripcion:
        "Tus gastos del período superan el 50% de las ventas. Revisa pagos operativos, compras y egresos no urgentes.",
    });
  }

  const productosConPerdida = productosRentables.filter(
    (producto) => Number(producto.total_ganancia) < 0
  );

  for (const producto of productosConPerdida.slice(0, 2)) {
    acciones.push({
      tipo: "error",
      titulo: `Subir precio o revisar costo de ${producto.nombre}`,
      descripcion:
        "Este producto tiene ganancia negativa. Revisa el precio de venta o el costo de compra antes de seguir vendiéndolo igual.",
    });
  }

  const productosMargenBajo = productosRentables.filter(
    (producto) =>
      Number(producto.margen_promedio) >= 0 &&
      Number(producto.margen_promedio) < 20
  );

  for (const producto of productosMargenBajo.slice(0, 2)) {
    acciones.push({
      tipo: "warning",
      titulo: `Mejorar margen de ${producto.nombre}`,
      descripcion:
        "Este producto deja poco margen. Considera subir su precio o negociar un mejor costo de compra.",
    });
  }

  const productosMuyRentables = productosRentables.filter(
    (producto) => Number(producto.margen_promedio) >= 40
  );

  for (const producto of productosMuyRentables.slice(0, 2)) {
    acciones.push({
      tipo: "success",
      titulo: `Impulsar venta de ${producto.nombre}`,
      descripcion:
        "Este producto tiene buen margen. Conviene ofrecerlo más o incluirlo en promociones y recomendaciones al cliente.",
    });
  }

  if (acciones.length === 0) {
    acciones.push({
      tipo: "info",
      titulo: "Mantener estrategia actual",
      descripcion:
        "No se detectaron acciones urgentes. Sigue registrando ventas, costos y gastos para mejorar las recomendaciones.",
    });
  }

  return acciones.slice(0, 6);
}

export async function getDashboardSerieFinanciera(
  periodo: DashboardPeriodo = "7d"
): Promise<DashboardSerieFinanciera[]> {
  const supabase = await createClient();
  const range = getDashboardRange(periodo);

  const fechas: string[] = [];
  const fechaActual = new Date(`${range.startDate}T00:00:00`);
  const fechaFin = new Date(`${range.endDate}T00:00:00`);

  while (fechaActual <= fechaFin) {
    fechas.push(fechaActual.toISOString().split("T")[0]);
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  const [ventasResponse, costosResponse, gastosResponse] = await Promise.all([
    supabase
      .from("ordenes_trabajo")
      .select("fecha, total")
      .neq("estado", "cancelada")
      .gte("fecha", range.startDate)
      .lte("fecha", range.endDate),

    supabase
      .from("producto_movimientos")
      .select("created_at, cantidad, costo_unitario")
      .eq("tipo", "salida")
      .gte("created_at", range.start)
      .lte("created_at", range.end),

    supabase
      .from("gastos")
      .select("fecha, monto, naturaleza")
      .gte("fecha", range.startDate)
      .lte("fecha", range.endDate),
  ]);

  if (ventasResponse.error) {
    console.error(
      "Error cargando serie de ventas:",
      ventasResponse.error.message
    );
    throw new Error("No se pudo cargar la serie de ventas");
  }

  if (costosResponse.error) {
    console.error(
      "Error cargando serie de costos:",
      costosResponse.error.message
    );
    throw new Error("No se pudo cargar la serie de costos");
  }

  if (gastosResponse.error) {
    console.error(
      "Error cargando serie de gastos:",
      gastosResponse.error.message
    );
    throw new Error("No se pudo cargar la serie de gastos");
  }

  const base = new Map<string, DashboardSerieFinanciera>();

  for (const fecha of fechas) {
    base.set(fecha, {
      fecha,
      ventas: 0,
      costos: 0,
      gastos: 0,
      utilidad: 0,
    });
  }

  for (const item of ventasResponse.data ?? []) {
    const fecha = String(item.fecha).split("T")[0];
    const actual = base.get(fecha);

    if (actual) {
      actual.ventas += Number(item.total ?? 0);
    }
  }

  for (const item of costosResponse.data ?? []) {
    const fecha = String(item.created_at).split("T")[0];
    const actual = base.get(fecha);

    if (actual) {
      actual.costos +=
        Number(item.cantidad ?? 0) * Number(item.costo_unitario ?? 0);
    }
  }

  for (const item of (gastosResponse.data ?? []) as GastoMontoRow[]) {
    if (!isNaturalezaOperativa(item.naturaleza)) continue;

    const fecha = String(item.fecha).split("T")[0];
    const actual = base.get(fecha);

    if (actual) {
      actual.gastos += Number(item.monto ?? 0);
    }
  }

  for (const item of base.values()) {
    item.utilidad = item.ventas - item.costos - item.gastos;
  }

  return Array.from(base.values());
}

export async function getClientesInactivos(
  dias = 30
): Promise<DashboardClienteInactivo[]> {
  const supabase = await createClient();

  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);

  const { data, error } = await supabase.from("clientes").select(`
      id,
      nombres,
      apellidos,
      telefono,
      ordenes_trabajo (
        created_at
      )
    `);

  if (error) {
    console.error("Error clientes inactivos:", error);
    return [];
  }

  const resultado: DashboardClienteInactivo[] = (
    (data ?? []) as ClienteInactivoRow[]
  )
    .filter((cliente) => {
      if (!cliente.ordenes_trabajo || cliente.ordenes_trabajo.length === 0) {
        return true;
      }

      const ultimaOrden = cliente.ordenes_trabajo
        .map((o) => new Date(o.created_at))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      return ultimaOrden < fechaLimite;
    })
    .map((cliente) => ({
      id: cliente.id,
      nombres: cliente.nombres,
      apellidos: cliente.apellidos,
      telefono: cliente.telefono,
    }));

  return resultado.slice(0, 10);
}

export async function getClientesCampaniaReactivacion(
  dias = 30
): Promise<ClienteCampaniaReactivacion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("clientes").select(`
      id,
      nombres,
      apellidos,
      telefono,
      whatsapp,
      acepta_promociones,
      ordenes_trabajo (
        created_at
      )
    `);

  if (error) {
    console.error("Error campaña reactivación:", error);
    return [];
  }

  const clientes = (data ?? []) as ClienteInactivoParaCampania[];

  const resultado: ClienteCampaniaReactivacion[] = clientes
    .map((cliente) => {
      const ordenes = cliente.ordenes_trabajo ?? [];

      if (ordenes.length === 0) {
        return {
          id: cliente.id,
          nombres: cliente.nombres,
          apellidos: cliente.apellidos,
          telefono: cliente.telefono,
          whatsapp: cliente.whatsapp,
          diasInactivo: dias + 1,
          mensajeWhatsapp: `Hola ${cliente.nombres}, te saludamos de AYR Motors. Queremos invitarte a regresar al taller con una atención especial en tu próximo servicio. Escríbenos para agendar tu cita.`,
          puedeEnviarWhatsapp: Boolean(
            cliente.whatsapp && cliente.acepta_promociones
          ),
        };
      }

      const ultimaOrden = ordenes
        .map((o) => new Date(o.created_at))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      const diffMs = Date.now() - ultimaOrden.getTime();
      const diasInactivo = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      return {
        id: cliente.id,
        nombres: cliente.nombres,
        apellidos: cliente.apellidos,
        telefono: cliente.telefono,
        whatsapp: cliente.whatsapp,
        diasInactivo,
        mensajeWhatsapp: `Hola ${cliente.nombres}, te saludamos de AYR Motors. Han pasado ${diasInactivo} días desde tu última visita. Tenemos una promoción disponible para tu próximo mantenimiento. Escríbenos y te ayudamos a agendar.`,
        puedeEnviarWhatsapp: Boolean(
          cliente.whatsapp && cliente.acepta_promociones
        ),
      };
    })
    .filter((cliente) => cliente.diasInactivo > dias)
    .sort((a, b) => b.diasInactivo - a.diasInactivo)
    .slice(0, 10);

  return resultado;
}

export async function generarBackupJSON() {
  const supabase = await createClient();

  const tablas = [
    "clientes",
    "vehiculos",
    "ordenes_trabajo",
    "orden_items",
    "productos",
    "producto_movimientos",
    "cajas",
    "caja_movimientos",
    "orden_pagos",
  ];

  const backup: Record<string, unknown> = {};

  for (const tabla of tablas) {
    const { data, error } = await supabase.from(tabla).select("*");

    if (error) {
      throw new Error(`Error en ${tabla}: ${error.message}`);
    }

    backup[tabla] = data ?? [];
  }

  return backup;
}