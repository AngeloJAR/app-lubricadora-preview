import type { CotizacionEstado } from "@/types";

export const COTIZACION_ESTADOS: CotizacionEstado[] = [
  "borrador",
  "enviada",
  "aprobada",
  "rechazada",
  "vencida",
];

export function getCotizacionEstadoLabel(estado: CotizacionEstado) {
  switch (estado) {
    case "borrador":
      return "Borrador";
    case "enviada":
      return "Enviada";
    case "aprobada":
      return "Aprobada";
    case "rechazada":
      return "Rechazada";
    case "vencida":
      return "Vencida";
    default:
      return estado;
  }
}

export function getCotizacionEstadoClasses(estado: CotizacionEstado) {
  switch (estado) {
    case "borrador":
      return "border-gray-200 bg-gray-100 text-gray-700";
    case "enviada":
      return "border-blue-200 bg-blue-100 text-blue-700";
    case "aprobada":
      return "border-green-200 bg-green-100 text-green-700";
    case "rechazada":
      return "border-red-200 bg-red-100 text-red-700";
    case "vencida":
      return "border-yellow-200 bg-yellow-100 text-yellow-700";
    default:
      return "border-gray-200 bg-gray-100 text-gray-700";
  }
}