import type { OrdenTareaTecnico } from "@/types";

export function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";

  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Guayaquil",
  }).format(date);
}

export function formatFechaHora(fecha?: string | null) {
  if (!fecha) return "-";

  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Guayaquil",
  }).format(date);
}

export function formatMoney(value?: number | string | null) {
  const parsed = Number(value ?? 0);
  const safeValue = Number.isFinite(parsed) ? parsed : 0;

  return `$${safeValue.toFixed(2)}`;
}

export function getEstadoTareaLabel(estado: OrdenTareaTecnico["estado"]) {
  switch (estado) {
    case "pendiente":
      return "Pendiente";
    case "en_proceso":
      return "En proceso";
    case "completada":
      return "Completada";
    default:
      return estado;
  }
}

export function getEstadoTareaClasses(estado: OrdenTareaTecnico["estado"]) {
  switch (estado) {
    case "pendiente":
      return "border-yellow-200 bg-yellow-50 text-yellow-800";
    case "en_proceso":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "completada":
      return "border-green-200 bg-green-50 text-green-800";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}