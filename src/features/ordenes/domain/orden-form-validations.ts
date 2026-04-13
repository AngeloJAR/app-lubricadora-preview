import type { OrdenFormData, Producto } from "@/types";

type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateOrdenFormBase(
  form: OrdenFormData,
  esPreOrdenTecnico: boolean
): ValidationResult {
  if (!form.cliente_id) {
    return { ok: false, message: "Debes seleccionar un cliente." };
  }

  if (!form.vehiculo_id) {
    return { ok: false, message: "Debes seleccionar un vehículo." };
  }

  if (!esPreOrdenTecnico && !form.tecnico_id) {
    return { ok: false, message: "Debes asignar un técnico." };
  }

  if (!esPreOrdenTecnico && !(form.tecnicos_ids ?? []).length) {
    return {
      ok: false,
      message: "Debes seleccionar al menos un técnico asignado.",
    };
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

  return { ok: true };
}

export function validateOrdenFormStock(
  form: OrdenFormData,
  productos: Producto[]
): ValidationResult {
  const productoSinStock = form.items.find((item) => {
    if (item.tipo_item !== "producto") return false;

    const producto = productos.find((p) => p.id === item.producto_id);
    if (!producto) return false;

    return Number(item.cantidad || 0) > Number(producto.stock || 0);
  });

  if (!productoSinStock) {
    return { ok: true };
  }

  const producto = productos.find((p) => p.id === productoSinStock.producto_id);

  return {
    ok: false,
    message: `Stock insuficiente para ${
      producto?.nombre ?? productoSinStock.nombre_item
    }.\nStock actual: ${producto?.stock ?? 0}.`,
  };
}

export function buildOrdenFormToSubmit(params: {
  form: OrdenFormData;
  esPreOrdenTecnico: boolean;
  descuentoPuntos: number;
}): OrdenFormData {
  const { form, esPreOrdenTecnico, descuentoPuntos } = params;

  return {
    ...form,
    items: form.items.map((item) => ({
      ...item,
      cantidad: String(Number(item.cantidad || 1)),
      precio_unitario: String(Number(item.precio_unitario || 0)),
      total: String(
        Number(item.cantidad || 1) * Number(item.precio_unitario || 0)
      ),
    })),
    tecnico_id: esPreOrdenTecnico ? "" : form.tecnico_id,
    descuento_puntos: String(descuentoPuntos),
    tecnicos_ids: esPreOrdenTecnico
      ? []
      : Array.from(
          new Set([...(form.tecnicos_ids ?? []), form.tecnico_id].filter(Boolean))
        ),
  };
}