import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aplicarSalidaStock,
  aplicarEntradaStock,
} from "@/lib/core/stock/movimientos";

type OrdenItemStock = {
  tipo_item: string;
  producto_id: string | null;
  nombre_item: string | null;
  cantidad: number | string | null;
  precio_unitario: number | string | null;
};

type ProductoStockRow = {
  id: string;
  stock: number | string | null;
  precio_compra: number | string | null;
  costo_real?: number | string | null;
  nombre: string;
};

type ProductoMovimientoInsert = {
  producto_id: string;
  tipo: "entrada" | "salida";
  motivo: string;
  cantidad: number;
  costo_unitario: number;
  precio_unitario: number | null;
  total: number;
  referencia_tipo: string;
  referencia_id: string;
};

export async function procesarSalidaStockPorOrden(params: {
  supabase: SupabaseClient;
  ordenId: string;
  items: OrdenItemStock[];
}) {
  const { supabase, ordenId, items } = params;

  const productosItems = items.filter(
    (item) => item.tipo_item === "producto" && Boolean(item.producto_id)
  );

  if (productosItems.length === 0) return;

  const productoIds = productosItems
    .map((item) => item.producto_id)
    .filter((id): id is string => Boolean(id));

  const { data, error: productosError } = await supabase
    .from("productos")
    .select("id, stock, precio_compra, costo_real, nombre")
    .in("id", productoIds);

  if (productosError || !data) {
    throw new Error("No se pudieron obtener los productos");
  }

  const productosDB = data as ProductoStockRow[];
  const productosMap = new Map<string, ProductoStockRow>(
    productosDB.map((producto) => [producto.id, producto])
  );

  const movimientos: ProductoMovimientoInsert[] = [];

  const productosAgrupados = new Map<
    string,
    { cantidad: number; totalVenta: number }
  >();

  for (const item of productosItems) {
    if (!item.producto_id) continue;

    const cantidad = Number(item.cantidad ?? 0);
    const precio = Number(item.precio_unitario ?? 0);

    const existente = productosAgrupados.get(item.producto_id);

    if (existente) {
      existente.cantidad += cantidad;
      existente.totalVenta += cantidad * precio;
    } else {
      productosAgrupados.set(item.producto_id, {
        cantidad,
        totalVenta: cantidad * precio,
      });
    }
  }

  for (const [productoId, dataAgrupada] of productosAgrupados) {
    const cantidadTotal = dataAgrupada.cantidad;
    const totalVenta = dataAgrupada.totalVenta;
    const producto = productosMap.get(productoId);

    if (!producto) {
      throw new Error(`Producto no encontrado`);
    }

    const costoUnitarioReal = Number(producto.costo_real ?? producto.precio_compra ?? 0);

    const stockActual = Number(producto.stock ?? 0);
    const cantidadSalida = Number(cantidadTotal);

    console.error("DEBUG_STOCK_SALIDA_ORDEN", {
      ordenId,
      productoId: producto.id,
      productoNombre: producto.nombre,
      stockActual,
      cantidadSalida,
      itemsOriginales: productosItems
        .filter((item) => item.producto_id === producto.id)
        .map((item) => ({
          producto_id: item.producto_id,
          nombre_item: item.nombre_item,
          cantidad: item.cantidad,
          tipo_item: item.tipo_item,
        })),
    });

    const movimientoStock = aplicarSalidaStock(
      stockActual,
      cantidadSalida
    );

    const nuevoStock = movimientoStock.stock_nuevo;

    const { error: updateError } = await supabase
      .from("productos")
      .update({ stock: nuevoStock })
      .eq("id", producto.id);

    if (updateError) {
      throw new Error(`No se pudo actualizar el stock de ${producto.nombre}`);
    }

    const precioUnitarioVenta =
      cantidadTotal > 0 ? totalVenta / cantidadTotal : 0;

    movimientos.push({
      producto_id: producto.id,
      tipo: "salida",
      motivo: "Venta en orden",
      cantidad: cantidadTotal,
      costo_unitario: costoUnitarioReal,
      precio_unitario: precioUnitarioVenta,
      total: cantidadTotal * costoUnitarioReal,
      referencia_tipo: "orden",
      referencia_id: ordenId,
    });
  }

  const { error: movimientosError } = await supabase
    .from("producto_movimientos")
    .insert(movimientos);

  if (movimientosError) {
    throw new Error("Error registrando movimientos de stock");
  }
}

export async function procesarEntradaStockPorCancelacion(params: {
  supabase: SupabaseClient;
  ordenId: string;
  items: OrdenItemStock[];
}) {
  const { supabase, ordenId, items } = params;

  const productosItems = items.filter(
    (item) => item.tipo_item === "producto" && Boolean(item.producto_id)
  );

  if (productosItems.length === 0) return;

  const productosAgrupados = new Map<string, number>();

  for (const item of productosItems) {
    if (!item.producto_id) continue;

    const cantidad = Number(item.cantidad ?? 0);

    productosAgrupados.set(
      item.producto_id,
      (productosAgrupados.get(item.producto_id) ?? 0) + cantidad
    );
  }

  const productoIds = Array.from(productosAgrupados.keys());

  const { data, error: productosError } = await supabase
    .from("productos")
    .select("id, stock, precio_compra, costo_real, nombre")
    .in("id", productoIds);

  if (productosError || !data) {
    throw new Error("No se pudieron obtener los productos");
  }

  const productosDB = data as ProductoStockRow[];
  const productosMap = new Map<string, ProductoStockRow>(
    productosDB.map((p) => [p.id, p])
  );

  const movimientos: ProductoMovimientoInsert[] = [];

  for (const [productoId, cantidadTotal] of productosAgrupados) {
    const producto = productosMap.get(productoId);

    if (!producto) {
      throw new Error("Producto no encontrado");
    }

    const costoUnitarioReal = Number(producto.costo_real ?? producto.precio_compra ?? 0);

    const movimientoStock = aplicarEntradaStock(
      Number(producto.stock ?? 0),
      cantidadTotal
    );

    const nuevoStock = movimientoStock.stock_nuevo;

    const { error: updateError } = await supabase
      .from("productos")
      .update({ stock: nuevoStock })
      .eq("id", producto.id);

    if (updateError) {
      throw new Error(`No se pudo devolver stock de ${producto.nombre}`);
    }
    movimientos.push({
      producto_id: producto.id,
      tipo: "entrada",
      motivo: "Devolución por cambio de estado de orden",
      cantidad: cantidadTotal,
      costo_unitario: costoUnitarioReal,
      precio_unitario: null,
      total: cantidadTotal * costoUnitarioReal,
      referencia_tipo: "orden",
      referencia_id: ordenId,
    });
  }

  const { error: movimientosError } = await supabase
    .from("producto_movimientos")
    .insert(movimientos);

  if (movimientosError) {
    throw new Error("Error registrando devoluciones de stock");
  }
}