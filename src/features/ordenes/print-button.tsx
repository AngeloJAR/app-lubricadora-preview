"use client";

type PrintButtonProps = {
  ordenId: string;
};

export function PrintButton({ ordenId }: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() =>
        window.open(`/api/ordenes/${ordenId}/pdf`, "_blank", "noopener,noreferrer")
      }
      className="inline-flex items-center rounded-xl bg-yellow-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-600"
    >
      Generar PDF
    </button>
  );
}