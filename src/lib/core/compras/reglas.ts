export type EstadoPagoFacturaCompra = "pendiente" | "parcial" | "pagado";

function toMoney(value: unknown) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}

export function calcularEstadoPagoFacturaCompra(
    total: number,
    totalPagado: number
): EstadoPagoFacturaCompra {
    const safeTotal = toMoney(total);
    const safePagado = toMoney(totalPagado);

    if (safePagado <= 0) return "pendiente";
    if (safePagado >= safeTotal) return "pagado";
    return "parcial";
}

export function calcularSaldoPendienteFacturaCompra(
    total: number,
    totalPagado: number
) {
    const safeTotal = toMoney(total);
    const safePagado = toMoney(totalPagado);

    return toMoney(Math.max(0, safeTotal - safePagado));
}

export function calcularFechaPagoFacturaCompra(params: {
    estadoPago: EstadoPagoFacturaCompra;
    fecha: string;
}) {
    return params.estadoPago === "pagado" ? params.fecha : null;
}