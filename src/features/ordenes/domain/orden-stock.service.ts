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

type MovimientoExistenteRow = {
  id?: string;
  producto_id: string;
  tipo: "entrada" | "salida";
  referencia_id: string;
  referencia_tipo: string;
};

function agruparProductosItems(items: OrdenItemStock[]) {
  const productosItems = items.filter(
    (item) => item.tipo_item === "producto" && Boolean(item.producto_id)
  );

  const productosAgrupados = new Map<
    string,
    { cantidad: number; totalVenta: number }
  >();

  for (const item of productosItems) {
    if (!item.producto_id) continue;

    const cantidad = Number(item.cantidad ?? 0);
    const precio = Number(item.precio_unitario ?? 0);

    if (cantidad <= 0) continue;

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

  return { productosItems, productosAgrupados };
}

export async function procesarSalidaStockPorOrden(params: {
  supabase: SupabaseClient;
  ordenId: string;
  items: OrdenItemStock[];
}) {
  const { supabase, ordenId, items } = params;

  const { productosItems, productosAgrupados } = agruparProductosItems(items);

  if (productosItems.length === 0 || productosAgrupados.size === 0) return;

  const productoIds = Array.from(productosAgrupados.keys());

  const { data: movimientosExistentes, error: movimientosExistentesError } =
    await supabase
      .from("producto_movimientos")
      .select("producto_id, tipo, referencia_id, referencia_tipo")
      .eq("referencia_tipo", "orden")
      .eq("referencia_id", ordenId)
      .eq("tipo", "salida")
      .in("producto_id", productoIds);

  if (movimientosExistentesError) {
    throw new Error("No se pudo validar si la orden ya descontó stock");
  }

  const movimientosSalidaPrevios = new Set(
    ((movimientosExistentes ?? []) as MovimientoExistenteRow[]).map(
      (movimiento) => movimiento.producto_id
    )
  );

  const productoIdsPendientes = productoIds.filter(
    (productoId) => !movimientosSalidaPrevios.has(productoId)
  );

  if (productoIdsPendientes.length === 0) {
    return;
  }

  const { data, error: productosError } = await supabase
    .from("productos")
    .select("id, stock, precio_compra, costo_real, nombre")
    .in("id", productoIdsPendientes);

  if (productosError || !data) {
    throw new Error("No se pudieron obtener los productos");
  }

  const productosDB = data as ProductoStockRow[];
  const productosMap = new Map<string, ProductoStockRow>(
    productosDB.map((producto) => [producto.id, producto])
  );

  const movimientos: ProductoMovimientoInsert[] = [];

  for (const productoId of productoIdsPendientes) {
    const dataAgrupada = productosAgrupados.get(productoId);

    if (!dataAgrupada) continue;

    const cantidadTotal = Number(dataAgrupada.cantidad ?? 0);
    const totalVenta = Number(dataAgrupada.totalVenta ?? 0);
    const producto = productosMap.get(productoId);

    if (!producto) {
      throw new Error("Producto no encontrado");
    }

    const costoUnitarioReal = Number(
      producto.costo_real ?? producto.precio_compra ?? 0
    );

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
      yaTeniaSalidaRegistrada: false,
    });

    const movimientoStock = aplicarSalidaStock(stockActual, cantidadSalida);
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

  if (movimientos.length === 0) return;

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

  const { productosItems, productosAgrupados } = agruparProductosItems(items);

  if (productosItems.length === 0 || productosAgrupados.size === 0) return;

  const productoIds = Array.from(productosAgrupados.keys());

  const { data: salidasPrevias, error: salidasPreviasError } = await supabase
    .from("producto_movimientos")
    .select("producto_id, tipo, referencia_id, referencia_tipo")
    .eq("referencia_tipo", "orden")
    .eq("referencia_id", ordenId)
    .eq("tipo", "salida")
    .in("producto_id", productoIds);

  if (salidasPreviasError) {
    throw new Error("No se pudo validar la salida previa de stock");
  }

  const { data: entradasPrevias, error: entradasPreviasError } = await supabase
    .from("producto_movimientos")
    .select("producto_id, tipo, referencia_id, referencia_tipo")
    .eq("referencia_tipo", "orden")
    .eq("referencia_id", ordenId)
    .eq("tipo", "entrada")
    .in("producto_id", productoIds);

  if (entradasPreviasError) {
    throw new Error("No se pudo validar devoluciones previas de stock");
  }

  const setSalidasPrevias = new Set(
    ((salidasPrevias ?? []) as MovimientoExistenteRow[]).map(
      (movimiento) => movimiento.producto_id
    )
  );

  const setEntradasPrevias = new Set(
    ((entradasPrevias ?? []) as MovimientoExistenteRow[]).map(
      (movimiento) => movimiento.producto_id
    )
  );

  const productoIdsPendientes = productoIds.filter(
    (productoId) =>
      setSalidasPrevias.has(productoId) && !setEntradasPrevias.has(productoId)
  );

  if (productoIdsPendientes.length === 0) return;

  const { data, error: productosError } = await supabase
    .from("productos")
    .select("id, stock, precio_compra, costo_real, nombre")
    .in("id", productoIdsPendientes);

  if (productosError || !data) {
    throw new Error("No se pudieron obtener los productos");
  }

  const productosDB = data as ProductoStockRow[];
  const productosMap = new Map<string, ProductoStockRow>(
    productosDB.map((p) => [p.id, p])
  );

  const movimientos: ProductoMovimientoInsert[] = [];

  for (const productoId of productoIdsPendientes) {
    const dataAgrupada = productosAgrupados.get(productoId);

    if (!dataAgrupada) continue;

    const cantidadTotal = Number(dataAgrupada.cantidad ?? 0);
    const producto = productosMap.get(productoId);

    if (!producto) {
      throw new Error("Producto no encontrado");
    }

    const costoUnitarioReal = Number(
      producto.costo_real ?? producto.precio_compra ?? 0
    );

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

  if (movimientos.length === 0) return;

  const { error: movimientosError } = await supabase
    .from("producto_movimientos")
    .insert(movimientos);

  if (movimientosError) {
    throw new Error("Error registrando devoluciones de stock");
  }
}