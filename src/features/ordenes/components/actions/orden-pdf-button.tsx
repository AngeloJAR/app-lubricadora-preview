"use client";

import { FileDown } from "lucide-react";

type OrdenPdfButtonProps = {
  ordenId: string;
};

export function OrdenPdfButton({ ordenId }: OrdenPdfButtonProps) {
  function handleOpen() {
    window.open(`/api/ordenes/${ordenId}/pdf`, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100 hover:shadow-md active:translate-y-0 sm:w-auto"
    >
      <FileDown className="h-4 w-4" />
      Ver / descargar PDF
    </button>
  );
}