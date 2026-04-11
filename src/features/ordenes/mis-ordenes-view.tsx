"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
    return "bg-blue-100 text-blue-700";
  }

  if (estado === "pendiente") {
    return "bg-amber-100 text-amber-700";
  }

  if (estado === "completada") {
    return "bg-green-100 text-green-700";
  }

  return "bg-gray-100 text-gray-600";
}

export function MisOrdenesView({ ordenes }: MisOrdenesViewProps) {
  const [userId, setUserId] = useState<string>("");
  const [resumenPorOrden, setResumenPorOrden] = useState<Record<string, ResumenOrden>>(
    {}
  );
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

      const [{ data: propias, error: propiasError }, { data: todas, error: todasError }] =
        await Promise.all([
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

      if (propiasError) {
        throw new Error(propiasError.message);
      }

      if (todasError) {
        throw new Error(todasError.message);
      }

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
          completadas: tareasTodas.filter((tarea) => tarea.estado === "completada").length,
        };
      }

      setResumenPorOrden(map);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo cargar el resumen de tareas.";
      setError(message);
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

    if (tareasError) {
      throw new Error(tareasError.message);
    }

    const tareas = (tareasData ?? []) as {
      id: string;
      estado: "pendiente" | "en_proceso" | "completada";
    }[];

    if (tareas.length === 0) {
      return;
    }

    const todasCompletadas = tareas.every((tarea) => tarea.estado === "completada");
    const algunaIniciada = tareas.some(
      (tarea) => tarea.estado === "en_proceso" || tarea.estado === "completada"
    );

    if (todasCompletadas) {
      const payload: {
        estado: "completada";
        hora_fin: string;
        hora_inicio?: string;
      } = {
        estado: "completada",
        hora_fin: new Date().toISOString(),
      };

      if (!ordenActual.hora_inicio) {
        payload.hora_inicio = new Date().toISOString();
      }

      const { error } = await supabase
        .from("ordenes_trabajo")
        .update(payload)
        .eq("id", ordenId);

      if (error) {
        throw new Error(error.message);
      }

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

      if (error) {
        throw new Error(error.message);
      }

      return;
    }

    const { error } = await supabase
      .from("ordenes_trabajo")
      .update({
        estado: "pendiente",
        hora_fin: null,
      })
      .eq("id", ordenId);

    if (error) {
      throw new Error(error.message);
    }
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

      if (tareaError) {
        throw new Error(tareaError.message);
      }

      await recalcularEstadoOrdenCliente(tarea.orden_id);
      await loadResumen();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo actualizar la tarea.";
      setError(message);
    } finally {
      setLoadingTaskId(null);
    }
  }

  useEffect(() => {
    loadResumen();
  }, [loadResumen]);


  useEffect(() => {
    const channel = supabase
      .channel("mis-ordenes-realtime")
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
      .sort((a, b) => {
        return (prioridad[a.estado] ?? 99) - (prioridad[b.estado] ?? 99);
      });
  }, [ordenes]);

  if (!ordenesOrdenadas || ordenesOrdenadas.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        No tienes órdenes asignadas.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-gray-500">
        Gestiona tus tareas: inicia y finaliza según avances.
      </p>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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

        return (
          <section
            key={orden.id}
            className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${orden.estado === "en_proceso"
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 bg-white"
              }`}
          >

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xl font-bold tracking-wide">
                  {orden.vehiculo?.placa ?? "Sin placa"}
                </p>

                <p className="text-sm text-gray-500">
                  {orden.cliente?.nombre ?? "Sin cliente"}
                </p>

                <p className="text-sm text-gray-500">
                  {orden.vehiculo?.marca ?? ""} {orden.vehiculo?.modelo ?? ""}
                </p>
              </div>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getEstadoBadge(
                  orden.estado
                )}`}
              >
                {orden.estado.replaceAll("_", " ")}
              </span>
            </div>

            <div className="mt-4 grid gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm">
              <p>
                Mis tareas: {loadingResumen ? "..." : resumen.propias.length}
              </p>
              <p>
                Avance de la orden:{" "}
                {loadingResumen ? "..." : `${resumen.completadas}/${resumen.total}`}
              </p>
              {resumen.total > 0 ? (
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{
                      width: `${(resumen.completadas / resumen.total) * 100}%`,
                    }}
                  />
                </div>
              ) : null}
              {todasCompletadas ? (
                <p className="text-green-600 font-medium">
                  ✔ Todas las tareas completadas
                </p>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3">
              {resumen.propias.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500">
                  No tienes tareas asignadas todavía en esta orden.
                </div>
              ) : (
                [...resumen.propias]
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
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium">{getTipoTareaLabel(tarea.tipo_tarea)}</p>
                          <p className="text-sm text-gray-500">
                            {tarea.descripcion || "Sin descripción"}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tarea.estado === "pendiente"
                              ? "bg-yellow-100 text-yellow-700"
                              : tarea.estado === "en_proceso"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                              }`}
                          >
                            {tarea.estado.replaceAll("_", " ")}
                          </span>

                          {tarea.estado === "pendiente" ? (
                            <button
                              type="button"
                              onClick={() => cambiarEstadoTarea(tarea, "en_proceso")}
                              disabled={loadingTaskId === tarea.id}
                              className="inline-flex rounded-xl bg-blue-600 px-3 py-2 text-xs text-white disabled:opacity-60"
                            >
                              {loadingTaskId === tarea.id ? "..." : "Iniciar tarea"}
                            </button>
                          ) : null}

                          {tarea.estado === "en_proceso" ? (
                            <button
                              type="button"
                              onClick={() => cambiarEstadoTarea(tarea, "completada")}
                              disabled={loadingTaskId === tarea.id}
                              className="inline-flex rounded-xl bg-green-600 px-3 py-2 text-xs text-white disabled:opacity-60"
                            >
                              {loadingTaskId === tarea.id ? "..." : "Completar"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/ordenes/${orden.id}`}
                className="inline-flex min-w-35 items-center justify-center rounded-2xl border border-yellow-300 bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg active:translate-y-0 active:scale-[0.98]"
              >
                Ver detalle
              </Link>

              {todasCompletadas ? (
                <span className="inline-flex min-w-35 items-center justify-center rounded-2xl bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700">
                  Lista para finalizar
                </span>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}