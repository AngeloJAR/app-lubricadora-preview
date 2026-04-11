"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { getEstadoClasses, getEstadoLabel } from "@/utils/orden-status";
import { OrdenWhatsappButton } from "./orden-whatsapp-button";
import { RepetirOrdenButton } from "@/features/ordenes/repetir-orden-button";

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

function formatFechaHora(fecha?: string | null) {
  if (!fecha) return "-";

  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Guayaquil",
  }).format(new Date(fecha));
}

function getEstadoTareaLabel(estado: OrdenTareaTecnico["estado"]) {
  switch (estado) {
    case "pendiente":
      return "Pendiente";
    case "en_proceso":
      return "En proceso";
    case "completada":
      return "Completada";
    default:
      return estado;
  }
}

function getEstadoTareaClasses(estado: OrdenTareaTecnico["estado"]) {
  switch (estado) {
    case "pendiente":
      return "border-yellow-200 bg-yellow-50 text-yellow-800";
    case "en_proceso":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "completada":
      return "border-green-200 bg-green-50 text-green-800";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

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
      <Card title="Resumen de la orden">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="grid gap-2">
            <div>
              <p className="text-sm text-gray-500">Número de orden</p>
              <p className="text-2xl font-bold">{orden.numero}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Fecha</p>
              <p className="font-medium">
                {new Date(orden.fecha).toLocaleDateString()}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Kilometraje al ingreso</p>
              <p className="font-medium">{orden.kilometraje ?? "-"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Hora inicio</p>
              <p className="font-medium">{formatFechaHora(orden.hora_inicio)}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Hora fin</p>
              <p className="font-medium">{formatFechaHora(orden.hora_fin)}</p>
            </div>
          </div>

          <div className="grid gap-3">
            {canManageOrden ? (
              <div className="flex flex-wrap justify-end gap-2">
                {orden.estado !== "completada" &&
                orden.estado !== "entregada" &&
                orden.estado !== "cancelada" ? (
                  <Link
                    href={`/ordenes/${orden.id}/editar`}
                    className="inline-flex rounded-xl border border-gray-300 px-4 py-2 text-sm transition hover:bg-gray-50"
                  >
                    Editar orden
                  </Link>
                ) : null}

                <RepetirOrdenButton ordenId={orden.id} />

                <Link
                  href={`/ordenes/${orden.id}/imprimir`}
                  className="inline-flex rounded-xl bg-yellow-500 border border-yellow-300 px-4 py-2 text-sm text-white transition hover:opacity-90"
                >
                  Imprimir / Guardar PDF
                </Link>

                <OrdenWhatsappButton orden={orden} />
              </div>
            ) : null}

            <div>
              <p className="mb-1 text-sm text-gray-500">Estado</p>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${getEstadoClasses(
                  orden.estado
                )}`}
              >
                {getEstadoLabel(orden.estado)}
              </span>
            </div>

            {canManageOrden ? (
              <div className="rounded-2xl border border-gray-200 p-4 text-right">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold">
                  ${Number(orden.total).toFixed(2)}
                </p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="mb-2 text-sm text-gray-500">Resumen de tareas</p>
              <div className="grid gap-2 text-sm">
                <p>Total: {tareasTotales}</p>
                <p>Pendientes: {tareasPendientes}</p>
                <p>En proceso: {tareasEnProceso}</p>
                <p>Completadas: {tareasCompletadas}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Cliente">
          {orden.clientes ? (
            <div className="grid gap-3">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="font-medium">
                  {orden.clientes.nombres} {orden.clientes.apellidos}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Teléfono</p>
                <p className="font-medium">{orden.clientes.telefono}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">WhatsApp</p>
                <p className="font-medium">{orden.clientes.whatsapp || "-"}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Correo</p>
                <p className="font-medium">{orden.clientes.email || "-"}</p>
              </div>

              <div>
                <Link
                  href={`/clientes/${orden.clientes.id}`}
                  className="inline-flex rounded-xl bg-yellow-500 border border-yellow-300 px-4 py-2 text-sm text-white transition hover:opacity-90"
                >
                  Ver cliente
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No hay cliente relacionado.</p>
          )}
        </Card>

        <Card title="Vehículo">
          {orden.vehiculos ? (
            <div className="grid gap-3">
              <div>
                <p className="text-sm text-gray-500">Placa</p>
                <p className="font-medium">{orden.vehiculos.placa}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Marca / Modelo</p>
                <p className="font-medium">
                  {orden.vehiculos.marca} {orden.vehiculos.modelo}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Año</p>
                <p className="font-medium">{orden.vehiculos.anio ?? "-"}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Transmisión</p>
                <p className="font-medium">{orden.vehiculos.transmision ?? "-"}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Combustible</p>
                <p className="font-medium">{orden.vehiculos.combustible ?? "-"}</p>
              </div>

              <div>
                <Link
                  href={`/vehiculos/${orden.vehiculos.id}`}
                  className="inline-flex rounded-xl border border-gray-300 px-4 py-2 text-sm transition hover:bg-gray-50"
                >
                  Ver vehículo
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No hay vehículo relacionado.</p>
          )}
        </Card>
      </div>

      <Card title="Servicios / Items de la orden">
        {orden.orden_items.length === 0 ? (
          <p className="text-gray-600">No hay items registrados en esta orden.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-600">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Precio unitario</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {orden.orden_items.map((item) => (
                  <tr key={item.id} className="border-t border-gray-200 text-sm">
                    <td className="px-4 py-3">{item.nombre_item}</td>
                    <td className="px-4 py-3">
                      {item.tipo_item === "servicio" ? "Servicio" : "Producto"}
                    </td>
                    <td className="px-4 py-3">{item.cantidad}</td>
                    <td className="px-4 py-3">
                      ${Number(item.precio_unitario).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">${Number(item.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
                placeholder="Ejemplo: cambio de aceite 20W50 y revisión de filtro"
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
                className="inline-flex rounded-xl bg-yellow-500 border border-yellow-300 px-4 py-2 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
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
                      <p className="font-medium">{getTipoTareaLabel(tarea.tipo_tarea)}</p>
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