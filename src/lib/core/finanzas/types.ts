export type MetodoPago =
  | "efectivo"
  | "transferencia"
  | "deuna"
  | "tarjeta"
  | "mixto";
export type CuentaDinero =
  | "caja"
  | "banco"
  | "deuna"
  | "boveda"
  | "tarjeta_por_cobrar";

export type OrigenFondo =
  | "negocio"
  | "prestamo"
  | "personal"
  | "socio";

export type NaturalezaMovimiento =
  | "ingreso_operativo"
  | "gasto_operativo"
  | "aporte"
  | "prestamo_recibido"
  | "pago_prestamo"
  | "retiro_dueno"
  | "transferencia_interna";

export type EstadoPago = "pendiente" | "abonada" | "pagada";

export type TipoMovimientoDinero = "ingreso" | "egreso";

export type ResumenLiquidez = {
  caja: number;
  banco: number;
  deuna: number;
  boveda: number;
  tarjeta_por_cobrar: number;
  total_liquido: number;
};

export type ResumenResultado = {
  ventas_devengadas: number;
  cobros_recibidos: number;
  costo_ventas: number;
  gastos_operativos: number;
  utilidad_operativa: number;
  margen_operativo: number;
};