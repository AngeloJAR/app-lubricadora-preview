import type { OrdenFormData, Producto, Servicio } from "@/types";

type ItemTipo = "servicio" | "producto";

type ItemSearchState = {
  servicio: string;
  producto: string;
};

type BuildUpdatedOrdenFormItemsParams = {
  items: OrdenFormData["items"];
  index: number;
  field: string;
  value: string;
  servicios: Servicio[];
  productos: Producto[];
};

type BuildUpdatedOrdenFormItemSearchesParams = {
  itemSearches: ItemSearchState[];
  index: number;
  field: string;
  value: string;
  servicios: Servicio[];
  productos: Producto[];
};

export function buildUpdatedOrdenFormItems({
  items,
  index,
  field,
  value,
  servicios,
  productos,
}: BuildUpdatedOrdenFormItemsParams): OrdenFormData["items"] {
  const nextItems = [...items];
  const current = { ...nextItems[index], [field]: value };

  if (field === "tipo_item") {
    current.servicio_id = "";
    current.producto_id = "";
    current.nombre_item = "";
    current.precio_unitario = "0";
    current.total = String(Number(current.cantidad || "0") * 0);
  }

  if (field === "servicio_id" && current.tipo_item === "servicio") {
    const servicio = servicios.find((s) => s.id === value);

    if (servicio) {
      current.nombre_item = servicio.nombre;
      current.precio_unitario = String(servicio.precio_base);
      current.total = String(
        Number(current.cantidad || "1") * Number(servicio.precio_base)
      );
    }
  }

  if (field === "producto_id" && current.tipo_item === "producto") {
    const producto = productos.find((p) => p.id === value);

    if (producto) {
      current.nombre_item = producto.nombre;
      current.precio_unitario = String(producto.precio_venta);

      const cantidadActual = Number(current.cantidad || "1");
      const stockProducto = Number(producto.stock || 0);
      const cantidadAjustada =
        cantidadActual > stockProducto ? stockProducto : cantidadActual;

      current.cantidad = String(cantidadAjustada <= 0 ? 1 : cantidadAjustada);
      current.total = String(
        Number(current.cantidad || "1") * Number(producto.precio_venta)
      );
    }
  }

  if (field === "cantidad" || field === "precio_unitario") {
    if (current.tipo_item === "producto" && current.producto_id) {
      const producto = productos.find((p) => p.id === current.producto_id);

      if (producto) {
        const cantidad = Number(current.cantidad || "0");
        if (cantidad > Number(producto.stock || 0)) {
          current.cantidad = String(producto.stock || 0);
        }
      }
    }

    current.total = String(
      Number(current.cantidad || "0") * Number(current.precio_unitario || "0")
    );
  }

  nextItems[index] = current;
  return nextItems;
}

export function buildUpdatedOrdenFormItemSearches({
  itemSearches,
  index,
  field,
  value,
  servicios,
  productos,
}: BuildUpdatedOrdenFormItemSearchesParams): ItemSearchState[] {
  const next = [...itemSearches];

  if (!next[index]) {
    next[index] = { servicio: "", producto: "" };
  }

  if (field === "tipo_item") {
    next[index] = { servicio: "", producto: "" };
    return next;
  }

  if (field === "servicio_id") {
    const servicio = servicios.find((s) => s.id === value);
    next[index] = {
      ...next[index],
      servicio: servicio?.nombre ?? "",
    };
    return next;
  }

  if (field === "producto_id") {
    const producto = productos.find((p) => p.id === value);
    next[index] = {
      ...next[index],
      producto: producto?.nombre ?? "",
    };
    return next;
  }

  return next;
}

export type { ItemTipo, ItemSearchState };