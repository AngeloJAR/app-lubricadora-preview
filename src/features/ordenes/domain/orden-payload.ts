import type { OrdenFormData } from "@/types";
import { procesarTotalesOrden } from "./orden.service";

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

export function construirItemsDesdePayload(payload: OrdenFormData) {
  return payload.items.map((item) => {
    const cantidad = toNumber(item.cantidad);
    const precioUnitario = toNumber(item.precio_unitario);

    return {
      tipo_item: item.tipo_item,
      servicio_id:
        item.tipo_item === "servicio" ? item.servicio_id || null : null,
      producto_id:
        item.tipo_item === "producto" ? item.producto_id || null : null,
      nombre_item: item.nombre_item,
      cantidad,
      precio_unitario: precioUnitario,
    };
  });
}

export function construirDescuentosDesdePayload(payload: OrdenFormData, calcularDescuentoPorPuntos: (p: number) => number) {
  const descuentoManual = payload.descuento?.toString().trim()
    ? Number(payload.descuento)
    : 0;

  const puntosCanjear = payload.puntos_canjear?.toString().trim()
    ? Number(payload.puntos_canjear)
    : 0;

  const descuentoPuntos =
    payload.descuento_puntos?.toString().trim()
      ? Number(payload.descuento_puntos)
      : calcularDescuentoPorPuntos(puntosCanjear);

  return {
    descuentoManual,
    puntosCanjear,
    descuentoPuntos,
    descuentoTotal: descuentoManual + descuentoPuntos,
  };
}

export function construirTotalesOrdenDesdePayload(params: {
  payload: OrdenFormData;
  calcularDescuentoPorPuntos: (p: number) => number;
}) {
  const { payload, calcularDescuentoPorPuntos } = params;

  const items = construirItemsDesdePayload(payload);

  const {
    descuentoManual,
    puntosCanjear,
    descuentoPuntos,
    descuentoTotal,
  } = construirDescuentosDesdePayload(payload, calcularDescuentoPorPuntos);

  const totales = procesarTotalesOrden({
    items,
    descuento: descuentoTotal,
  });

  const itemsConTotal = items.map((item) => ({
    ...item,
    total: item.cantidad * item.precio_unitario,
  }));

  return {
    items,
    itemsConTotal,
    totales,
    descuentoManual,
    descuentoPuntos,
    puntosCanjear,
  };
}