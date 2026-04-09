import type { OrdenFormData } from "@/types";

export function calcularSubtotalFormulario(items: OrdenFormData["items"]) {
  return items.reduce((acc, item) => acc + Number(item.total || 0), 0);
}

export function calcularDescuentoPuntosFormulario(puntosCanjear: string | number) {
  const puntos = Number(puntosCanjear || 0);

  if (!puntos || puntos <= 0) return 0;

  return puntos * 0.1;
}

export function calcularTotalFormulario(params: {
  items: OrdenFormData["items"];
  descuento: string | number;
  puntos_canjear: string | number;
}) {
  const subtotal = calcularSubtotalFormulario(params.items);
  const descuentoManual = Number(params.descuento || 0);
  const descuentoPuntos = calcularDescuentoPuntosFormulario(params.puntos_canjear);
  const total = subtotal - descuentoManual - descuentoPuntos;

  return {
    subtotal,
    descuentoManual,
    descuentoPuntos,
    total,
  };
}