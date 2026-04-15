"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  const [loadingTecnicosAsignados, setLoadingTecnicosAsignados] = useState(true);

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

  const tareasSugeridas = useMemo(() => {
    return orden.orden_items
      .filter((item) => item.tipo_item === "servicio")
      .flatMap((item, itemIndex) =>
        getTareasSugeridasPorServicio(item.nombre_item).map((tipo, tipoIndex) => ({
          tipo_tarea: tipo,
          descripcion: item.nombre_item,
          key: `${tipo}-${item.nombre_item}-${item.id ?? itemIndex}-${tipoIndex}`,
        }))
      );
  }, [orden.orden_items]);

  async function reloadTareas() {
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
      const message =
        err instanceof Error ? err.message : "No se pudo crear la tarea.";
      setErrorCreateTarea(message);
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
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron crear las tareas sugeridas.";
      setErrorCreateTarea(message);
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
        const message =
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los datos de tareas.";
        setErrorTareas(message);
      } finally {
        setLoadingTareas(false);
        setLoadingTecnicosAsignados(false);
      }
    }

    loadInitialData();
  }, [orden.id]);

  return (
    <div className="grid gap-4">
      {canManageOrden ? (
        <div className="flex flex-wrap gap-2">
          {puedeEditarOrdenPorRolYEstado(rol, orden.estado) ? (
            <Link
              href={`/ordenes/${orden.id}/editar`}
              className="inline-flex rounded-xl border border-gray-300 px-4 py-2 text-sm transition hover:bg-gray-50"
            >
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
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <OrdenResumenCard
          orden={orden}
          showTotal
          showKilometrajeFinal
        />

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm text-gray-500">Resumen de tareas</p>
          <div className="grid gap-2 text-sm">
            <p>Total: {tareasTotales}</p>
            <p>Pendientes: {tareasPendientes}</p>
            <p>En proceso: {tareasEnProceso}</p>
            <p>Completadas: {tareasCompletadas}</p>
          </div>
        </div>
      </div>

      <OrdenClienteVehiculoCards orden={orden} showLinks />

      <OrdenItemsCard orden={orden} showTotals={canManageOrden} />

      <Card title="Tareas de la orden">
        {canManageOrden ? (
          <div className="mb-4 rounded-2xl border border-gray-200 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Técnico</label>
                <select
                  value={tareaForm.tecnico_id}
                  onChange={(e) =>
                    setTareaForm((prev) => ({
                      ...prev,
                      tecnico_id: e.target.value,
                    }))
                  }
                  disabled={loadingCreateTarea || loadingTecnicosAsignados}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
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
                <label className="mb-1 block text-sm font-medium">Tipo de tarea</label>
                <select
                  value={tareaForm.tipo_tarea}
                  onChange={(e) =>
                    setTareaForm((prev) => ({
                      ...prev,
                      tipo_tarea: e.target.value,
                    }))
                  }
                  disabled={loadingCreateTarea}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
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
              <label className="mb-1 block text-sm font-medium">Descripción</label>
              <textarea
                value={tareaForm.descripcion}
                onChange={(e) =>
                  setTareaForm((prev) => ({
                    ...prev,
                    descripcion: e.target.value,
                  }))
                }
                disabled={loadingCreateTarea}
                className="min-h-24 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                placeholder="Ejemplo: cambio de aceite, revisión de filtro, limpieza, etc."
              />
            </div>

            {tareasSugeridas.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-4">
                <p className="mb-3 text-sm font-medium">Sugeridas por servicios</p>

                <div className="grid gap-2">
                  {tareasSugeridas.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl bg-gray-50 px-3 py-2 text-sm"
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
                    className="inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {loadingCrearSugeridas
                      ? "Creando sugeridas..."
                      : "Crear tareas sugeridas y repartir"}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleCreateTarea}
                disabled={loadingCreateTarea || loadingTecnicosAsignados}
                className="inline-flex rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {loadingCreateTarea ? "Guardando..." : "Crear tarea"}
              </button>
            </div>

            {errorCreateTarea ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorCreateTarea}
              </div>
            ) : null}

            {successCreateTarea ? (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {successCreateTarea}
              </div>
            ) : null}
          </div>
        ) : null}

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
            {tareas.map((tarea) => (
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
                      <p className="text-sm text-gray-500">Técnico asignado</p>
                      <p className="font-medium">
                        {tarea.tecnico?.nombre ?? "Sin técnico"}
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}