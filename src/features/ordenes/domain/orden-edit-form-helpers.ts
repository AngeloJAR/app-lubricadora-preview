import type { OrdenEditable, OrdenFormData } from "@/types";

export type ProductoCantidadOriginalMap = Record<string, number>;

export const emptyItem: OrdenFormData["items"][number] = {
  tipo_item: "servicio",
  servicio_id: "",
  producto_id: "",
  nombre_item: "",
  cantidad: "1",
  precio_unitario: "0",
  total: "0",
};

export const initialState: OrdenFormData = {
  cliente_id: "",
  vehiculo_id: "",
  tecnico_id: "",
  tecnicos_ids: [],
  kilometraje: "",
  descuento: "0",
  descuento_puntos: "0",
  puntos_canjear: "0",
  notas: "",
  proximo_mantenimiento_fecha: "",
  proximo_mantenimiento_km: "",
  items: [{ ...emptyItem }],
};

export function mapOrdenEditableToForm(data: OrdenEditable): OrdenFormData {
  return {
    cliente_id: data.cliente_id,
    vehiculo_id: data.vehiculo_id,
    tecnico_id: data.tecnico_id ?? "",
    tecnicos_ids: data.tecnico_id ? [data.tecnico_id] : [],
    kilometraje: data.kilometraje?.toString() ?? "",
    descuento: data.descuento?.toString() ?? "0",
    descuento_puntos: "0",
    puntos_canjear: "0",
    notas: data.notas ?? "",
    proximo_mantenimiento_fecha: data.proximo_mantenimiento_fecha ?? "",
    proximo_mantenimiento_km: data.proximo_mantenimiento_km?.toString() ?? "",
    items:
      data.items.length > 0
        ? data.items.map((item) => ({
            tipo_item: item.tipo_item,
            servicio_id: item.servicio_id ?? "",
            producto_id: item.producto_id ?? "",
            nombre_item: item.nombre_item,
            cantidad: String(item.cantidad),
            precio_unitario: String(item.precio_unitario),
            total: String(item.total),
          }))
        : [{ ...emptyItem }],
  };
}

export function getCantidadesOriginalesProductos(
  data: OrdenEditable
): ProductoCantidadOriginalMap {
  return data.items.reduce<ProductoCantidadOriginalMap>((acc, item) => {
    if (item.tipo_item !== "producto" || !item.producto_id) return acc;

    acc[item.producto_id] = (acc[item.producto_id] ?? 0) + Number(item.cantidad || 0);
    return acc;
  }, {});
}

export function getSubtotal(items: OrdenFormData["items"]) {
  return items.reduce((acc, item) => acc + Number(item.total || 0), 0);
}

export function getTotal(subtotal: number, descuento: string) {
  return subtotal - Number(descuento || 0);
}

export function getTecnicosIdsFinal(
  tecnicosIds: string[] = [],
  tecnicoPrincipalId = ""
) {
  return Array.from(
    new Set([...(tecnicosIds ?? []), tecnicoPrincipalId].filter(Boolean))
  );
}