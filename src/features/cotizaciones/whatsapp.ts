import { supabase } from "@/lib/supabase";
import type { CotizacionDetalle } from "@/types";

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

export async function buildWhatsappUrlFromCotizacion(
  cotizacion: CotizacionDetalle,
  pdfUrl?: string
) {
  const telefono =
    cotizacion.clientes?.whatsapp || cotizacion.clientes?.telefono || "";
  const telefonoNormalizado = normalizarTelefonoEC(telefono);

  if (!telefonoNormalizado) {
    throw new Error("El cliente no tiene teléfono o WhatsApp válido.");
  }

  const config = await getConfiguracionNegocio();

  const clienteNombre = cotizacion.clientes
    ? `${cotizacion.clientes.nombres} ${cotizacion.clientes.apellidos}`.trim()
    : "cliente";

  const vehiculoTexto = cotizacion.vehiculos
    ? `${cotizacion.vehiculos.marca} ${cotizacion.vehiculos.modelo} - ${cotizacion.vehiculos.placa}`
    : "vehículo no disponible";

  const finalPdfUrl = pdfUrl || cotizacion.pdf_url || "";

  const mensaje = [
    `Hola ${clienteNombre}, le compartimos su cotización.`,
    "",
    `*${config.nombre_negocio}*`,
    `Cotización: ${cotizacion.numero}`,
    `Fecha: ${formatDate(cotizacion.fecha)}`,
    `Válida hasta: ${formatDate(cotizacion.validez_hasta)}`,
    `Vehículo: ${vehiculoTexto}`,
    `Total: $${formatMoney(cotizacion.total)}`,
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