export type ProductoCostosInput = {
  precio_compra: number; // valor base ingresado
  incluye_iva?: boolean;

  costo_filtro?: number;
  costo_ambiental?: number;
  costo_tarjeta?: number;

  incluye_filtro?: boolean;
  incluye_ambiental?: boolean;
  incluye_tarjeta?: boolean;

  iva_porcentaje?: number; // default 15%
};

export type ProductoCostosResultado = {
  costo_sin_iva: number;
  iva_valor: number;
  costo_con_iva: number;

  extras: number;
  costo_total: number;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalize(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return value;
}

export function calcularCostosProducto(
  input: ProductoCostosInput
): ProductoCostosResultado {
  const iva = (normalize(input.iva_porcentaje) || 15) / 100;

  const precioCompra = normalize(input.precio_compra);

  let costoSinIva = 0;
  let ivaValor = 0;
  let costoConIva = 0;

  if (input.incluye_iva) {
    costoConIva = precioCompra;
    costoSinIva = precioCompra / (1 + iva);
    ivaValor = costoConIva - costoSinIva;
  } else {
    costoSinIva = precioCompra;
    ivaValor = precioCompra * iva;
    costoConIva = costoSinIva + ivaValor;
  }

  const extras =
    (input.incluye_filtro ? normalize(input.costo_filtro) : 0) +
    (input.incluye_ambiental ? normalize(input.costo_ambiental) : 0) +
    (input.incluye_tarjeta ? normalize(input.costo_tarjeta) : 0);

  const costoTotal = costoConIva + extras;

  return {
    costo_sin_iva: roundMoney(costoSinIva),
    iva_valor: roundMoney(ivaValor),
    costo_con_iva: roundMoney(costoConIva),
    extras: roundMoney(extras),
    costo_total: roundMoney(costoTotal),
  };
}