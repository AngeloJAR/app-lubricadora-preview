"use client";

import { useCallback, useEffect, useState } from "react";
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
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las tareas de la orden.";
      setErrorTareas(message);
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
      const message =
        err instanceof Error ? err.message : "No se pudo iniciar el trabajo.";
      setErrorAction(message);
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleFinalizarTrabajo() {
    try {
      if (!puedeFinalizarTrabajoOrdenUI(rol, orden.estado)) {
        setErrorAction("La orden no está lista para finalizar.");
        return;
      }
      if (!todasLasTareasCompletadas) {
        setErrorAction("Debes completar todas las tareas antes de finalizar.");
        return;
      }
      setLoadingAction(true);
      setErrorAction("");
      setSuccessAction("");

      await finalizarTrabajoOrden(orden.id, {
        observaciones_tecnicas: observacionesTecnicas,
        kilometraje_final: kilometrajeFinal,
        proximo_mantenimiento_fecha: proximaFecha,
        proximo_mantenimiento_km: proximoKm,
      });

      setSuccessAction("Trabajo finalizado correctamente.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo finalizar el trabajo.";
      setErrorAction(message);
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
      const message =
        err instanceof Error ? err.message : "No se pudo actualizar la tarea.";
      setErrorAction(message);
    } finally {
      setLoadingQuickTaskId(null);
    }
  }

  useEffect(() => {
    reloadTareas();
  }, [reloadTareas]);

  return (
    <div className="grid gap-4">
      <OrdenResumenCard
        orden={orden}
        showKilometrajeFinal={false}
        showTotal={false}
        rightContent={
          <>
            <div className="flex flex-wrap justify-end gap-2">
              {puedeIniciarTrabajo ?
                (<button
                  type="button"
                  onClick={handleIniciarTrabajo}
                  disabled={
                    loadingAction ||
                    tareasTotales === 0 ||
                    tareasEnProceso > 0 ||
                    orden.estado !== "pendiente"
                  } className="inline-flex rounded-xl bg-yellow-500 border border-yellow-300 px-4 py-2 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {loadingAction ? "Procesando..." : "Iniciar trabajo"}
                </button>
                ) : null}

              {puedeFinalizarTrabajo ? (
                <button
                  type="button"
                  onClick={handleFinalizarTrabajo}
                  disabled={loadingAction}
                  className="inline-flex rounded-xl bg-green-600 px-4 py-2 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {loadingAction ? "Procesando..." : "Finalizar trabajo"}
                </button>
              ) : null}
            </div>

            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="mb-2 text-sm text-gray-500">Resumen de tareas</p>
              <div className="grid gap-2 text-sm">
                <p>Total: {tareasTotales}</p>
                <p>Pendientes: {tareasPendientes}</p>
                <p>En proceso: {tareasEnProceso}</p>
                <p>Completadas: {tareasCompletadas}</p>
              </div>
            </div>
          </>
        }
      />

      {errorAction ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorAction}
        </div>
      ) : null}

      {successAction ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {successAction}
        </div>
      ) : null}

      <OrdenItemsCard
        orden={orden}
        showTotals={false}
        hidePrices
      />
      <Card title="Tareas de la orden">
        {loadingTareas ? (
          <p className="text-gray-600">Cargando tareas...</p>
        ) : errorTareas ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorTareas}
          </div>
        ) : tareas.length === 0 ? (
          <p className="text-gray-600">No hay tareas registradas para esta orden.</p>
        ) : (
          <div className="grid gap-3">
            {[...tareas]
              .sort((a, b) => {
                const orden = {
                  en_proceso: 0,
                  pendiente: 1,
                  completada: 2,
                };
                return (orden[a.estado] ?? 99) - (orden[b.estado] ?? 99);
              })
              .map((tarea) => (
                <div
                  key={tarea.id}
                  className="rounded-2xl border border-gray-200 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="grid gap-2">
                      <div>
                        <p className="text-sm text-gray-500">Tipo de tarea</p>
                        <p className="font-medium">
                          {getTipoTareaLabel(tarea.tipo_tarea)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Descripción</p>
                        <p className="font-medium">{tarea.descripcion || "-"}</p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-gray-500">Hora inicio</p>
                          <p className="font-medium">
                            {formatFechaHora(tarea.hora_inicio)}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500">Hora fin</p>
                          <p className="font-medium">
                            {formatFechaHora(tarea.hora_fin)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${getEstadoTareaClasses(
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
                            className="rounded-xl bg-blue-600 px-3 py-2 text-xs text-white disabled:opacity-60"
                          >
                            {loadingQuickTaskId === tarea.id ? "..." : "Iniciar tarea"}
                          </button>
                        ) : null}

                        {tarea.estado !== "completada" ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleActualizarTarea(tarea.id, "completada")
                            }
                            disabled={loadingQuickTaskId === tarea.id}
                            className="rounded-xl bg-green-600 px-3 py-2 text-xs text-white disabled:opacity-60"
                          >
                            {loadingQuickTaskId === tarea.id ? "..." : "Completar"}
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
          <div>
            <label className="mb-1 block text-sm font-medium">
              Observaciones técnicas
            </label>
            <textarea
              value={observacionesTecnicas}
              onChange={(e) => setObservacionesTecnicas(e.target.value)}
              className="min-h-24 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            />
          </div>

          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Kilometraje final
              </label>
              <input
                type="number"
                value={kilometrajeFinal}
                onChange={(e) => setKilometrajeFinal(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Próxima fecha
              </label>
              <input
                type="date"
                value={proximaFecha}
                onChange={(e) => setProximaFecha(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Próximo km
              </label>
              <input
                type="number"
                value={proximoKm}
                onChange={(e) => setProximoKm(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}