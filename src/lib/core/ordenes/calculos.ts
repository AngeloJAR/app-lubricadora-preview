export type OrdenItemCore = {
  tipo_item: "servicio" | "producto";
  cantidad: number;
  precio_unitario: number;
  total?: number | null;
};

export type OrdenTotalesInput = {
  items: OrdenItemCore[];
  descuento?: number | null;
  recargo?: number | null;
};

export type OrdenTotalesResultado = {
  subtotal: number;
  descuento: number;
  recargo: number;
  total: number;
  cantidadItems: number;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return value;
}

export function calcularTotalItem(item: OrdenItemCore) {
  const cantidad = normalizeNumber(item.cantidad);
  const precioUnitario = normalizeNumber(item.precio_unitario);

  return roundMoney(cantidad * precioUnitario);
}

export function calcularSubtotalOrden(items: OrdenItemCore[]) {
  const subtotal = items.reduce((acc, item) => {
    const totalItem =
      typeof item.total === "number" && !Number.isNaN(item.total)
        ? item.total
        : calcularTotalItem(item);

    return acc + totalItem;
  }, 0);

  return roundMoney(subtotal);
}

export function calcularTotalesOrden(
  input: OrdenTotalesInput
): OrdenTotalesResultado {
  const subtotal = calcularSubtotalOrden(input.items);
  const descuento = Math.max(0, normalizeNumber(input.descuento));
  const recargo = Math.max(0, normalizeNumber(input.recargo));

  const totalBase = subtotal - descuento + recargo;
  const total = roundMoney(Math.max(0, totalBase));

  return {
    subtotal,
    descuento: roundMoney(descuento),
    recargo: roundMoney(recargo),
    total,
    cantidadItems: input.items.length,
  };
}