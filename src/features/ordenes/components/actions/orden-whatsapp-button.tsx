"use client";

import { useState } from "react";
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
        console.log("PDF upload raw response:", rawText);

        let result: PdfUploadResponse | null = null;

        try {
          result = JSON.parse(rawText) as PdfUploadResponse;
        } catch {
          throw new Error(
            "La ruta del PDF devolvió HTML o texto inválido. Revisa el error del servidor en /api/ordenes/[id]/pdf/upload."
          );
        }

        if (!response.ok) {
          throw new Error(result.error || "No se pudo generar el PDF");
        }

        if (!result.pdfUrl) {
          throw new Error("La API no devolvió la URL del PDF");
        }

        pdfUrl = result.pdfUrl;
      }

      const url = await buildWhatsappUrlFromOrden(orden, pdfUrl);
      window.location.href = url;
    } catch (error: unknown) {
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
      className="inline-flex items-center rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Preparando WhatsApp..." : "Enviar por WhatsApp"}
    </button>
  );
}