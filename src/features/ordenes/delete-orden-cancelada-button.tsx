"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
      const message =
        err instanceof Error ? err.message : "No se pudo borrar la orden";
      setError(message);
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
        className="inline-flex rounded-xl border border-red-300 bg-red-600 px-4 py-2 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Borrando..." : "Borrar orden cancelada"}
      </button>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}