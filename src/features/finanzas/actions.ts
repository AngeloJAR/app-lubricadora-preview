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
    movimientosResponse,
    gastosNegocioResponse,
    gastosPersonalesResponse,
    pagosProveedorResponse,
  ] = await Promise.all([
    supabase
      .from("producto_movimientos")
      .select("tipo, cantidad, costo_unitario, precio_unitario, total, created_at")
      .gte("created_at", startIso)
      .lte("created_at", endIso),

    supabase
      .from("gastos")
      .select("monto, fecha, ambito")
      .eq("ambito", "negocio")
      .gte("fecha", startDate)
      .lte("fecha", endDate),

    supabase
      .from("gastos")
      .select("monto, fecha, ambito")
      .eq("ambito", "personal")
      .gte("fecha", startDate)
      .lte("fecha", endDate),

    supabase
      .from("pagos_proveedor")
      .select("monto, fecha, metodo_pago, afecta_caja, factura_compra_id, proveedor_id")
      .gte("fecha", startDate)
      .lte("fecha", endDate),
  ]);

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

  const movimientos = movimientosResponse.data ?? [];
  const gastosNegocio = gastosNegocioResponse.data ?? [];
  const gastosPersonales = gastosPersonalesResponse.data ?? [];
  const pagosProveedor = pagosProveedorResponse.data ?? [];

  const comprasInventario = movimientos
    .filter((item) => item.tipo === "entrada")
    .reduce((acc, item) => acc + Number(item.total ?? 0), 0);

  const costoVentas = movimientos
    .filter((item) => item.tipo === "salida")
    .reduce(
      (acc, item) =>
        acc +
        Number(item.costo_unitario ?? 0) * Number(item.cantidad ?? 0),
      0
    );

  const ingresosProductos = movimientos
    .filter((item) => item.tipo === "salida")
    .reduce(
      (acc, item) =>
        acc +
        Number(item.precio_unitario ?? 0) * Number(item.cantidad ?? 0),
      0
    );

  const gastosOperativos = gastosNegocio.reduce(
    (acc, item) => acc + Number(item.monto ?? 0),
    0
  );

  const gastosPersonalesTotal = gastosPersonales.reduce(
    (acc, item) => acc + Number(item.monto ?? 0),
    0
  );

  const pagosProveedorTotal = pagosProveedor.reduce(
    (acc, item) => acc + Number(item.monto ?? 0),
    0
  );

  const pagosProveedorCaja = pagosProveedor
    .filter((item) => Boolean(item.afecta_caja))
    .reduce((acc, item) => acc + Number(item.monto ?? 0), 0);

  const pagosProveedorNoCaja = pagosProveedor
    .filter((item) => !Boolean(item.afecta_caja))
    .reduce((acc, item) => acc + Number(item.monto ?? 0), 0);

  const gananciaBruta = ingresosProductos - costoVentas;
  const gananciaNeta = gananciaBruta - gastosOperativos;

  const margen =
    ingresosProductos > 0 ? (gananciaNeta / ingresosProductos) * 100 : 0;

  return {
    ingresos: ingresosProductos,
    costoVentas,
    comprasInventario,

    gastos: gastosOperativos,
    gastosNegocio: gastosOperativos,
    gastosPersonales: gastosPersonalesTotal,

    pagosProveedor: pagosProveedorTotal,
    pagosProveedorCaja,
    pagosProveedorNoCaja,

    gananciaBruta,
    gananciaNeta,
    margen,
  };
}