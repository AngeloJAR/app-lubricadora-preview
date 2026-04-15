"use server";

import { createClient } from "@/lib/supabase/server";
import { getAlertasStock } from "@/features/productos/actions";
import {
  getDashboardRange,
  type DashboardPeriodo,
} from "./dashboard-periodo";
import { getSaldosDineroActuales } from "@/lib/core/finanzas/saldos";
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

type ServicioTopRow = {
  nombre_item: string;
  total: number | null;
  ordenes_trabajo:
  | {
    estado: string | null;
  }
  | {
    estado: string | null;
  }[]
  | null;
};

type ProductoRentablePeriodoRow = {
  producto_id: string | null;
  cantidad: number | null;
  costo_unitario: number | null;
  precio_unitario: number | null;
  created_at: string | null;
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

type ClienteInactivoRow = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  ordenes_trabajo?: {
    created_at: string;
    estado?: string | null;
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


function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function isNaturalezaOperativa(naturaleza?: string | null) {
  return !naturaleza || naturaleza === "gasto_operativo";
}

function calcularPrestamoIngresado(movimientos: CajaMovimientoRow[]) {
  return movimientos
    .filter((item) => item.naturaleza === "prestamo_recibido")
    .reduce((acc, item) => acc + toNumber(item.monto), 0);
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
    todosMovimientosDineroResponse,
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
      .from("caja_movimientos")
      .select("tipo, monto, cuenta, origen_fondo, naturaleza, created_at"),
  ]);

  if (cajaMovimientosPeriodoResponse.error) {
    console.error(
      "Error caja movimientos período:",
      cajaMovimientosPeriodoResponse.error
    );
    throw new Error("No se pudieron obtener los movimientos de caja del período");
  }

  if (cajaMovimientosMesResponse.error) {
    console.error(
      "Error caja movimientos mes:",
      cajaMovimientosMesResponse.error
    );
    throw new Error("No se pudieron obtener los movimientos de caja del mes");
  }

  if (todosMovimientosDineroResponse.error) {
    console.error(
      "Error movimientos globales de dinero:",
      todosMovimientosDineroResponse.error
    );
    throw new Error("No se pudieron obtener los saldos reales de dinero");
  }

  const cajaMovimientosPeriodo = (cajaMovimientosPeriodoResponse.data ??
    []) as CajaMovimientoRow[];

  const cajaMovimientosMes = (cajaMovimientosMesResponse.data ??
    []) as CajaMovimientoRow[];

  const {
    saldoCaja,
    saldoBanco,
    saldoDeuna,
    saldoBoveda,
    saldoTarjetaPorCobrar,
    saldoTotalLiquido,
  } = await getSaldosDineroActuales();

  const dineroPrestamoIngresado = calcularPrestamoIngresado(cajaMovimientosPeriodo);

  const dineroPrestamoUsado = sumBy(
    cajaMovimientosPeriodo.filter(
      (item) =>
        item.tipo === "egreso" &&
        item.origen_fondo === "prestamo" &&
        item.naturaleza !== "pago_prestamo"
    ),
    (item) => toNumber(item.monto)
  );

  const pagoPrestamo = sumBy(
    cajaMovimientosPeriodo.filter(
      (item) => item.tipo === "egreso" && item.naturaleza === "pago_prestamo"
    ),
    (item) => toNumber(item.monto)
  );

  const cobrosOperativosPeriodo = sumBy(
    cajaMovimientosPeriodo.filter(
      (item) =>
        item.tipo === "ingreso" && item.naturaleza === "ingreso_operativo"
    ),
    (item) => toNumber(item.monto)
  );

  const cobrosOperativosMes = sumBy(
    cajaMovimientosMes.filter(
      (item) =>
        item.tipo === "ingreso" && item.naturaleza === "ingreso_operativo"
    ),
    (item) => toNumber(item.monto)
  );

  const egresosOperativosPeriodo = sumBy(
    cajaMovimientosPeriodo.filter(
      (item) => item.tipo === "egreso" && isNaturalezaOperativa(item.naturaleza)
    ),
    (item) => toNumber(item.monto)
  );

  const egresosOperativosMes = sumBy(
    cajaMovimientosMes.filter(
      (item) => item.tipo === "egreso" && isNaturalezaOperativa(item.naturaleza)
    ),
    (item) => toNumber(item.monto)
  );

  const utilidadRealPeriodo = cobrosOperativosPeriodo - egresosOperativosPeriodo;
  const utilidadRealMes = cobrosOperativosMes - egresosOperativosMes;

  return {
    saldoCaja,
    saldoBanco,
    saldoDeuna,
    saldoBoveda,
    saldoTarjetaPorCobrar,
    saldoTotalLiquido,
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

  const [
    ordenesAbiertasResponse,
    ordenesCerradasPeriodoResponse,
    ordenesCerradasMesResponse,
    movimientosPeriodoResponse,
    movimientosMesResponse,
  ] = await Promise.all([
    supabase
      .from("ordenes_trabajo")
      .select("id", { count: "exact", head: true })
      .in("estado", ["pendiente", "en_proceso"]),

    supabase
      .from("ordenes_trabajo")
      .select("id, total")
      .in("estado", ["completada", "entregada"])
      .gte("fecha", rangePeriodo.startDate)
      .lte("fecha", rangePeriodo.endDate),

    supabase
      .from("ordenes_trabajo")
      .select("id, total")
      .in("estado", ["completada", "entregada"])
      .gte("fecha", rangeMes.startDate)
      .lte("fecha", rangeMes.endDate),

    supabase
      .from("caja_movimientos")
      .select("tipo, monto, naturaleza, created_at")
      .gte("created_at", rangePeriodo.start)
      .lte("created_at", rangePeriodo.end),

    supabase
      .from("caja_movimientos")
      .select("tipo, monto, naturaleza, created_at")
      .gte("created_at", rangeMes.start)
      .lte("created_at", rangeMes.end),
  ]);

  if (ordenesAbiertasResponse.error) {
    console.error("Error ordenes abiertas:", ordenesAbiertasResponse.error);
    throw new Error("No se pudieron obtener las órdenes abiertas");
  }

  if (ordenesCerradasPeriodoResponse.error) {
    console.error(
      "Error órdenes cerradas período:",
      ordenesCerradasPeriodoResponse.error
    );
    throw new Error("No se pudieron obtener las órdenes cerradas del período");
  }

  if (ordenesCerradasMesResponse.error) {
    console.error(
      "Error órdenes cerradas mes:",
      ordenesCerradasMesResponse.error
    );
    throw new Error("No se pudieron obtener las órdenes cerradas del mes");
  }

  if (movimientosPeriodoResponse.error) {
    console.error(
      "Error movimientos caja período:",
      movimientosPeriodoResponse.error
    );
    throw new Error("No se pudieron obtener los movimientos de caja del período");
  }

  if (movimientosMesResponse.error) {
    console.error("Error movimientos caja mes:", movimientosMesResponse.error);
    throw new Error("No se pudieron obtener los movimientos de caja del mes");
  }

  const ordenesAbiertas = ordenesAbiertasResponse.count ?? 0;
  const ordenesCerradasPeriodoRows = (ordenesCerradasPeriodoResponse.data ?? []) as {
    id: string;
    total: number | null;
  }[];

  const movimientosPeriodo = (movimientosPeriodoResponse.data ?? []) as CajaMovimientoRow[];
  const movimientosMes = (movimientosMesResponse.data ?? []) as CajaMovimientoRow[];

  const ingresosPeriodo = sumBy(
    movimientosPeriodo.filter(
      (item) =>
        item.tipo === "ingreso" && item.naturaleza === "ingreso_operativo"
    ),
    (item) => toNumber(item.monto)
  );

  const ingresosMes = sumBy(
    movimientosMes.filter(
      (item) =>
        item.tipo === "ingreso" && item.naturaleza === "ingreso_operativo"
    ),
    (item) => toNumber(item.monto)
  );

  const egresosOperativosPeriodo = sumBy(
    movimientosPeriodo.filter(
      (item) =>
        item.tipo === "egreso" && isNaturalezaOperativa(item.naturaleza)
    ),
    (item) => toNumber(item.monto)
  );

  const egresosOperativosMes = sumBy(
    movimientosMes.filter(
      (item) =>
        item.tipo === "egreso" && isNaturalezaOperativa(item.naturaleza)
    ),
    (item) => toNumber(item.monto)
  );

  const utilidadPeriodo = ingresosPeriodo - egresosOperativosPeriodo;
  const utilidadMes = ingresosMes - egresosOperativosMes;

  const margenPeriodo = calcMargen(ingresosPeriodo, utilidadPeriodo);
  const margenMes = calcMargen(ingresosMes, utilidadMes);

  const ordenesCerradasPeriodo = ordenesCerradasPeriodoRows.length;

  const totalOrdenesCerradasPeriodo = sumBy(
    ordenesCerradasPeriodoRows,
    (item) => toNumber(item.total)
  );

  const ticketPromedio =
    ordenesCerradasPeriodo > 0
      ? totalOrdenesCerradasPeriodo / ordenesCerradasPeriodo
      : 0;
  const puntoEquilibrioMes = sumBy(
    movimientosMes.filter(
      (item) =>
        item.tipo === "egreso" && isNaturalezaOperativa(item.naturaleza)
    ),
    (item) => toNumber(item.monto)
  );

  return {
    ordenes_abiertas: ordenesAbiertas,

    ventas_hoy: ingresosPeriodo,
    costos_hoy: 0,
    gastos_hoy: egresosOperativosPeriodo,
    utilidad_hoy: utilidadPeriodo,
    margen_hoy: margenPeriodo,

    ventas_mes: ingresosMes,
    costos_mes: 0,
    gastos_mes: egresosOperativosMes,
    utilidad_mes: utilidadMes,
    margen_mes: margenMes,

    ticket_promedio: ticketPromedio,
    ordenes_cerradas_periodo: ordenesCerradasPeriodo,
    punto_equilibrio: puntoEquilibrioMes,
  };
}

export async function getServiciosTop(): Promise<DashboardServicioTop[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orden_items")
    .select(`
      nombre_item,
      total,
      ordenes_trabajo (
        estado
      )
    `)
    .eq("tipo_item", "servicio");

  if (error) {
    console.error("Error en getServiciosTop:", error.message);
    throw new Error("No se pudieron cargar los servicios más vendidos");
  }

  const rows = (data ?? []) as ServicioTopRow[];

  const grouped = new Map<
    string,
    {
      nombre_item: string;
      total_servicios: number;
      total_ingresos: number;
    }
  >();

  for (const item of rows) {
    const orden = normalizeRelation(item.ordenes_trabajo);

    if (!orden || !["completada", "entregada"].includes(orden.estado ?? "")) {
      continue;
    }

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
    .in("estado", ["completada", "entregada"])
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

export async function getProductosRentables(
  periodo: DashboardPeriodo = "30d"
): Promise<DashboardProductoRentable[]> {
  const supabase = await createClient();
  const range = getDashboardRange(periodo);


  const { data, error } = await supabase
    .from("producto_movimientos")
    .select(`
    producto_id,
    cantidad,
    costo_unitario,
    precio_unitario,
    created_at,
    productos (
      id,
      nombre
    )
  `)
    .eq("tipo", "salida")
    .gte("created_at", range.start)
    .lte("created_at", range.end)
    .not("producto_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al cargar productos rentables:", error.message);
    throw new Error("No se pudieron cargar los productos rentables");
  }

  const rows = (data ?? []) as ProductoRentablePeriodoRow[];

  const grouped = new Map<string, DashboardProductoRentable>();

  for (const item of rows) {
    if (!item.producto_id) continue;

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
    getProductosRentables(periodo),
    getAlertasStock(),
  ]);

  const alertas: DashboardAlerta[] = [];

  if (Number(metricas.utilidad_hoy) < 0) {
    alertas.push({
      tipo: "error",
      titulo: "Utilidad negativa en el período",
      descripcion:
        "En el período seleccionado los egresos operativos superan los ingresos. Revisa cobros, gastos y salidas de dinero.",
    });
  }

  if (Number(metricas.gastos_hoy) > Number(metricas.ventas_hoy)) {
    alertas.push({
      tipo: "error",
      titulo: "Egresos del período por encima de ingresos",
      descripcion:
        "Los egresos operativos registrados en el período seleccionado son mayores que los ingresos.",
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
    getProductosRentables(periodo),
  ]);

  const acciones: DashboardAccionSugerida[] = [];

  if (Number(metricas.utilidad_hoy) < 0) {
    acciones.push({
      tipo: "error",
      titulo: "Revisar utilidad negativa del período",
      descripcion:
        "Reduce egresos operativos o revisa tus cobros, porque en el rango seleccionado salió más dinero del que entró.",
    });
  }

  if (
    Number(metricas.ventas_hoy) > 0 &&
    Number(metricas.gastos_hoy) / Number(metricas.ventas_hoy) > 0.5
  ) {
    acciones.push({
      tipo: "warning",
      titulo: "Controlar egresos del período",
      descripcion:
        "Tus egresos operativos del período superan el 50% de los ingresos. Revisa pagos, gastos y salidas no urgentes.",
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
        "No se detectaron acciones urgentes. Sigue registrando ingresos, egresos y movimientos reales para mejorar las recomendaciones.",
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

  const { data, error } = await supabase
    .from("caja_movimientos")
    .select("created_at, tipo, monto, naturaleza")
    .gte("created_at", range.start)
    .lte("created_at", range.end);

  if (error) {
    console.error(
      "Error cargando serie financiera desde caja_movimientos:",
      error.message
    );
    throw new Error("No se pudo cargar la serie financiera");
  }

  const movimientos = (data ?? []) as CajaMovimientoRow[];

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

  for (const item of movimientos) {
    const fecha = String(item.created_at).split("T")[0];
    const actual = base.get(fecha);

    if (!actual) continue;

    const monto = Number(item.monto ?? 0);

    if (item.tipo === "ingreso" && item.naturaleza === "ingreso_operativo") {
      actual.ventas += monto;
      continue;
    }

    if (item.tipo === "egreso" && item.naturaleza === "gasto_operativo") {
      actual.gastos += monto;
      actual.costos += monto;
      continue;
    }
  }

  for (const item of base.values()) {
    item.utilidad = item.ventas - item.gastos;
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
        created_at,
        estado
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
      const ordenesValidas =
        cliente.ordenes_trabajo?.filter((o) =>
          ["completada", "entregada"].includes(o.estado ?? "")
        ) ?? [];

      if (ordenesValidas.length === 0) {
        return true;
      }

      const ultimaOrden = ordenesValidas
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