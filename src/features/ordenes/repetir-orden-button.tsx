"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Repeat2 } from "lucide-react";
import { repetirOrden } from "./actions";

type RepetirOrdenButtonProps = {
  ordenId: string;
};

export function RepetirOrdenButton({ ordenId }: RepetirOrdenButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const nuevaOrden = await repetirOrden(ordenId);
        router.push(`/ordenes/${nuevaOrden.id}`);
        router.refresh();
      } catch (error) {
        window.alert(
          error instanceof Error ? error.message : "No se pudo repetir la orden."
        );
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-100 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      <Repeat2 className="h-4 w-4" />
      {isPending ? "Repitiendo..." : "Repetir orden"}
    </button>
  );
}