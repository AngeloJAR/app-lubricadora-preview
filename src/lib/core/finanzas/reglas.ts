import type {
  CuentaDinero,
  EstadoPago,
  MetodoPago,
  NaturalezaMovimiento,
  OrigenFondo,
} from "./types";

export function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toMoney(value: unknown): number {
  return Math.round(toNumber(value) * 100) / 100;
}

function assertNeverValue(value: unknown, label: string): never {
  throw new Error(`${label} inválido: ${String(value ?? "vacío")}`);
}

export function normalizeMetodoPago(value?: string | null): MetodoPago {
  if (
    value === "efectivo" ||
    value === "transferencia" ||
    value === "deuna" ||
    value === "tarjeta" ||
    value === "mixto"
  ) {
    return value;
  }

  return assertNeverValue(value, "Método de pago");
}

export function resolveCuentaDesdeMetodoPago(
  metodo: MetodoPago
): CuentaDinero {
  switch (metodo) {
    case "efectivo":
      return "caja";
    case "transferencia":
      return "banco";
    case "deuna":
      return "deuna";
    case "tarjeta":
      return "tarjeta_por_cobrar";
    case "mixto":
      return "banco";
    default:
      return assertNeverValue(metodo, "Método de pago");
  }
}

export function normalizeCuentaDinero(value?: string | null): CuentaDinero {
  if (
    value === "caja" ||
    value === "banco" ||
    value === "deuna" ||
    value === "boveda" ||
    value === "tarjeta_por_cobrar"
  ) {
    return value;
  }

  return assertNeverValue(value, "Cuenta de dinero");
}

export function normalizeOrigenFondo(value?: string | null): OrigenFondo {
  if (
    value === "negocio" ||
    value === "prestamo" ||
    value === "personal" ||
    value === "socio"
  ) {
    return value;
  }

  return assertNeverValue(value, "Origen de fondo");
}

export function normalizeNaturalezaMovimiento(
  value?: string | null
): NaturalezaMovimiento {
  if (
    value === "ingreso_operativo" ||
    value === "gasto_operativo" ||
    value === "aporte" ||
    value === "prestamo_recibido" ||
    value === "pago_prestamo" ||
    value === "retiro_dueno" ||
    value === "transferencia_interna"
  ) {
    return value;
  }

  return assertNeverValue(value, "Naturaleza del movimiento");
}

export function calcularEstadoPago(
  total: number,
  totalPagado: number
): EstadoPago {
  const safeTotal = Math.max(0, toMoney(total));
  const safePagado = Math.max(0, toMoney(totalPagado));

  if (safePagado <= 0) return "pendiente";
  if (safePagado >= safeTotal) return "pagada";
  return "abonada";
}

export function calcularSaldoPendiente(
  total: number,
  totalPagado: number
): number {
  return toMoney(Math.max(0, toMoney(total) - toMoney(totalPagado)));
}

export function esNaturalezaOperativa(naturaleza?: string | null): boolean {
  const value = normalizeNaturalezaMovimiento(naturaleza);

  return value === "gasto_operativo" || value === "ingreso_operativo";
}

export function afectaLiquidezReal(cuenta: CuentaDinero): boolean {
  return (
    cuenta === "caja" ||
    cuenta === "banco" ||
    cuenta === "deuna" ||
    cuenta === "boveda"
  );
}