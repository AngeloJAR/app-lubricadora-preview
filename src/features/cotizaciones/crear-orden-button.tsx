"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { crearOrdenDesdeCotizacion } from "./actions";

type Props = {
  cotizacionId: string;
};

export function CrearOrdenDesdeCotizacionButton({ cotizacionId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleClick() {
    setError("");

   startTransition(async () => {
  try {
    const ordenId = await crearOrdenDesdeCotizacion(cotizacionId);
    router.push(`/ordenes/${ordenId}`);
  } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo crear la orden"
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isPending ? "Creando orden..." : "Crear orden"}
      </button>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}