"use client";

import { Printer } from "lucide-react";

type PrintButtonProps = {
  ordenId: string;
};

export function PrintButton({ ordenId }: PrintButtonProps) {
  function handleClick() {
    window.open(
      `/api/ordenes/${ordenId}/pdf`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-yellow-300 hover:bg-yellow-100 hover:shadow-md active:translate-y-0 sm:w-auto"
    >
      <Printer className="h-4 w-4" />
      Generar PDF
    </button>
  );
}