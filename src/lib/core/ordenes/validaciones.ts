import type { OrdenEstado } from "@/lib/core/ordenes/estados";
import { esEstadoOrdenValido } from "@/lib/core/ordenes/estados";
import type { OrdenItemCore } from "@/lib/core/ordenes/calculos";

export type ValidacionResultado = {
  ok: boolean;
  errores: string[];
};

function isPositiveNumber(value: number) {
  return typeof value === "number" && !Number.isNaN(value) && value > 0;
}

function isNonNegativeNumber(value: number) {
  return typeof value === "number" && !Number.isNaN(value) && value >= 0;
}

export function validarItemOrden(item: OrdenItemCore): ValidacionResultado {
  const errores: string[] = [];

  if (item.tipo_item !== "servicio" && item.tipo_item !== "producto") {
    errores.push("El tipo de item no es válido.");
  }

  if (!isPositiveNumber(item.cantidad)) {
    errores.push("La cantidad debe ser mayor a 0.");
  }

  if (!isNonNegativeNumber(item.precio_unitario)) {
    errores.push("El precio unitario no es válido.");
  }

  return {
    ok: errores.length === 0,
    errores,
  };
}

export function validarItemsOrden(items: OrdenItemCore[]): ValidacionResultado {
  const errores: string[] = [];

  if (!Array.isArray(items) || items.length === 0) {
    errores.push("La orden debe tener al menos un item.");
  }

  items.forEach((item, index) => {
    const resultado = validarItemOrden(item);

    if (!resultado.ok) {
      resultado.errores.forEach((error) => {
        errores.push(`Item ${index + 1}: ${error}`);
      });
    }
  });

  return {
    ok: errores.length === 0,
    errores,
  };
}

export function validarDescuentoOrden(descuento: number | null | undefined): ValidacionResultado {
  const errores: string[] = [];

  if (descuento == null) {
    return { ok: true, errores };
  }

  if (!isNonNegativeNumber(descuento)) {
    errores.push("El descuento no es válido.");
  }

  return {
    ok: errores.length === 0,
    errores,
  };
}

export function validarEstadoOrden(value: string): value is OrdenEstado {
  return esEstadoOrdenValido(value);
}

export function validarCambioEstadoOrden(params: {
  estadoActual: string;
  nuevoEstado: string;
}): ValidacionResultado {
  const errores: string[] = [];

  if (!esEstadoOrdenValido(params.estadoActual)) {
    errores.push("El estado actual no es válido.");
  }

  if (!esEstadoOrdenValido(params.nuevoEstado)) {
    errores.push("El nuevo estado no es válido.");
  }

  if (
    esEstadoOrdenValido(params.estadoActual) &&
    esEstadoOrdenValido(params.nuevoEstado) &&
    params.estadoActual === params.nuevoEstado
  ) {
    errores.push("La orden ya tiene ese estado.");
  }

  return {
    ok: errores.length === 0,
    errores,
  };
}