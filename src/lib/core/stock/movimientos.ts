export type StockMovimientoTipo = "entrada" | "salida";

export type StockMovimientoInput = {
  stock_actual: number;
  cantidad: number;
  tipo: StockMovimientoTipo;
};

export type StockMovimientoResultado = {
  stock_anterior: number;
  cantidad: number;
  tipo: StockMovimientoTipo;
  stock_nuevo: number;
};

function normalize(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return value;
}

export function validarCantidadStock(cantidad: number) {
  return typeof cantidad === "number" && !Number.isNaN(cantidad) && cantidad > 0;
}

export function calcularNuevoStock(
  input: StockMovimientoInput
): StockMovimientoResultado {
  const stockActual = normalize(input.stock_actual);
  const cantidad = normalize(input.cantidad);

  if (!validarCantidadStock(cantidad)) {
    throw new Error("La cantidad del movimiento no es válida.");
  }

  let stockNuevo = stockActual;

  if (input.tipo === "entrada") {
    stockNuevo = stockActual + cantidad;
  }

  if (input.tipo === "salida") {
    stockNuevo = stockActual - cantidad;

    if (stockNuevo < 0) {
      throw new Error("Stock insuficiente para realizar la salida.");
    }
  }

  return {
    stock_anterior: stockActual,
    cantidad,
    tipo: input.tipo,
    stock_nuevo: stockNuevo,
  };
}

export function aplicarEntradaStock(stockActual: number, cantidad: number) {
  return calcularNuevoStock({
    stock_actual: stockActual,
    cantidad,
    tipo: "entrada",
  });
}

export function aplicarSalidaStock(stockActual: number, cantidad: number) {
  return calcularNuevoStock({
    stock_actual: stockActual,
    cantidad,
    tipo: "salida",
  });
}

export function hayStockDisponible(stockActual: number, cantidad: number) {
  const stock = normalize(stockActual);
  const cantidadNecesaria = normalize(cantidad);

  if (!validarCantidadStock(cantidadNecesaria)) return false;

  return stock >= cantidadNecesaria;
}