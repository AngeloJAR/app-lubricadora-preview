"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Edit3,
  ListChecks,
  Plus,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { RepetirOrdenButton } from "@/features/ordenes/repetir-orden-button";
import { Card } from "@/components/ui/card";
import {
  OrdenPdfButton,
  OrdenStoragePdfButton,
  OrdenWhatsappButton,
  PrintButton,
} from "./components/actions";

import type {
  OrdenDetalle,
  OrdenTareaTecnico,
  OrdenTareaTecnicoFormData,
} from "@/types";

import {
  createTareaOrden,
  createTareasSugeridasOrden,
  getTareasByOrden,
  getTecnicosAsignadosOrden,
} from "./actions";

import {
  TIPOS_TAREA_ORDEN,
  getTareasSugeridasPorServicio,
  getTipoTareaLabel,
} from "./constants";

import {
  OrdenResumenCard,
  OrdenClienteVehiculoCards,
  OrdenItemsCard,
  formatFechaHora,
  getEstadoTareaClasses,
  getEstadoTareaLabel,
} from "./orden-detalle-shared";

import {
  puedeEditarOrdenPorRolYEstado,
  puedeEnviarWhatsappOrden,
  puedeImprimirOrden,
} from "@/lib/core/ui/permisos-ordenes";

type OrdenDetalleAdminViewProps = {
  orden: OrdenDetalle;
  canManageOrden: boolean;
  rol: "admin" | "recepcion";
};

type OrdenTareaDetalle = OrdenTareaTecnico & {
  tecnico: {
    id: string;
    nombre: string;
  } | null;
};

type TecnicoAsignadoOption = {
  id: string;
  nombre: string;
  es_principal: boolean;
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
    <div className={`rounded-2xl border p-4 ${classes[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

export function OrdenDetalleAdminView({
  orden,
  canManageOrden,
  rol,
}: OrdenDetalleAdminViewProps) {
  const [tareas, setTareas] = useState<OrdenTareaDetalle[]>([]);
  const [loadingTareas, setLoadingTareas] = useState(true);
  const [errorTareas, setErrorTareas] = useState("");

  const [tecnicosAsignados, setTecnicosAsignados] = useState<
    TecnicoAsignadoOption[]
  >([]);
  const [loadingTecnicosAsignados, setLoadingTecnicosAsignados] =
    useState(true);

  const [loadingCreateTarea, setLoadingCreateTarea] = useState(false);
  const [errorCreateTarea, setErrorCreateTarea] = useState("");
  const [successCreateTarea, setSuccessCreateTarea] = useState("");

  const [loadingCrearSugeridas, setLoadingCrearSugeridas] = useState(false);

  const [tareaForm, setTareaForm] = useState<OrdenTareaTecnicoFormData>({
    tecnico_id: "",
    tipo_tarea: "",
    descripcion: "",
    estado: "pendiente",
  });

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

  const tareasSugeridas = useMemo(() => {
    return orden.orden_items
      .filter((item) => item.tipo_item === "servicio")
      .flatMap((item, itemIndex) =>
        getTareasSugeridasPorServicio(item.nombre_item).map(
          (tipo, tipoIndex) => ({
            tipo_tarea: tipo,
            descripcion: item.nombre_item,
            key: `${tipo}-${item.nombre_item}-${item.id ?? itemIndex}-${tipoIndex}`,
          })
        )
      );
  }, [orden.orden_items]);

  async function reloadTareas() {
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
  }

  async function handleCreateTarea() {
    try {
      setLoadingCreateTarea(true);
      setErrorCreateTarea("");
      setSuccessCreateTarea("");

      if (!tareaForm.tecnico_id) {
        setErrorCreateTarea("Debes seleccionar un técnico.");
        return;
      }

      if (!tareaForm.tipo_tarea) {
        setErrorCreateTarea("Debes seleccionar un tipo de tarea.");
        return;
      }

      await createTareaOrden(orden.id, tareaForm);

      setSuccessCreateTarea("Tarea creada correctamente.");

      setTareaForm({
        tecnico_id: tecnicosAsignados[0]?.id ?? "",
        tipo_tarea: "",
        descripcion: "",
        estado: "pendiente",
      });

      await reloadTareas();
    } catch (err) {
      setErrorCreateTarea(
        err instanceof Error ? err.message : "No se pudo crear la tarea."
      );
    } finally {
      setLoadingCreateTarea(false);
    }
  }

  async function handleCrearSugeridas() {
    try {
      setLoadingCrearSugeridas(true);
      setErrorCreateTarea("");
      setSuccessCreateTarea("");

      await createTareasSugeridasOrden(orden.id);

      setSuccessCreateTarea(
        "Tareas sugeridas creadas y repartidas entre los técnicos."
      );

      await reloadTareas();
    } catch (err) {
      setErrorCreateTarea(
        err instanceof Error
          ? err.message
          : "No se pudieron crear las tareas sugeridas."
      );
    } finally {
      setLoadingCrearSugeridas(false);
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoadingTareas(true);
        setLoadingTecnicosAsignados(true);
        setErrorTareas("");

        const [tareasData, tecnicosData] = await Promise.all([
          getTareasByOrden(orden.id),
          getTecnicosAsignadosOrden(orden.id),
        ]);

        const tecnicosNormalizados: TecnicoAsignadoOption[] = tecnicosData.map(
          (tecnico) => {
            const tecnicoData = Array.isArray(tecnico.tecnico)
              ? tecnico.tecnico[0] ?? null
              : tecnico.tecnico;

            return {
              id: tecnico.tecnico_id,
              nombre: tecnicoData?.nombre ?? "Técnico sin nombre",
              es_principal: tecnico.es_principal,
            };
          }
        );

        setTareas(tareasData as OrdenTareaDetalle[]);
        setTecnicosAsignados(tecnicosNormalizados);

        setTareaForm((prev) => ({
          ...prev,
          tecnico_id: tecnicosNormalizados[0]?.id ?? "",
        }));
      } catch (err) {
        setErrorTareas(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los datos de tareas."
        );
      } finally {
        setLoadingTareas(false);
        setLoadingTecnicosAsignados(false);
      }
    }

    loadInitialData();
  }, [orden.id]);

  return (
    <div className="grid gap-5">
      {canManageOrden ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-bold text-gray-800">
              Acciones de la orden
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {puedeEditarOrdenPorRolYEstado(rol, orden.estado) ? (
              <Link
                href={`/ordenes/${orden.id}/editar`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-100 hover:shadow-md sm:w-auto"
              >
                <Edit3 className="h-4 w-4" />
                Editar orden
              </Link>
            ) : null}

            <RepetirOrdenButton ordenId={orden.id} />

            {puedeImprimirOrden(rol) ? <PrintButton ordenId={orden.id} /> : null}
            {puedeImprimirOrden(rol) ? <OrdenPdfButton ordenId={orden.id} /> : null}
            {puedeImprimirOrden(rol) ? (
              <OrdenStoragePdfButton ordenId={orden.id} />
            ) : null}
            {puedeEnviarWhatsappOrden(rol) ? (
              <OrdenWhatsappButton orden={orden} />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <OrdenResumenCard orden={orden} showTotal showKilometrajeFinal />

        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-bold text-gray-800">
              Resumen de tareas
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
        </div>
      </div>

      <OrdenClienteVehiculoCards orden={orden} showLinks />

      <OrdenItemsCard orden={orden} showTotals={canManageOrden} />

      <Card title="Tareas de la orden">
        {canManageOrden ? (
          <div className="mb-5 rounded-3xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-bold text-gray-800">
                Agregar tarea
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Técnico
                </label>
                <select
                  value={tareaForm.tecnico_id}
                  onChange={(e) =>
                    setTareaForm((prev) => ({
                      ...prev,
                      tecnico_id: e.target.value,
                    }))
                  }
                  disabled={loadingCreateTarea || loadingTecnicosAsignados}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none transition focus:border-gray-400 disabled:opacity-60"
                >
                  <option value="">Selecciona un técnico</option>
                  {tecnicosAsignados.map((tecnico) => (
                    <option key={tecnico.id} value={tecnico.id}>
                      {tecnico.nombre}
                      {tecnico.es_principal ? " ⭐ Principal" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Tipo de tarea
                </label>
                <select
                  value={tareaForm.tipo_tarea}
                  onChange={(e) =>
                    setTareaForm((prev) => ({
                      ...prev,
                      tipo_tarea: e.target.value,
                    }))
                  }
                  disabled={loadingCreateTarea}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none transition focus:border-gray-400 disabled:opacity-60"
                >
                  <option value="">Selecciona un tipo</option>
                  {TIPOS_TAREA_ORDEN.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {getTipoTareaLabel(tipo)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Descripción
              </label>
              <textarea
                value={tareaForm.descripcion}
                onChange={(e) =>
                  setTareaForm((prev) => ({
                    ...prev,
                    descripcion: e.target.value,
                  }))
                }
                disabled={loadingCreateTarea}
                className="min-h-24 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-400 disabled:opacity-60"
                placeholder="Ejemplo: cambio de aceite, revisión de filtro, limpieza, etc."
              />
            </div>

            {tareasSugeridas.length > 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-700" />
                  <p className="text-sm font-bold text-amber-900">
                    Sugeridas por servicios
                  </p>
                </div>

                <div className="grid gap-2">
                  {tareasSugeridas.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-900"
                    >
                      {getTipoTareaLabel(item.tipo_tarea)} · {item.descripcion}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCrearSugeridas}
                    disabled={
                      loadingCrearSugeridas ||
                      loadingTecnicosAsignados ||
                      tecnicosAsignados.length === 0
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Sparkles className="h-4 w-4" />
                    {loadingCrearSugeridas
                      ? "Creando..."
                      : "Crear tareas sugeridas"}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleCreateTarea}
                disabled={loadingCreateTarea || loadingTecnicosAsignados}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300 bg-yellow-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {loadingCreateTarea ? "Guardando..." : "Crear tarea"}
              </button>
            </div>

            {errorCreateTarea ? (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                {errorCreateTarea}
              </div>
            ) : null}

            {successCreateTarea ? (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4" />
                {successCreateTarea}
              </div>
            ) : null}
          </div>
        ) : null}

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
            {tareas.map((tarea) => (
              <div
                key={tarea.id}
                className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-3">
                    <div className="rounded-2xl bg-gray-50 p-3 text-gray-500">
                      <ClipboardList className="h-5 w-5" />
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
                        <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          <UserCheck className="h-3.5 w-3.5" />
                          Técnico asignado
                        </p>
                        <p className="font-semibold text-gray-800">
                          {tarea.tecnico?.nombre ?? "Sin técnico"}
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

                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-bold ${getEstadoTareaClasses(
                      tarea.estado
                    )}`}
                  >
                    {getEstadoTareaLabel(tarea.estado)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}