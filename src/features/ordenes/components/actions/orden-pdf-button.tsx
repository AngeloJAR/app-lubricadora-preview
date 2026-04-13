"use client";

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
      className="inline-flex items-center rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
    >
      Ver / descargar PDF

    </button>
  );
}