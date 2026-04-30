"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CarFront,
  CheckCircle2,
  Clock,
  Eye,
  Play,
  UserRound,
  Wrench,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getTipoTareaLabel } from "./constants";

const supabase = createClient();

type ClienteBasico = {
  nombre: string | null;
  telefono?: string | null;
} | null;

type VehiculoBasico = {
  placa: string | null;
  marca: string | null;
  modelo: string | null;
} | null;

type OrdenTecnico = {
  id: string;
  estado: string;
  cliente: ClienteBasico;
  vehiculo: VehiculoBasico;
};

type TareaTecnicoRow = {
  id: string;
  orden_id: string;
  tecnico_id: string;
  tipo_tarea: string;
  descripcion: string | null;
  estado: "pendiente" | "en_proceso" | "completada";
  hora_inicio: string | null;
  hora_fin: string | null;
};

type ResumenOrden = {
  propias: TareaTecnicoRow[];
  total: number;
  completadas: number;
};

type MisOrdenesViewProps = {
  ordenes: OrdenTecnico[];
};

function getEstadoBadge(estado: string) {
  if (estado === "en_proceso") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (estado === "pendiente") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (estado === "completada") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-600";
}

function getTareaBadge(estado: TareaTecnicoRow["estado"]) {
  if (estado === "en_proceso") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (estado === "completada") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  return "border-yellow-200 bg-yellow-50 text-yellow-700";
}

export function MisOrdenesView({ ordenes }: MisOrdenesViewProps) {
  const [userId, setUserId] = useState("");
  const [resumenPorOrden, setResumenPorOrden] = useState<
    Record<string, ResumenOrden>
  >({});
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadResumen = useCallback(async () => {
    try {
      setLoadingResumen(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("No autorizado.");
        return;
      }

      setUserId(user.id);

      const ordenIds = ordenes.map((orden) => orden.id);

      if (ordenIds.length === 0) {
        setResumenPorOrden({});
        return;
      }

      const [
        { data: propias, error: propiasError },
        { data: todas, error: todasError },
      ] = await Promise.all([
        supabase
          .from("ordenes_tareas_tecnicos")
          .select(
            "id, orden_id, tecnico_id, tipo_tarea, descripcion, estado, hora_inicio, hora_fin"
          )
          .in("orden_id", ordenIds)
          .eq("tecnico_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("ordenes_tareas_tecnicos")
          .select("id, orden_id, estado")
          .in("orden_id", ordenIds),
      ]);

      if (propiasError) throw new Error(propiasError.message);
      if (todasError) throw new Error(todasError.message);

      const map: Record<string, ResumenOrden> = {};

      for (const ordenId of ordenIds) {
        const tareasPropias = ((propias ?? []) as TareaTecnicoRow[]).filter(
          (tarea) => tarea.orden_id === ordenId
        );

        const tareasTodas = ((todas ?? []) as {
          id: string;
          orden_id: string;
          estado: "pendiente" | "en_proceso" | "completada";
        }[]).filter((tarea) => tarea.orden_id === ordenId);

        map[ordenId] = {
          propias: tareasPropias,
          total: tareasTodas.length,
          completadas: tareasTodas.filter(
            (tarea) => tarea.estado === "completada"
          ).length,
        };
      }

      setResumenPorOrden(map);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el resumen de tareas."
      );
    } finally {
      setLoadingResumen(false);
    }
  }, [ordenes]);

  async function recalcularEstadoOrdenCliente(ordenId: string) {
    const { data: ordenActual, error: ordenActualError } = await supabase
      .from("ordenes_trabajo")
      .select("id, estado, hora_inicio, hora_fin")
      .eq("id", ordenId)
      .single();

    if (ordenActualError || !ordenActual) {
      throw new Error("No se pudo validar la orden");
    }

    const { data: tareasData, error: tareasError } = await supabase
      .from("ordenes_tareas_tecnicos")
      .select("id, estado")
      .eq("orden_id", ordenId);

    if (tareasError) throw new Error(tareasError.message);

    const tareas = (tareasData ?? []) as {
      id: string;
      estado: "pendiente" | "en_proceso" | "completada";
    }[];

    if (tareas.length === 0) return;

    const todasCompletadas = tareas.every(
      (tarea) => tarea.estado === "completada"
    );

    const algunaIniciada = tareas.some(
      (tarea) => tarea.estado === "en_proceso" || tarea.estado === "completada"
    );

    if (todasCompletadas) {
      const now = new Date().toISOString();

      const payload: {
        estado: "completada";
        hora_fin: string;
        hora_inicio?: string;
      } = {
        estado: "completada",
        hora_fin: now,
      };

      if (!ordenActual.hora_inicio) {
        payload.hora_inicio = now;
      }

      const { error } = await supabase
        .from("ordenes_trabajo")
        .update(payload)
        .eq("id", ordenId);

      if (error) throw new Error(error.message);
      return;
    }

    if (algunaIniciada) {
      const payload: {
        estado: "en_proceso";
        hora_inicio?: string;
        hora_fin?: null;
      } = {
        estado: "en_proceso",
      };

      if (!ordenActual.hora_inicio) {
        payload.hora_inicio = new Date().toISOString();
      }

      if (ordenActual.hora_fin) {
        payload.hora_fin = null;
      }

      const { error } = await supabase
        .from("ordenes_trabajo")
        .update(payload)
        .eq("id", ordenId);

      if (error) throw new Error(error.message);
      return;
    }

    const { error } = await supabase
      .from("ordenes_trabajo")
      .update({
        estado: "pendiente",
        hora_fin: null,
      })
      .eq("id", ordenId);

    if (error) throw new Error(error.message);
  }

  async function cambiarEstadoTarea(
    tarea: TareaTecnicoRow,
    nuevoEstado: "pendiente" | "en_proceso" | "completada"
  ) {
    try {
      setLoadingTaskId(tarea.id);
      setError("");

      const payload: {
        estado: "pendiente" | "en_proceso" | "completada";
        hora_inicio?: string;
        hora_fin?: string | null;
      } = {
        estado: nuevoEstado,
      };

      if (nuevoEstado === "en_proceso" && !tarea.hora_inicio) {
        payload.hora_inicio = new Date().toISOString();
      }

      if (nuevoEstado === "completada") {
        if (!tarea.hora_inicio) {
          payload.hora_inicio = new Date().toISOString();
        }

        payload.hora_fin = new Date().toISOString();
      }

      if (nuevoEstado === "pendiente") {
        payload.hora_fin = null;
      }

      const { error: tareaError } = await supabase
        .from("ordenes_tareas_tecnicos")
        .update(payload)
        .eq("id", tarea.id)
        .eq("tecnico_id", userId);

      if (tareaError) throw new Error(tareaError.message);

      await recalcularEstadoOrdenCliente(tarea.orden_id);
      await loadResumen();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar la tarea."
      );
    } finally {
      setLoadingTaskId(null);
    }
  }

  useEffect(() => {
    loadResumen();
  }, [loadResumen]);

  useEffect(() => {
    const channel = supabase
      .channel(`mis-ordenes-realtime-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ordenes_tareas_tecnicos",
        },
        async () => {
          await loadResumen();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ordenes_tecnicos",
        },
        async () => {
          await loadResumen();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ordenes_trabajo",
        },
        async () => {
          await loadResumen();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadResumen]);

  const ordenesOrdenadas = useMemo(() => {
    const prioridad: Record<string, number> = {
      en_proceso: 1,
      pendiente: 2,
      completada: 3,
      entregada: 4,
      cancelada: 5,
    };

    return [...ordenes]
      .filter((orden) => orden.estado !== "entregada")
      .sort((a, b) => (prioridad[a.estado] ?? 99) - (prioridad[b.estado] ?? 99));
  }, [ordenes]);

  if (!ordenesOrdenadas.length) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <Wrench className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-3 text-sm font-semibold text-gray-700">
          No tienes órdenes asignadas.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Mis órdenes</h2>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona tus tareas: inicia y finaliza según avances.
        </p>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5" />
          {error}
        </div>
      ) : null}

      {ordenesOrdenadas.map((orden) => {
        const resumen = resumenPorOrden[orden.id] ?? {
          propias: [],
          total: 0,
          completadas: 0,
        };

        const todasCompletadas =
          resumen.total > 0 && resumen.completadas === resumen.total;

        const progreso =
          resumen.total > 0 ? (resumen.completadas / resumen.total) * 100 : 0;

        return (
          <section
            key={orden.id}
            className={`overflow-hidden rounded-3xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              orden.estado === "en_proceso"
                ? "border-blue-300 bg-blue-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="grid gap-4 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-2xl font-extrabold tracking-wide text-gray-900">
                      {orden.vehiculo?.placa ?? "Sin placa"}
                    </p>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize ${getEstadoBadge(
                        orden.estado
                      )}`}
                    >
                      {orden.estado.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {orden.cliente?.nombre ?? "Sin cliente"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CarFront className="h-4 w-4 text-gray-400" />
                      <span>
                        {orden.vehiculo?.marca ?? ""}{" "}
                        {orden.vehiculo?.modelo ?? ""}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/ordenes/${orden.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300 bg-yellow-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                >
                  <Eye className="h-4 w-4" />
                  Ver detalle
                </Link>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      Avance de la orden
                    </p>
                    <p className="text-xs text-gray-500">
                      Mis tareas:{" "}
                      {loadingResumen ? "..." : resumen.propias.length}
                    </p>
                  </div>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                    {loadingResumen
                      ? "..."
                      : `${resumen.completadas}/${resumen.total}`}
                  </span>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${progreso}%` }}
                  />
                </div>

                {todasCompletadas ? (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Todas las tareas completadas
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3">
                {resumen.propias.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-4 text-sm text-gray-500">
                    No tienes tareas asignadas todavía en esta orden.
                  </div>
                ) : (
                  [...resumen.propias]
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
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-gray-50 p-3 text-gray-500">
                              <Wrench className="h-5 w-5" />
                            </div>

                            <div>
                              <p className="font-bold text-gray-900">
                                {getTipoTareaLabel(tarea.tipo_tarea)}
                              </p>
                              <p className="mt-1 text-sm text-gray-500">
                                {tarea.descripcion || "Sin descripción"}
                              </p>

                              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                                <Clock className="h-4 w-4" />
                                {tarea.estado.replaceAll("_", " ")}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize ${getTareaBadge(
                                tarea.estado
                              )}`}
                            >
                              {tarea.estado.replaceAll("_", " ")}
                            </span>

                            {tarea.estado === "pendiente" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  cambiarEstadoTarea(tarea, "en_proceso")
                                }
                                disabled={loadingTaskId === tarea.id}
                                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                              >
                                <Play className="h-4 w-4" />
                                {loadingTaskId === tarea.id
                                  ? "..."
                                  : "Iniciar"}
                              </button>
                            ) : null}

                            {tarea.estado === "en_proceso" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  cambiarEstadoTarea(tarea, "completada")
                                }
                                disabled={loadingTaskId === tarea.id}
                                className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-60"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                {loadingTaskId === tarea.id
                                  ? "..."
                                  : "Completar"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}