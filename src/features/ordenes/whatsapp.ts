import { supabase } from "@/lib/supabase";
import type { OrdenDetalle } from "@/types";
import { getEstadoLabel } from "@/utils/orden-status";

function limpiarTelefono(telefono: string) {
  return telefono.replace(/\D/g, "");
}

function normalizarTelefonoEC(telefono: string) {
  const limpio = limpiarTelefono(telefono);

  if (!limpio) return "";

  if (limpio.startsWith("593")) return limpio;
  if (limpio.startsWith("0")) return `593${limpio.slice(1)}`;
  if (limpio.length === 9) return `593${limpio}`;

  return limpio;
}

function formatMoney(value: number | string | null | undefined) {
  return Number(value || 0).toFixed(2);
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Guayaquil",
  }).format(new Date(value));
}

async function getConfiguracionNegocio() {
  const { data } = await supabase
    .from("configuracion_taller")
    .select("nombre_negocio, mensaje_final, telefono")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    nombre_negocio: data?.nombre_negocio || "AYR Motors Mecánica",
    mensaje_final:
      data?.mensaje_final || "Gracias por confiar en nuestro taller.",
    telefono: data?.telefono || "",
  };
}

export async function buildWhatsappUrlFromOrden(
  orden: OrdenDetalle,
  pdfUrl?: string
) {
  const telefono = orden.clientes?.whatsapp || orden.clientes?.telefono || "";
  const telefonoNormalizado = normalizarTelefonoEC(telefono);

  if (!telefonoNormalizado) {
    throw new Error("El cliente no tiene teléfono o WhatsApp válido.");
  }

  const config = await getConfiguracionNegocio();

  const clienteNombre = orden.clientes
    ? `${orden.clientes.nombres} ${orden.clientes.apellidos}`.trim()
    : "cliente";

  const vehiculoTexto = orden.vehiculos
    ? `${orden.vehiculos.marca} ${orden.vehiculos.modelo} - ${orden.vehiculos.placa}`
    : "vehículo no disponible";

  const finalPdfUrl = pdfUrl || orden.pdf_url || "";

  const mensaje = [
    `Hola ${clienteNombre}, le compartimos el resumen de su orden.`,
    "",
    `*${config.nombre_negocio}*`,
    `Orden: ${orden.numero}`,
    `Fecha: ${formatDate(orden.fecha)}`,
    `Estado: ${getEstadoLabel(orden.estado)}`,
    `Vehículo: ${vehiculoTexto}`,
    `Total: $${formatMoney(orden.total)}`,
    finalPdfUrl ? "" : "",
    finalPdfUrl ? `PDF: ${finalPdfUrl}` : "",
    "",
    config.mensaje_final,
    config.telefono ? `Tel: ${config.telefono}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${telefonoNormalizado}?text=${encodeURIComponent(
    mensaje
  )}`;
}