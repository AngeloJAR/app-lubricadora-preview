"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Gauge,
  Play,
  Save,
  Wrench,
} from "lucide-react";
import { Card } from "@/components/ui/card";

import type { OrdenDetalle, OrdenTareaTecnico } from "@/types";

import {
  finalizarTrabajoOrden,
  getTareasByOrden,
  iniciarTrabajoOrden,
  updateTareaOrdenEstado,
} from "./actions";

import { getTipoTareaLabel } from "./constants";

import {
  OrdenResumenCard,
  OrdenItemsCard,
  formatFechaHora,
  getEstadoTareaClasses,
  getEstadoTareaLabel,
} from "./orden-detalle-shared";

import {
  puedeFinalizarTrabajoOrdenUI,
  puedeIniciarTrabajoOrdenUI,
} from "@/lib/core/ui/permisos-ordenes";

type OrdenTareaDetalle = OrdenTareaTecnico & {
  tecnico: {
    id: string;
    nombre: string;
  } | null;
};

type OrdenDetalleTecnicoViewProps = {
  orden: OrdenDetalle;
};

function StatBox({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "yellow" | "blue" | "green";
}) {
  const classes = {
    default: "border-gray-200 bg-gray-50 text-gray-900",
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-green-200 bg-green-50 text-green-700",
  };

  return (
    <div className={`rounded-2xl border p-3 ${classes[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold">{value}</p>
    </div>
  );
}

export function OrdenDetalleTecnicoView({
  orden,
}: OrdenDetalleTecnicoViewProps) {
  const [loadingAction, setLoadingAction] = useState(false);
  const [errorAction, setErrorAction] = useState("");
  const [successAction, setSuccessAction] = useState("");

  const [tareas, setTareas] = useState<OrdenTareaDetalle[]>([]);
  const [loadingTareas, setLoadingTareas] = useState(true);
  const [errorTareas, setErrorTareas] = useState("");

  const [loadingQuickTaskId, setLoadingQuickTaskId] = useState<string | null>(
    null
  );

  const [observacionesTecnicas, setObservacionesTecnicas] = useState(
    orden.observaciones_tecnicas || ""
  );
  const [kilometrajeFinal, setKilometrajeFinal] = useState(
    orden.kilometraje_final ? String(orden.kilometraje_final) : ""
  );
  const [proximaFecha, setProximaFecha] = useState(
    orden.proximo_mantenimiento_fecha || ""
  );
  const [proximoKm, setProximoKm] = useState(
    orden.proximo_mantenimiento_km ? String(orden.proximo_mantenimiento_km) : ""
  );

  const tareasTotales = tareas.length;
  const tareasCompletadas = tareas.filter(
    (tarea) => tarea.estado === "completada"
  ).length;
  const tareasPendientes = tareas.filter(
    (tarea) => tarea.estado === "pendiente"
  ).length;
  const tareasEnProceso = tareas.filter(
    (tarea) => tarea.estado === "en_proceso"
  ).length;

  const progresoTareas =
    tareasTotales > 0 ? (tareasCompletadas / tareasTotales) * 100 : 0;

  const rol = "tecnico" as const;

  const todasLasTareasCompletadas =
    tareasTotales > 0 && tareasCompletadas === tareasTotales;

  const puedeIniciarTrabajo = puedeIniciarTrabajoOrdenUI(rol, orden.estado);

  const puedeFinalizarTrabajo =
    puedeFinalizarTrabajoOrdenUI(rol, orden.estado) &&
    todasLasTareasCompletadas;

  const reloadTareas = useCallback(async () => {
    try {
      setLoadingTareas(true);
      setErrorTareas("");

      const data = await getTareasByOrden(orden.id);
      setTareas(data as OrdenTareaDetalle[]);
    } catch (err) {
      setErrorTareas(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las tareas de la orden."
      );
    } finally {
      setLoadingTareas(false);
    }
  }, [orden.id]);

  async function handleIniciarTrabajo() {
    try {
      setLoadingAction(true);
      setErrorAction("");
      setSuccessAction("");

      if (!puedeIniciarTrabajoOrdenUI(rol, orden.estado)) {
        setErrorAction("La orden no está lista para iniciar.");
        return;
      }

      await iniciarTrabajoOrden(orden.id);
      await reloadTareas();

      setSuccessAction("Trabajo iniciado correctamente.");
    } catch (err) {
      setErrorAction(
        err instanceof Error ? err.message : "No se pudo iniciar el trabajo."
      );
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleFinalizarTrabajo() {
    try {
      setErrorAction("");
      setSuccessAction("");

      if (!puedeFinalizarTrabajoOrdenUI(rol, orden.estado)) {
        setErrorAction("La orden no está lista para finalizar.");
        return;
      }

      if (!todasLasTareasCompletadas) {
        setErrorAction("Debes completar todas las tareas antes de finalizar.");
        return;
      }

      setLoadingAction(true);

      await finalizarTrabajoOrden(orden.id, {
        observaciones_tecnicas: observacionesTecnicas,
        kilometraje_final: kilometrajeFinal,
        proximo_mantenimiento_fecha: proximaFecha,
        proximo_mantenimiento_km: proximoKm,
      });

      setSuccessAction("Trabajo finalizado correctamente.");
    } catch (err) {
      setErrorAction(
        err instanceof Error ? err.message : "No se pudo finalizar el trabajo."
      );
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleActualizarTarea(
    tareaId: string,
    nuevoEstado: OrdenTareaTecnico["estado"]
  ) {
    try {
      setLoadingQuickTaskId(tareaId);
      setErrorAction("");
      setSuccessAction("");

      await updateTareaOrdenEstado(tareaId, nuevoEstado);
      await reloadTareas();

      if (nuevoEstado === "completada") {
        setSuccessAction("Tarea completada correctamente.");
      } else if (nuevoEstado === "en_proceso") {
        setSuccessAction("Tarea iniciada correctamente.");
      } else {
        setSuccessAction("Tarea actualizada correctamente.");
      }
    } catch (err) {
      setErrorAction(
        err instanceof Error ? err.message : "No se pudo actualizar la tarea."
      );
    } finally {
      setLoadingQuickTaskId(null);
    }
  }

  useEffect(() => {
    reloadTareas();
  }, [reloadTareas]);

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <OrdenResumenCard
          orden={orden}
          showKilometrajeFinal={false}
          showTotal={false}
        />

        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-bold text-gray-800">
              Trabajo técnico
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Total" value={tareasTotales} />
            <StatBox label="Pendientes" value={tareasPendientes} tone="yellow" />
            <StatBox label="En proceso" value={tareasEnProceso} tone="blue" />
            <StatBox label="Completadas" value={tareasCompletadas} tone="green" />
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Progreso
              </span>
              <span className="text-xs font-bold text-gray-700">
                {Math.round(progresoTareas)}%
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${progresoTareas}%` }}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {puedeIniciarTrabajo ? (
              <button
                type="button"
                onClick={handleIniciarTrabajo}
                disabled={
                  loadingAction ||
                  tareasTotales === 0 ||
                  tareasEnProceso > 0 ||
                  orden.estado !== "pendiente"
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-yellow-300 bg-yellow-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Play className="h-4 w-4" />
                {loadingAction ? "Procesando..." : "Iniciar trabajo"}
              </button>
            ) : null}

            {puedeFinalizarTrabajo ? (
              <button
                type="button"
                onClick={handleFinalizarTrabajo}
                disabled={loadingAction}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {loadingAction ? "Procesando..." : "Finalizar trabajo"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {errorAction ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5" />
          {errorAction}
        </div>
      ) : null}

      {successAction ? (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5" />
          {successAction}
        </div>
      ) : null}

      <OrdenItemsCard orden={orden} showTotals={false} hidePrices />

      <Card title="Tareas de la orden">
        {loadingTareas ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-600">
            Cargando tareas...
          </div>
        ) : errorTareas ? (
          <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            {errorTareas}
          </div>
        ) : tareas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
            No hay tareas registradas para esta orden.
          </div>
        ) : (
          <div className="grid gap-3">
            {[...tareas]
              .sort((a, b) => {
                const prioridad = {
                  en_proceso: 0,
                  pendiente: 1,
                  completada: 2,
                };

                return (
                  (prioridad[a.estado] ?? 99) -
                  (prioridad[b.estado] ?? 99)
                );
              })
              .map((tarea) => (
                <div
                  key={tarea.id}
                  className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex gap-3">
                      <div className="rounded-2xl bg-gray-50 p-3 text-gray-500">
                        <Wrench className="h-5 w-5" />
                      </div>

                      <div className="grid gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Tipo de tarea
                          </p>
                          <p className="font-bold text-gray-900">
                            {getTipoTareaLabel(tarea.tipo_tarea)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Descripción
                          </p>
                          <p className="font-medium text-gray-700">
                            {tarea.descripcion || "-"}
                          </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                              <Clock className="h-3.5 w-3.5" />
                              Hora inicio
                            </p>
                            <p className="font-medium text-gray-700">
                              {formatFechaHora(tarea.hora_inicio)}
                            </p>
                          </div>

                          <div>
                            <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                              <Clock className="h-3.5 w-3.5" />
                              Hora fin
                            </p>
                            <p className="font-medium text-gray-700">
                              {formatFechaHora(tarea.hora_fin)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 md:min-w-[180px]">
                      <span
                        className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-bold ${getEstadoTareaClasses(
                          tarea.estado
                        )}`}
                      >
                        {getEstadoTareaLabel(tarea.estado)}
                      </span>

                      <div className="flex flex-wrap gap-2">
                        {tarea.estado === "pendiente" ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleActualizarTarea(tarea.id, "en_proceso")
                            }
                            disabled={loadingQuickTaskId === tarea.id}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                          >
                            <Play className="h-4 w-4" />
                            {loadingQuickTaskId === tarea.id
                              ? "..."
                              : "Iniciar"}
                          </button>
                        ) : null}

                        {tarea.estado !== "completada" ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleActualizarTarea(tarea.id, "completada")
                            }
                            disabled={loadingQuickTaskId === tarea.id}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {loadingQuickTaskId === tarea.id
                              ? "..."
                              : "Completar"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>

      <Card title="Cierre técnico">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-gray-500" />
              <label className="text-sm font-bold text-gray-700">
                Observaciones técnicas
              </label>
            </div>

            <textarea
              value={observacionesTecnicas}
              onChange={(e) => setObservacionesTecnicas(e.target.value)}
              className="min-h-40 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
              placeholder="Describe trabajos realizados, novedades, recomendaciones o pendientes."
            />
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Gauge className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-bold text-gray-700">
                  Kilometraje final
                </label>
              </div>

              <input
                type="number"
                value={kilometrajeFinal}
                onChange={(e) => setKilometrajeFinal(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none transition focus:border-gray-400"
              />
            </div>

            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-bold text-gray-700">
                  Próxima fecha
                </label>
              </div>

              <input
                type="date"
                value={proximaFecha}
                onChange={(e) => setProximaFecha(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none transition focus:border-gray-400"
              />
            </div>

            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Gauge className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-bold text-gray-700">
                  Próximo km
                </label>
              </div>

              <input
                type="number"
                value={proximoKm}
                onChange={(e) => setProximoKm(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none transition focus:border-gray-400"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleFinalizarTrabajo}
            disabled={loadingAction || !puedeFinalizarTrabajo}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <Save className="h-4 w-4" />
            {loadingAction ? "Guardando..." : "Guardar cierre técnico"}
          </button>
        </div>
      </Card>
    </div>
  );
}