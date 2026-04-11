export type OrdenEstado =
  | "pendiente"
  | "en_proceso"
  | "completada"
  | "entregada"
  | "cancelada";

export type UsuarioRol = "admin" | "recepcion" | "tecnico";

const TRANSICIONES_VALIDAS: Record<OrdenEstado, OrdenEstado[]> = {
  pendiente: ["en_proceso", "completada", "cancelada"],
  en_proceso: ["pendiente", "completada", "cancelada"],
  completada: ["pendiente", "en_proceso", "entregada", "cancelada"],
  entregada: [],
  cancelada: [],
};

const TRANSICIONES_POR_ROL: Record<
  UsuarioRol,
  Partial<Record<OrdenEstado, OrdenEstado[]>>
> = {
  admin: {
    pendiente: ["en_proceso", "completada", "cancelada"],
    en_proceso: ["pendiente", "completada", "cancelada"],
    completada: ["pendiente", "en_proceso", "entregada", "cancelada"],
  },
  recepcion: {
    pendiente: ["en_proceso", "completada", "cancelada"],
    en_proceso: ["completada"],
    completada: ["en_proceso", "entregada"],
  },
  tecnico: {
    pendiente: ["en_proceso"],
    en_proceso: ["completada"],
  },
};

export function esEstadoOrdenValido(value: string): value is OrdenEstado {
  return [
    "pendiente",
    "en_proceso",
    "completada",
    "entregada",
    "cancelada",
  ].includes(value);
}

export function obtenerTransicionesValidas(
  estadoActual: OrdenEstado
): OrdenEstado[] {
  return TRANSICIONES_VALIDAS[estadoActual] ?? [];
}

export function obtenerTransicionesPorRol(
  rol: UsuarioRol,
  estadoActual: OrdenEstado
): OrdenEstado[] {
  return TRANSICIONES_POR_ROL[rol][estadoActual] ?? [];
}

export function puedeCambiarEstadoOrden(params: {
  rol: UsuarioRol;
  estadoActual: OrdenEstado;
  nuevoEstado: OrdenEstado;
}) {
  const { rol, estadoActual, nuevoEstado } = params;

  const permitidasGenerales = obtenerTransicionesValidas(estadoActual);
  if (!permitidasGenerales.includes(nuevoEstado)) {
    return false;
  }

  const permitidasPorRol = obtenerTransicionesPorRol(rol, estadoActual);
  return permitidasPorRol.includes(nuevoEstado);
}

export function esEstadoFinalOrden(estado: OrdenEstado) {
  return estado === "entregada" || estado === "cancelada";
}

export function puedeEditarOrden(estado: OrdenEstado) {
  return estado !== "entregada" && estado !== "cancelada";
}

export function puedeEliminarOrdenCancelada(estado: OrdenEstado) {
  return estado === "cancelada";
}