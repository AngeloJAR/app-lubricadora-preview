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
    .select("id, stock, precio_compra, nombre")
    .in("id", productoIds);

  if (productosError || !data) {
    throw new Error("No se pudieron obtener los productos");
  }

  const productosDB = data as ProductoStockRow[];
  const productosMap = new Map<string, ProductoStockRow>(
    productosDB.map((producto) => [producto.id, producto])
  );

  const movimientos: ProductoMovimientoInsert[] = [];

  for (const item of productosItems) {
    if (!item.producto_id) continue;

    const producto = productosMap.get(item.producto_id);

    if (!producto) {
      throw new Error(`Producto no encontrado: ${item.nombre_item ?? ""}`);
    }

    const cantidad = Number(item.cantidad ?? 0);
    const precioUnitario = Number(item.precio_unitario ?? 0);
    const precioCompra = Number(producto.precio_compra ?? 0);

    const movimientoStock = aplicarSalidaStock(
      Number(producto.stock ?? 0),
      cantidad
    );

    const nuevoStock = movimientoStock.stock_nuevo;

    const { error: updateError } = await supabase
      .from("productos")
      .update({ stock: nuevoStock })
      .eq("id", producto.id);

    if (updateError) {
      throw new Error(`No se pudo actualizar el stock de ${producto.nombre}`);
    }

    movimientos.push({
      producto_id: producto.id,
      tipo: "salida",
      motivo: "Venta en orden",
      cantidad,
      costo_unitario: precioCompra,
      precio_unitario: precioUnitario,
      total: cantidad * precioUnitario,
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

  const productosItems = items.filter((item) => Boolean(item.producto_id));

  for (const item of productosItems) {
    if (!item.producto_id) continue;

    const { data, error } = await supabase
      .from("productos")
      .select("id, stock, precio_compra, nombre")
      .eq("id", item.producto_id)
      .single();

    const producto = (data as ProductoStockRow | null) ?? null;

    if (error || !producto) {
      throw new Error(
        `No se pudo obtener el producto: ${item.nombre_item ?? ""}`
      );
    }

    const cantidad = Number(item.cantidad ?? 0);
    const precioCompra = Number(producto.precio_compra ?? 0);

    const movimientoStock = aplicarEntradaStock(
      Number(producto.stock ?? 0),
      cantidad
    );

    const nuevoStock = movimientoStock.stock_nuevo;

    const { error: updateError } = await supabase
      .from("productos")
      .update({ stock: nuevoStock })
      .eq("id", producto.id);

    if (updateError) {
      throw new Error(`No se pudo devolver stock de ${producto.nombre}`);
    }

    const movimiento: ProductoMovimientoInsert = {
      producto_id: producto.id,
      tipo: "entrada",
      motivo: "Devolución por orden cancelada",
      cantidad,
      costo_unitario: precioCompra,
      precio_unitario: null,
      total: cantidad * precioCompra,
      referencia_tipo: "orden_cancelada",
      referencia_id: ordenId,
    };

    const { error: movimientoError } = await supabase
      .from("producto_movimientos")
      .insert([movimiento]);

    if (movimientoError) {
      throw new Error(
        `No se pudo registrar devolución de ${producto.nombre}`
      );
    }
  }
}