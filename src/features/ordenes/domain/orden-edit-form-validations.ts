import type { OrdenFormData, Producto } from "@/types";
import type { ProductoCantidadOriginalMap } from "./orden-edit-form-helpers";

type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateOrdenEditBase(form: OrdenFormData): ValidationResult {
  if (!form.cliente_id) {
    return { ok: false, message: "Debes seleccionar un cliente." };
  }

  if (!form.vehiculo_id) {
    return { ok: false, message: "Debes seleccionar un vehículo." };
  }

  if (!form.items.length) {
    return { ok: false, message: "Debes agregar al menos un item." };
  }

  const invalidItem = form.items.some(
    (item) =>
      !item.tipo_item ||
      !item.nombre_item.trim() ||
      !item.cantidad.trim() ||
      Number(item.cantidad) <= 0 ||
      !item.precio_unitario.trim() ||
      (item.tipo_item === "servicio" && !item.servicio_id) ||
      (item.tipo_item === "producto" && !item.producto_id)
  );

  if (invalidItem) {
    return { ok: false, message: "Revisa los items agregados a la orden." };
  }

  if (!form.tecnico_id) {
    return { ok: false, message: "Debes seleccionar un técnico principal." };
  }

  if (!(form.tecnicos_ids ?? []).length) {
    return {
      ok: false,
      message: "Debes seleccionar al menos un técnico asignado.",
    };
  }

  return { ok: true };
}

export function validateOrdenEditStock(
  form: OrdenFormData,
  productos: Producto[],
  cantidadesOriginalesProductos: ProductoCantidadOriginalMap
): ValidationResult {
  const productoSinStock = form.items.find((item) => {
    if (item.tipo_item !== "producto" || !item.producto_id) return false;

    const producto = productos.find((p) => p.id === item.producto_id);
    if (!producto) return false;

    const stockActual = Number(producto.stock || 0);
    const cantidadOriginalEnOrden = Number(
      cantidadesOriginalesProductos[item.producto_id] || 0
    );
    const stockDisponibleParaEditar = stockActual + cantidadOriginalEnOrden;

    return Number(item.cantidad || 0) > stockDisponibleParaEditar;
  });

  if (!productoSinStock) {
    return { ok: true };
  }

  const producto = productos.find((p) => p.id === productoSinStock.producto_id);

  return {
    ok: false,
    message: `Stock insuficiente para ${
      producto?.nombre ?? productoSinStock.nombre_item
    }. Stock actual: ${producto?.stock ?? 0}.`,
  };
}