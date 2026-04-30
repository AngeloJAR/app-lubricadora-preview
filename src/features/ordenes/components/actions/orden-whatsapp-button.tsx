"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import type { OrdenDetalle } from "@/types";
import { buildWhatsappUrlFromOrden } from "../../whatsapp";

type OrdenWhatsappButtonProps = {
  orden: OrdenDetalle;
};

type PdfUploadResponse = {
  ok?: boolean;
  pdfUrl?: string;
  error?: string;
};

export function OrdenWhatsappButton({ orden }: OrdenWhatsappButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);

      let pdfUrl = orden.pdf_url || "";

      if (!pdfUrl) {
        const response = await fetch(`/api/ordenes/${orden.id}/pdf/upload`, {
          method: "POST",
          cache: "no-store",
        });

        const rawText = await response.text();

        let result: PdfUploadResponse | null = null;

        try {
          result = JSON.parse(rawText) as PdfUploadResponse;
        } catch {
          throw new Error("Error generando PDF. Revisa el endpoint.");
        }

        if (!response.ok) {
          throw new Error(result.error || "No se pudo generar el PDF");
        }

        if (!result.pdfUrl) {
          throw new Error("No se obtuvo la URL del PDF");
        }

        pdfUrl = result.pdfUrl;
      }

      const url = await buildWhatsappUrlFromOrden(orden, pdfUrl);
      window.open(url, "_blank");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo preparar el mensaje de WhatsApp.";

      console.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-green-300 hover:bg-green-100 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      <MessageCircle className="h-4 w-4" />
      {loading ? "Preparando..." : "Enviar por WhatsApp"}
    </button>
  );
}