import { calcularTotalesOrden } from "@/lib/core/ordenes/calculos";
import {
  validarItemsOrden,
  validarDescuentoOrden,
  validarCambioEstadoOrden,
} from "@/lib/core/ordenes/validaciones";
import {
  puedeCambiarEstadoOrden,
  type OrdenEstado,
  type UsuarioRol,
} from "@/lib/core/ordenes/estados";

import { mapOrdenToCoreInput } from "./orden.mapper";

type OrdenItemInput = {
  tipo_item: "servicio" | "producto";
  servicio_id?: string | null;
  producto_id?: string | null;
  nombre_item: string;
  cantidad: number | string | null;
  precio_unitario: number | string | null;
  total?: number | string | null;
};

type OrdenInputBase = {
  items: OrdenItemInput[];
  descuento?: number | null;
  recargo?: number | null;
};

function normalizarInputOrden(input: OrdenInputBase) {
  return {
    ...input,
    items: input.items.map((item) => ({
      ...item,
      cantidad:
        item.cantidad === null || item.cantidad === undefined || item.cantidad === ""
          ? null
          : Number(item.cantidad),
      precio_unitario:
        item.precio_unitario === null ||
        item.precio_unitario === undefined ||
        item.precio_unitario === ""
          ? null
          : Number(item.precio_unitario),
      total:
        item.total === null || item.total === undefined || item.total === ""
          ? null
          : Number(item.total),
    })),
  };
}

export function procesarTotalesOrden(input: {
  items: OrdenItemInput[];
  descuento?: number | null;
  recargo?: number | null;
}) {
  const inputNormalizado = normalizarInputOrden(input);
  const coreInput = mapOrdenToCoreInput(inputNormalizado);

  const validacionItems = validarItemsOrden(coreInput.items);
  if (!validacionItems.ok) {
    throw new Error(validacionItems.errores.join(" | "));
  }

  const validacionDescuento = validarDescuentoOrden(coreInput.descuento);
  if (!validacionDescuento.ok) {
    throw new Error(validacionDescuento.errores.join(" | "));
  }

  return calcularTotalesOrden(coreInput);
}

export function validarOrdenAntesDeGuardar(input: {
  items: OrdenItemInput[];
  descuento?: number | null;
}) {
  const inputNormalizado = normalizarInputOrden(input);
  const coreInput = mapOrdenToCoreInput(inputNormalizado);

  const errores: string[] = [];

  const validacionItems = validarItemsOrden(coreInput.items);
  if (!validacionItems.ok) {
    errores.push(...validacionItems.errores);
  }

  const validacionDescuento = validarDescuentoOrden(coreInput.descuento);
  if (!validacionDescuento.ok) {
    errores.push(...validacionDescuento.errores);
  }

  return {
    ok: errores.length === 0,
    errores,
  };
}

export function validarTransicionEstadoOrden(params: {
  rol: UsuarioRol;
  estadoActual: string;
  nuevoEstado: string;
}) {
  const errores: string[] = [];

  const validacion = validarCambioEstadoOrden({
    estadoActual: params.estadoActual,
    nuevoEstado: params.nuevoEstado,
  });

  if (!validacion.ok) {
    errores.push(...validacion.errores);
    return { ok: false, errores };
  }

  const puede = puedeCambiarEstadoOrden({
    rol: params.rol,
    estadoActual: params.estadoActual as OrdenEstado,
    nuevoEstado: params.nuevoEstado as OrdenEstado,
  });

  if (!puede) {
    errores.push("No tienes permiso para cambiar a ese estado.");
  }

  return {
    ok: errores.length === 0,
    errores,
  };
}