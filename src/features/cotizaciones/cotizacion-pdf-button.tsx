"use client";

type CotizacionPdfButtonProps = {
  cotizacionId: string;
};

export function CotizacionPdfButton({
  cotizacionId,
}: CotizacionPdfButtonProps) {
  return (
    <button
      type="button"
      onClick={() =>
        window.open(
          `/api/cotizaciones/${cotizacionId}/pdf`,
          "_blank",
          "noopener,noreferrer"
        )
      }
      className="inline-flex items-center rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
    >
      Ver / descargar PDF
    </button>
  );
}