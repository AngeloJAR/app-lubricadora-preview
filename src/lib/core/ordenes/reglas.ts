export type RolOrdenUI = "admin" | "recepcion" | "tecnico";

export type OrdenEstado =
  | "pendiente"
  | "en_proceso"
  | "completada"
  | "entregada"
  | "cancelada";

export type OrdenEstadoPago = "pendiente" | "abonada" | "pagada";

export function puedeEditarOrden(estado: OrdenEstado) {
  return (
    estado !== "completada" &&
    estado !== "entregada" &&
    estado !== "cancelada"
  );
}

export function puedeCobrarOrden(
  estado: OrdenEstado,
  estadoPago: OrdenEstadoPago
) {
  return estado === "completada" && estadoPago !== "pagada";
}

export function puedeIniciarTrabajoOrden(estado: OrdenEstado) {
  return estado === "pendiente";
}

export function puedeFinalizarTrabajoOrden(estado: OrdenEstado) {
  return estado === "en_proceso";
}

export function puedeEntregarOrden(
  estado: OrdenEstado,
  estadoPago: OrdenEstadoPago
) {
  return estado === "completada" && estadoPago === "pagada";
}

export function calcularEstadoPagoOrden(
  total: number,
  totalPagado: number
): OrdenEstadoPago {
  const safeTotal = Number(total ?? 0);
  const safePagado = Number(totalPagado ?? 0);

  if (safePagado <= 0) return "pendiente";
  if (safePagado >= safeTotal) return "pagada";
  return "abonada";
}

export function calcularSaldoPendienteOrden(
  total: number,
  totalPagado: number
) {
  return Math.max(0, Number(total ?? 0) - Number(totalPagado ?? 0));
}

export function calcularEstadoOrdenDespuesDePago(params: {
  estadoActual: OrdenEstado;
  estadoPago: OrdenEstadoPago;
}) {
  const { estadoActual, estadoPago } = params;

  if (estadoPago === "pagada" && estadoActual === "completada") {
    return "entregada" as OrdenEstado;
  }

  return estadoActual;
}