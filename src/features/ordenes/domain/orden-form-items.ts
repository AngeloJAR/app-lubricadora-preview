import type { OrdenFormData, Servicio } from "@/types";

type Item = OrdenFormData["items"][number];

type ItemSearchState = {
    servicio: string;
    producto: string;
};

export function buildServicioItem(servicio: Servicio): Item {
    return {
        tipo_item: "servicio",
        servicio_id: servicio.id,
        producto_id: "",
        nombre_item: servicio.nombre,
        cantidad: "1",
        precio_unitario: String(servicio.precio_base ?? 0),
        total: String(Number(servicio.precio_base ?? 0)),
    };
}

export function isEmptyInitialItem(item: Item) {
    return !item.nombre_item.trim() && !item.servicio_id && !item.producto_id;
}

export function hasProductoEnItems(items: Item[], productoId: string) {
    return items.some(
        (item) => item.tipo_item === "producto" && item.producto_id === productoId
    );
}

export function hasServicioEnItems(items: Item[], servicioId: string) {
    return items.some(
        (item) => item.tipo_item === "servicio" && item.servicio_id === servicioId
    );
}

export function buildInitialItemSearches(items: Item[]): ItemSearchState[] {
    return items.map((item) => ({
        servicio: item.tipo_item === "servicio" ? item.nombre_item ?? "" : "",
        producto: item.tipo_item === "producto" ? item.nombre_item ?? "" : "",
    }));
}