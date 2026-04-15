"use server";

import { createClient } from "@/lib/supabase/server";
import type { DashboardPeriodo } from "@/features/dashboard/dashboard-periodo";
import { getDashboardRange } from "@/features/dashboard/dashboard-periodo";

function resolveResumenRange(periodo: DashboardPeriodo) {
  const range = getDashboardRange(periodo);

  return {
    startIso: range.start,
    endIso: range.end,
    startDate: range.startDate,
    endDate: range.endDate,
  };
}

export async function getResumenFinanciero(
  periodo: DashboardPeriodo = "7d"
) {
  const supabase = await createClient();
  const { startIso, endIso, startDate, endDate } = resolveResumenRange(periodo);

  const [
    ventasDevengadasResponse,
    cobrosResponse,
    movimientosResponse,
    gastosNegocioResponse,
    gastosPersonalesResponse,
    pagosProveedorResponse,
    pagosEmpleadosResponse,
  ] = await Promise.all([
    supabase
      .from("ordenes_trabajo")
      .select("total")
      .in("estado", ["completada", "entregada"])
      .gte("fecha", startDate)
      .lte("fecha", endDate),

    supabase
      .from("caja_movimientos")
      .select("monto, tipo, naturaleza, created_at")
      .eq("tipo", "ingreso")
      .eq("naturaleza", "ingreso_operativo")
      .gte("created_at", startIso)
      .lte("created_at", endIso),

    supabase
      .from("producto_movimientos")
      .select("tipo, cantidad, costo_unitario, total, created_at")
      .eq("tipo", "salida")
      .gte("created_at", startIso)
      .lte("created_at", endIso),

    supabase
      .from("gastos")
      .select("monto, fecha, ambito, naturaleza")
      .eq("ambito", "negocio")
      .gte("fecha", startDate)
      .lte("fecha", endDate),

    supabase
      .from("gastos")
      .select("monto, fecha, ambito, naturaleza")
      .eq("ambito", "personal")
      .gte("fecha", startDate)
      .lte("fecha", endDate),

    supabase
      .from("pagos_proveedor")
      .select("monto, fecha, metodo_pago, afecta_caja, factura_compra_id, proveedor_id, naturaleza")
      .gte("fecha", startDate)
      .lte("fecha", endDate),

    supabase
      .from("empleados_pagos")
      .select("monto, fecha_pago, naturaleza")
      .gte("fecha_pago", startDate)
      .lte("fecha_pago", endDate),
  ]);

  if (ventasDevengadasResponse.error) {
    throw new Error("No se pudieron obtener las ventas devengadas");
  }

  if (cobrosResponse.error) {
    throw new Error("No se pudieron obtener los cobros reales");
  }

  if (movimientosResponse.error) {
    throw new Error("No se pudieron obtener los movimientos");
  }

  if (gastosNegocioResponse.error) {
    throw new Error("No se pudieron obtener los gastos del negocio");
  }

  if (gastosPersonalesResponse.error) {
    throw new Error("No se pudieron obtener los gastos personales");
  }

  if (pagosProveedorResponse.error) {
    throw new Error("No se pudieron obtener los pagos a proveedores");
  }

  if (pagosEmpleadosResponse.error) {
    throw new Error("No se pudieron obtener los pagos a empleados");
  }

  const ventasDevengadas = (ventasDevengadasResponse.data ?? []).reduce(
    (acc, item) => acc + Number(item.total ?? 0),
    0
  );

  const cobrosReales = (cobrosResponse.data ?? []).reduce(
    (acc, item) => acc + Number(item.monto ?? 0),
    0
  );

  const costoVentas = (movimientosResponse.data ?? []).reduce((acc, item) => {
    const total = Number(item.total ?? 0);
    if (total > 0) return acc + total;
    return acc + Number(item.cantidad ?? 0) * Number(item.costo_unitario ?? 0);
  }, 0);

  const gastosOperativos = (gastosNegocioResponse.data ?? [])
    .filter((item) => !item.naturaleza || item.naturaleza === "gasto_operativo")
    .reduce((acc, item) => acc + Number(item.monto ?? 0), 0);

  const gastosPersonales = (gastosPersonalesResponse.data ?? []).reduce(
    (acc, item) => acc + Number(item.monto ?? 0),
    0
  );

  const pagosProveedorTotal = (pagosProveedorResponse.data ?? []).reduce(
    (acc, item) => acc + Number(item.monto ?? 0),
    0
  );

  const pagosProveedorCaja = (pagosProveedorResponse.data ?? [])
    .filter((item) => Boolean(item.afecta_caja))
    .reduce((acc, item) => acc + Number(item.monto ?? 0), 0);

  const pagosProveedorNoCaja = (pagosProveedorResponse.data ?? [])
    .filter((item) => !Boolean(item.afecta_caja))
    .reduce((acc, item) => acc + Number(item.monto ?? 0), 0);

  const pagosEmpleadosOperativos = (pagosEmpleadosResponse.data ?? [])
    .filter((item) => !item.naturaleza || item.naturaleza === "gasto_operativo")
    .reduce((acc, item) => acc + Number(item.monto ?? 0), 0);

  const gananciaBruta = ventasDevengadas - costoVentas;
  const gananciaNeta =
    gananciaBruta - gastosOperativos - pagosEmpleadosOperativos;

  const margen =
    ventasDevengadas > 0 ? (gananciaNeta / ventasDevengadas) * 100 : 0;

  return {
    ingresos: cobrosReales,
    ventasDevengadas,
    costoVentas,
    comprasInventario: 0,

    gastos: gastosOperativos,
    gastosNegocio: gastosOperativos,
    gastosPersonales,

    pagosProveedor: pagosProveedorTotal,
    pagosProveedorCaja,
    pagosProveedorNoCaja,

    gananciaBruta,
    gananciaNeta,
    margen,
  };
}