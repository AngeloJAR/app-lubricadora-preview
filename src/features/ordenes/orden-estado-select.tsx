"use client";

import { useMemo, useState } from "react";
import { updateOrdenEstado } from "./actions";
import {
  getEstadoClasses,
  getEstadoLabel,
} from "@/utils/orden-status";

import type { OrdenEstado } from "@/lib/core/ordenes/reglas";

import {
  esOrdenSoloLecturaUI,
  getEstadosDisponiblesOrdenUI,
} from "@/lib/core/ui/permisos-ordenes";

type OrdenEstadoSelectProps = {
  ordenId: string;
  estadoActual: OrdenEstado;
  rol: "admin" | "recepcion" | "tecnico";
  onUpdated?: (nuevoEstado: OrdenEstado) => void;
};

export function OrdenEstadoSelect({
  ordenId,
  estadoActual,
  rol,
  onUpdated,
}: OrdenEstadoSelectProps) {
  const [estado, setEstado] = useState<OrdenEstado>(estadoActual);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const estadosDisponibles = useMemo(() => {
    return getEstadosDisponiblesOrdenUI(rol, estadoActual);
  }, [estadoActual, rol]);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuevoEstado = e.target.value as OrdenEstado;

    if (nuevoEstado === estado) return;

    const estadoAnterior = estado;

    setEstado(nuevoEstado);
    setError("");

    try {
      setLoading(true);

      if (nuevoEstado === "cancelada") {
        const confirmed = window.confirm(
          "La orden será cancelada. Podrás borrarla después solo si sigue cancelada."
        );

        if (!confirmed) {
          setEstado(estadoAnterior);
          return;
        }
      }

      await updateOrdenEstado(ordenId, nuevoEstado);
      onUpdated?.(nuevoEstado);
    } catch (err) {
      setEstado(estadoAnterior);

      const message =
        err instanceof Error ? err.message : "No se pudo actualizar el estado";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const isSoloLectura = esOrdenSoloLecturaUI(estadoActual);

  return (
    <div className="grid gap-1">
      <select
        value={estado}
        onChange={handleChange}
        disabled={loading || isSoloLectura}
        className={`rounded-lg border px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70 ${getEstadoClasses(
          estado
        )}`}
      >
        {estadosDisponibles.map((item) => (
          <option key={item} value={item}>
            {loading && item === estado
              ? "Actualizando..."
              : getEstadoLabel(item)}
          </option>
        ))}
      </select>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}