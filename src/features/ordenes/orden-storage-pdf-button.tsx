"use client";

import { useState } from "react";

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

      window.alert("PDF guardado correctamente en Storage.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el PDF.";

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
      className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
    >
      {loading ? "Guardando PDF..." : "Guardar PDF en Storage"}
    </button>
  );
}