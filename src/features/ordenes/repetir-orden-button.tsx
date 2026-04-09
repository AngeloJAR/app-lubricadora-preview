"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { repetirOrden } from "./actions";

type RepetirOrdenButtonProps = {
  ordenId: string;
};

export function RepetirOrdenButton({
  ordenId,
}: RepetirOrdenButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const nuevaOrden = await repetirOrden(ordenId);
        router.push(`/ordenes/${nuevaOrden.id}`);
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo repetir la orden.";

        window.alert(message);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
    >
      {isPending ? "Repitiendo..." : "Repetir orden"}
    </button>
  );
}