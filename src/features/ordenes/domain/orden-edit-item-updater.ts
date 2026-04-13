import type { OrdenFormData, Producto, Servicio } from "@/types";
import type { ProductoCantidadOriginalMap } from "./orden-edit-form-helpers";

type UpdateItemParams = {
  items: OrdenFormData["items"];
  index: number;
  field: string;
  value: string;
  servicios: Servicio[];
  productos: Producto[];
  cantidadesOriginalesProductos: ProductoCantidadOriginalMap;
};

export function buildUpdatedOrdenItems({
  items,
  index,
  field,
  value,
  servicios,
  productos,
  cantidadesOriginalesProductos,
}: UpdateItemParams): OrdenFormData["items"] {
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
        const stockActual = Number(producto.stock || 0);
        const cantidadOriginalEnOrden = Number(
          cantidadesOriginalesProductos[current.producto_id] || 0
        );

        const stockDisponibleParaEditar =
          stockActual + cantidadOriginalEnOrden;

        if (cantidad > stockDisponibleParaEditar) {
          current.cantidad = String(stockDisponibleParaEditar);
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