import type { OrdenItemCore } from "@/lib/core/ordenes/calculos";

export type OrdenItemFuente = {
  tipo_item?: string | null;
  tipo?: string | null;

  cantidad?: number | null;
  precio_unitario?: number | null;
  total?: number | null;

  servicio_id?: number | string | null;
  producto_id?: number | string | null;

  nombre_item?: string | null;
  nombre?: string | null;
};

export type OrdenFuenteBasica = {
  items?: OrdenItemFuente[] | null;
  descuento?: number | null;
  recargo?: number | null;
};

function normalizeNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return value;
}

function normalizeTipoItem(value: string | null | undefined): "servicio" | "producto" {
  return value === "producto" ? "producto" : "servicio";
}

export function mapOrdenItemToCore(item: OrdenItemFuente): OrdenItemCore {
  return {
    tipo_item: normalizeTipoItem(item.tipo_item ?? item.tipo),
    cantidad: normalizeNumber(item.cantidad),
    precio_unitario: normalizeNumber(item.precio_unitario),
    total:
      typeof item.total === "number" && !Number.isNaN(item.total)
        ? item.total
        : undefined,
  };
}

export function mapOrdenItemsToCore(items: OrdenItemFuente[] | null | undefined): OrdenItemCore[] {
  if (!Array.isArray(items)) return [];
  return items.map(mapOrdenItemToCore);
}

export function mapOrdenToCoreInput(orden: OrdenFuenteBasica) {
  return {
    items: mapOrdenItemsToCore(orden.items),
    descuento: normalizeNumber(orden.descuento),
    recargo: normalizeNumber(orden.recargo),
  };
}