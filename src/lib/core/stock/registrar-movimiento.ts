import { createClient } from "@/lib/supabase/server";
import { calcularNuevoStock, type StockMovimientoTipo } from "./movimientos";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function registrarMovimientoStock(params: {
  supabase: SupabaseServerClient;
  producto_id: string;
  tipo: StockMovimientoTipo;
  cantidad: number;
  motivo: string;
  referencia_tipo: string;
  referencia_id: string;
}) {
  const {
    supabase,
    producto_id,
    tipo,
    cantidad,
    motivo,
    referencia_tipo,
    referencia_id,
  } = params;

  const { data: producto, error: productoError } = await supabase
    .from("productos")
    .select("id, stock")
    .eq("id", producto_id)
    .single();

  if (productoError || !producto) {
    throw new Error("No se pudo obtener el producto para actualizar stock.");
  }

  const movimiento = calcularNuevoStock({
    stock_actual: Number(producto.stock ?? 0),
    cantidad,
    tipo,
  });

  const { error: updateError } = await supabase
    .from("productos")
    .update({
      stock: movimiento.stock_nuevo,
    })
    .eq("id", producto_id);

  if (updateError) {
    throw new Error("No se pudo actualizar el stock del producto.");
  }

  const { error: movimientoError } = await supabase
    .from("producto_movimientos")
    .insert({
      producto_id,
      tipo,
      cantidad: movimiento.cantidad,
      costo_unitario: 0,
      precio_unitario: 0,
      total: 0,
      referencia_tipo,
      referencia_id,
      motivo,
    });

  if (movimientoError) {
    throw new Error("No se pudo registrar el movimiento de stock.");
  }

  return movimiento;
}