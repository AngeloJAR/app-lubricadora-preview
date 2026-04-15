import { createClient } from "@/lib/supabase/server";

type CuentaDinero =
  | "caja"
  | "banco"
  | "deuna"
  | "boveda"
  | "tarjeta_por_cobrar";

type CajaMovimientoSaldoRow = {
  tipo: "ingreso" | "egreso";
  monto: number | null;
  cuenta: CuentaDinero | null;
};

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function calcularSaldoCuenta(
  movimientos: CajaMovimientoSaldoRow[],
  cuenta: CuentaDinero
) {
  return movimientos
    .filter((item) => item.cuenta === cuenta)
    .reduce((acc, item) => {
      const monto = toNumber(item.monto);
      return item.tipo === "ingreso" ? acc + monto : acc - monto;
    }, 0);
}

export async function getSaldosDineroActuales() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("caja_movimientos")
    .select("tipo, monto, cuenta");

  if (error) {
    console.error("Error obteniendo saldos actuales:", error);
    throw new Error("No se pudieron obtener los saldos actuales.");
  }

  const movimientos = (data ?? []) as CajaMovimientoSaldoRow[];

  const saldoCaja = calcularSaldoCuenta(movimientos, "caja");
  const saldoBanco = calcularSaldoCuenta(movimientos, "banco");
  const saldoDeuna = calcularSaldoCuenta(movimientos, "deuna");
  const saldoBoveda = calcularSaldoCuenta(movimientos, "boveda");
  const saldoTarjetaPorCobrar = calcularSaldoCuenta(
    movimientos,
    "tarjeta_por_cobrar"
  );

  return {
    saldoCaja,
    saldoBanco,
    saldoDeuna,
    saldoBoveda,
    saldoTarjetaPorCobrar,
    saldoTotalLiquido: saldoCaja + saldoBanco + saldoDeuna + saldoBoveda,
  };
}