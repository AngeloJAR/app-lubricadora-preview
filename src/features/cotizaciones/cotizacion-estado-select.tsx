"use client";

import { useEffect, useState } from "react";
import { updateCotizacionEstado } from "./actions";
import {
  COTIZACION_ESTADOS,
  getCotizacionEstadoClasses,
  getCotizacionEstadoLabel,
} from "@/utils/cotizacion-status";
import type { CotizacionEstado } from "@/types";

type CotizacionEstadoSelectProps = {
  cotizacionId: string;
  estadoActual: CotizacionEstado;
};

export function CotizacionEstadoSelect({
  cotizacionId,
  estadoActual,
}: CotizacionEstadoSelectProps) {
  const [estado, setEstado] = useState<CotizacionEstado>(estadoActual);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setEstado(estadoActual);
  }, [estadoActual]);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuevoEstado = e.target.value as CotizacionEstado;
    const estadoAnterior = estado;

    setEstado(nuevoEstado);
    setError("");

    try {
      setLoading(true);
      await updateCotizacionEstado(cotizacionId, nuevoEstado);
    } catch (err) {
      setEstado(estadoAnterior);
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar el estado"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="grid gap-1">
        <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Estado de la cotización
        </label>

        <div className="relative">
          <select
            value={estado}
            onChange={handleChange}
            disabled={loading}
            className={`w-full appearance-none rounded-2xl border px-4 py-3 pr-10 text-sm font-medium outline-none transition ${getCotizacionEstadoClasses(
              estado
            )} ${loading ? "cursor-wait opacity-80" : ""}`}
          >
            {COTIZACION_ESTADOS.map((item) => (
              <option key={item} value={item}>
                {getCotizacionEstadoLabel(item)}
              </option>
            ))}
          </select>

          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-gray-500">
            {loading ? "..." : "▾"}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500">Actualizando estado...</p>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}