"use client";

import { useState } from "react";
import type { CotizacionDetalle } from "@/types";
import { buildWhatsappUrlFromCotizacion } from "./whatsapp";

type CotizacionWhatsappButtonProps = {
  cotizacion: CotizacionDetalle;
};

export function CotizacionWhatsappButton({
  cotizacion,
}: CotizacionWhatsappButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);

      let pdfUrl = cotizacion.pdf_url || "";

      if (!pdfUrl) {
        const response = await fetch(
          `/api/cotizaciones/${cotizacion.id}/pdf/upload`,
          {
            method: "POST",
          }
        );

        const result = (await response.json()) as {
          ok?: boolean;
          pdfUrl?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(result.error || "No se pudo generar el PDF");
        }

        pdfUrl = result.pdfUrl || "";
      }

      const url = await buildWhatsappUrlFromCotizacion(cotizacion, pdfUrl);
      window.location.href = url;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo preparar el mensaje de WhatsApp.";

      window.alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-60"
    >
      {loading ? "Preparando WhatsApp..." : "Enviar por WhatsApp"}
    </button>
  );
}