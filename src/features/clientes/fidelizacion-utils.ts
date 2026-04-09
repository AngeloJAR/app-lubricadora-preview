import type { OrdenItem } from "@/types";

export function calcularPuntosOrden(items: OrdenItem[]) {
  let puntos = 0;

  for (const item of items) {
    if (item.tipo_item === "servicio") {
        
      puntos += Math.floor(item.total / 5); // 1 punto cada $5
    }

    if (item.tipo_item === "producto") {

      puntos += Math.floor(item.total / 10); // 1 punto cada $10
    }
  }

  return puntos;
}