"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteOrdenCancelada, updateOrdenEstado } from "./actions";
import {
  ORDEN_ESTADOS,
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

export function OrdenEstadoSelect({
  ordenId,
  estadoActual,
  rol,
  onUpdated,
}: OrdenEstadoSelectProps) {
  const [estado, setEstado] = useState<OrdenEstado>(estadoActual);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setEstado(estadoActual);
  }, [estadoActual]);

  const estadosDisponibles = useMemo(() => {
    if (rol === "admin" || rol === "recepcion") {
      return ORDEN_ESTADOS;
    }

    const permitidosPorEstado: Record<OrdenEstado, OrdenEstado[]> = {
      pendiente: ["pendiente", "en_proceso"],
      en_proceso: ["en_proceso", "completada"],
      completada: ["completada"],
      entregada: ["entregada"],
      cancelada: ["cancelada"],
    };

    return permitidosPorEstado[estadoActual] ?? [estadoActual];
  }, [rol, estadoActual]);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuevoEstado = e.target.value as OrdenEstado;

    if (nuevoEstado === estado) {
      return;
    }

    setError("");

    if (nuevoEstado === "cancelada") {
      const confirmed = window.confirm(
        "La orden se marcará como cancelada y luego se borrará permanentemente. ¿Deseas continuar?"
      );

      if (!confirmed) {
        setEstado(estadoActual);
        return;
      }
    }

    const estadoAnterior = estado;
    setEstado(nuevoEstado);

    try {
      setLoading(true);
      console.log("CAMBIO DESDE SELECT", {
        ordenId,
        estadoActual: estado,
        nuevoEstado,
      });
      await updateOrdenEstado(ordenId, nuevoEstado);

      if (nuevoEstado === "cancelada") {
        await deleteOrdenCancelada(ordenId);
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

  return (
    <div className="grid gap-1">
      <select
        value={estado}
        onChange={handleChange}
        disabled={loading}
        className={`rounded-lg border px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70 ${getEstadoClasses(
          estado
        )}`}
      >
        {estadosDisponibles.map((item) => (
          <option key={item} value={item}>
            {loading && item === estado ? "Actualizando..." : getEstadoLabel(item)}
          </option>
        ))}
      </select>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}