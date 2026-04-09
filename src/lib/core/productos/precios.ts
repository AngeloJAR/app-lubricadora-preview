export type ProductoPreciosInput = {
  costo_total: number;
  margen_porcentaje?: number;
  redondear_entero?: boolean; 
  incluir_iva_venta?: boolean;
  iva_porcentaje?: number; 
};

export type ProductoPreciosResultado = {
  costo_total: number;
  margen_porcentaje: number;
  ganancia: number;
  precio_sin_iva: number;
  iva_venta_valor: number;
  precio_final: number;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundUpInteger(value: number) {
  return Math.ceil(value);
}

function normalize(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return value;
}

export function calcularGananciaDesdeMargen(
  costoTotal: number,
  margenPorcentaje: number
) {
  const costo = normalize(costoTotal);
  const margen = normalize(margenPorcentaje);

  return roundMoney(costo * (margen / 100));
}

export function calcularPrecioProducto(
  input: ProductoPreciosInput
): ProductoPreciosResultado {
  const costoTotal = normalize(input.costo_total);
  const margenPorcentaje = normalize(input.margen_porcentaje) || 45;
  const ivaPorcentaje = normalize(input.iva_porcentaje) || 15;

  const ganancia = calcularGananciaDesdeMargen(costoTotal, margenPorcentaje);
  let precioSinIva = costoTotal + ganancia;

  if (input.redondear_entero !== false) {
    precioSinIva = roundUpInteger(precioSinIva);
  } else {
    precioSinIva = roundMoney(precioSinIva);
  }

  let ivaVentaValor = 0;
  let precioFinal = precioSinIva;

  if (input.incluir_iva_venta) {
    ivaVentaValor = precioSinIva * (ivaPorcentaje / 100);
    precioFinal = precioSinIva + ivaVentaValor;

    if (input.redondear_entero !== false) {
      precioFinal = roundUpInteger(precioFinal);
      ivaVentaValor = roundMoney(precioFinal - precioSinIva);
    } else {
      ivaVentaValor = roundMoney(ivaVentaValor);
      precioFinal = roundMoney(precioFinal);
    }
  }

  return {
    costo_total: roundMoney(costoTotal),
    margen_porcentaje: margenPorcentaje,
    ganancia: roundMoney(ganancia),
    precio_sin_iva: roundMoney(precioSinIva),
    iva_venta_valor: roundMoney(ivaVentaValor),
    precio_final: roundMoney(precioFinal),
  };
}

export function calcularMargenReal(params: {
  costo_total: number;
  precio_venta: number;
}) {
  const costo = normalize(params.costo_total);
  const precioVenta = normalize(params.precio_venta);

  if (precioVenta <= 0) return 0;

  const ganancia = precioVenta - costo;
  return roundMoney((ganancia / costo) * 100);
}