"use client";

import { useMemo, useState } from "react";
import { cancelarYEliminarOrden, updateOrdenEstado } from "./actions";
import {
  getEstadoClasses,
  getEstadoLabel,
  type OrdenEstado,
} from "@/utils/orden-status";

type OrdenEstadoSelectProps = {
  ordenId: string;
  estadoActual: OrdenEstado;
  rol: "admin" | "recepcion" | "tecnico";
  onUpdated?: (nuevoEstado: OrdenEstado) => void;
};

function getEstadosDisponibles(
  estadoActual: OrdenEstado,
  rol: "admin" | "recepcion" | "tecnico"
): OrdenEstado[] {
  if (rol === "tecnico") {
    const permitidosTecnico: Record<OrdenEstado, OrdenEstado[]> = {
      pendiente: ["pendiente", "en_proceso"],
      en_proceso: ["en_proceso", "completada"],
      completada: ["completada"],
      entregada: ["entregada"],
      cancelada: ["cancelada"],
    };

    return permitidosTecnico[estadoActual] ?? [estadoActual];
  }

  const permitidosAdminRecepcion: Record<OrdenEstado, OrdenEstado[]> = {
    pendiente: ["pendiente", "en_proceso", "cancelada"],
    en_proceso: ["pendiente", "en_proceso", "completada", "cancelada"],
    completada: [
      "pendiente",
      "en_proceso",
      "completada",
      "entregada",
      "cancelada",
    ],
    entregada: ["entregada"],
    cancelada: ["cancelada"],
  };

  return permitidosAdminRecepcion[estadoActual] ?? [estadoActual];
}

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
    return getEstadosDisponibles(estadoActual, rol);
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
          "La orden se eliminará permanentemente. ¿Deseas continuar?"
        );

        if (!confirmed) {
          setEstado(estadoAnterior);
          return;
        }

        await cancelarYEliminarOrden(ordenId);
      } else {
        await updateOrdenEstado(ordenId, nuevoEstado);
      }

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

  const isSoloLectura =
    estadoActual === "entregada" || estadoActual === "cancelada";

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