import type { OrdenItem } from "@/types";

export function calcularPuntosOrden(items: OrdenItem[]) {
  let puntos = 0;

  for (const item of items) {
    const total = Number(item.total ?? 0);

    if (total <= 0) continue;

    if (item.tipo_item === "servicio") {

      puntos += Math.floor(total / 5);
    } else if (item.tipo_item === "producto") {

      puntos += Math.floor(total / 10);
    }
  }

  return Math.floor(puntos);
}