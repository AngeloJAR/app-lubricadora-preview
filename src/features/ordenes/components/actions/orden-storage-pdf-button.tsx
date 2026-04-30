"use client";

import { useState } from "react";
import { CloudUpload } from "lucide-react";

type OrdenStoragePdfButtonProps = {
  ordenId: string;
};

export function OrdenStoragePdfButton({
  ordenId,
}: OrdenStoragePdfButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);

      const response = await fetch(`/api/ordenes/${ordenId}/pdf/upload`, {
        method: "POST",
      });

      const result = (await response.json()) as {
        ok?: boolean;
        pdfUrl?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "No se pudo guardar el PDF");
      }
      
      console.log("PDF guardado en:", result.pdfUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el PDF.";

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
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      <CloudUpload className="h-4 w-4" />
      {loading ? "Guardando..." : "Guardar en Storage"}
    </button>
  );
}