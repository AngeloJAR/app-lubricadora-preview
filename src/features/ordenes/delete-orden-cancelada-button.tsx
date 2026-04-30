"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { deleteOrdenCancelada } from "./actions";

type DeleteOrdenCanceladaButtonProps = {
  ordenId: string;
};

export function DeleteOrdenCanceladaButton({
  ordenId,
}: DeleteOrdenCanceladaButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      "Esta acción borrará la orden cancelada permanentemente. ¿Deseas continuar?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setError("");

      await deleteOrdenCancelada(ordenId);

      router.push("/ordenes");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo borrar la orden");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        <Trash2 className="h-4 w-4" />
        {loading ? "Borrando..." : "Borrar orden cancelada"}
      </button>

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          {error}
        </div>
      ) : null}
    </div>
  );
}