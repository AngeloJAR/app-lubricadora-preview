export const ORDEN_ESTADOS = [
  "pendiente",
  "en_proceso",
  "completada",
  "entregada",
  "cancelada",
] as const;

export type OrdenEstado = (typeof ORDEN_ESTADOS)[number];

export function getEstadoLabel(estado: OrdenEstado) {
  switch (estado) {
    case "pendiente":
      return "Pendiente";
    case "en_proceso":
      return "En proceso";
    case "completada":
      return "Completada";
    case "entregada":
      return "Entregada";
    case "cancelada":
      return "Cancelada";
    default:
      return estado;
  }
}

export function getEstadoClasses(estado: OrdenEstado) {
  switch (estado) {
    case "pendiente":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "en_proceso":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "completada":
      return "bg-green-100 text-green-800 border-green-200";
    case "entregada":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "cancelada":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}