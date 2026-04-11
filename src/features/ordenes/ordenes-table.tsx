"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { OrdenConRelaciones } from "@/types";
import { OrdenEstadoSelect } from "./orden-estado-select";
import { CobrarModal } from "./cobrar-modal";
import type { OrdenEstado } from "@/utils/orden-status";

type OrdenesTableProps = {
  ordenes: OrdenConRelaciones[];
  canViewTotales: boolean;
  rol: "admin" | "recepcion" | "tecnico";
};

type FiltroOrden =
  | "activas"
  | "pendiente"
  | "en_proceso"
  | "completada"
  | "pre_orden"
  | "ocultas"
  | "todas";

function formatCurrency(value: number | string | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function clienteNombre(orden: OrdenConRelaciones) {
  if (!orden.clientes) return "-";
  return `${orden.clientes.nombres} ${orden.clientes.apellidos}`;
}

function vehiculoNombre(orden: OrdenConRelaciones) {
  if (!orden.vehiculos) return "Sin vehículo";
  return `${orden.vehiculos.marca} ${orden.vehiculos.modelo}`;
}

function esPreOrden(orden: OrdenConRelaciones) {
  return String(orden.numero ?? "").startsWith("PRE-");
}

function esOculta(orden: OrdenConRelaciones) {
  return orden.estado === "entregada" || orden.estado === "cancelada";
}

function esActiva(orden: OrdenConRelaciones) {
  return !esOculta(orden);
}

function coincideConFiltro(
  orden: OrdenConRelaciones,
  filtro: FiltroOrden
): boolean {
  switch (filtro) {
    case "activas":
      return esActiva(orden);
    case "pendiente":
      return orden.estado === "pendiente";
    case "en_proceso":
      return orden.estado === "en_proceso";
    case "completada":
      return orden.estado === "completada";
    case "pre_orden":
      return esPreOrden(orden);
    case "ocultas":
      return esOculta(orden);
    case "todas":
      return true;
    default:
      return esActiva(orden);
  }
}

function getFiltroLabel(filtro: FiltroOrden) {
  switch (filtro) {
    case "activas":
      return "Activas";
    case "pendiente":
      return "Pendientes";
    case "en_proceso":
      return "En proceso";
    case "completada":
      return "Completadas";
    case "pre_orden":
      return "Pre-órdenes";
    case "ocultas":
      return "Ocultas";
    case "todas":
      return "Todas";
    default:
      return "Activas";
  }
}

export function OrdenesTable({
  ordenes,
  canViewTotales,
  rol,
}: OrdenesTableProps) {
  const [ordenCobrar, setOrdenCobrar] =
    useState<OrdenConRelaciones | null>(null);

  const [filtro, setFiltro] = useState<FiltroOrden>("activas");
  const [rows, setRows] = useState<OrdenConRelaciones[]>(ordenes);

  const isTecnico = rol === "tecnico";
  const isAdminView = rol === "admin" || rol === "recepcion";

  useEffect(() => {
    setRows(ordenes);
  }, [ordenes]);

  const conteos = useMemo(() => {
    return {
      activas: rows.filter(esActiva).length,
      pendiente: rows.filter((orden) => orden.estado === "pendiente").length,
      en_proceso: rows.filter((orden) => orden.estado === "en_proceso").length,
      completada: rows.filter((orden) => orden.estado === "completada").length,
      pre_orden: rows.filter((orden) => esPreOrden(orden)).length,
      ocultas: rows.filter(esOculta).length,
      todas: rows.length,
    };
  }, [rows]);

  const rowsFiltradasYOrdenadas = useMemo(() => {
    const copia = rows.filter((orden) => coincideConFiltro(orden, filtro));

    const prioridadEstado: Record<string, number> = {
      en_proceso: 0,
      pendiente: 1,
      completada: 2,
      entregada: 3,
      cancelada: 4,
    };

    copia.sort((a, b) => {
      const aPre = esPreOrden(a) ? 1 : 0;
      const bPre = esPreOrden(b) ? 1 : 0;

      if (
        isAdminView &&
        filtro !== "ocultas" &&
        filtro !== "todas" &&
        aPre !== bPre
      ) {
        return bPre - aPre;
      }

      const prioridadA = prioridadEstado[a.estado ?? ""] ?? 99;
      const prioridadB = prioridadEstado[b.estado ?? ""] ?? 99;

      if (prioridadA !== prioridadB) {
        return prioridadA - prioridadB;
      }

      const fechaA = new Date(a.created_at ?? a.fecha ?? 0).getTime();
      const fechaB = new Date(b.created_at ?? b.fecha ?? 0).getTime();

      return fechaB - fechaA;
    });

    return copia;
  }, [rows, filtro, isAdminView]);

  function handleCobrar(orden: OrdenConRelaciones) {
    setOrdenCobrar(orden);
  }

  function handleEstadoUpdated(id: string, nuevoEstado: OrdenEstado) {
    setOrdenCobrar(null);

    setRows((prev) => {
      if (nuevoEstado === "cancelada") {
        setTimeout(() => {
          setRows((prev) => prev.filter((o) => o.id !== id));
        }, 300);

        return prev.map((o) =>
          o.id === id ? { ...o, estado: "cancelada" } : o
        );
      }

      return prev.map((o) =>
        o.id === id ? { ...o, estado: nuevoEstado } : o
      );
    });
  }

  const filtros: Array<{
    value: FiltroOrden;
    label: string;
    count: number;
  }> = isTecnico
      ? [
        { value: "activas", label: "Activas", count: conteos.activas },
        { value: "pendiente", label: "Pendientes", count: conteos.pendiente },
        { value: "en_proceso", label: "En proceso", count: conteos.en_proceso },
        { value: "completada", label: "Completadas", count: conteos.completada },
      ]
      : [
        { value: "activas", label: "Activas", count: conteos.activas },
        { value: "pendiente", label: "Pendientes", count: conteos.pendiente },
        { value: "en_proceso", label: "En proceso", count: conteos.en_proceso },
        { value: "completada", label: "Completadas", count: conteos.completada },
        { value: "pre_orden", label: "Pre-órdenes", count: conteos.pre_orden },
        { value: "ocultas", label: "Ocultas", count: conteos.ocultas },
        { value: "todas", label: "Todas", count: conteos.todas },
      ];

  return (
    <>
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:mb-5 md:p-5">
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 md:text-lg">
              {isTecnico ? "Mis órdenes" : "Filtros de órdenes"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {isTecnico
                ? "Aquí ves solo las órdenes que necesitas trabajar."
                : "Por defecto se muestran solo las órdenes activas. Usa los filtros para ver entregadas o canceladas cuando las necesites."}
            </p>
          </div>

          <div className="md:hidden">
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as FiltroOrden)}
              className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
            >
              {filtros.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} ({item.count})
                </option>
              ))}
            </select>
          </div>

          <div className="hidden flex-wrap gap-2 md:flex">
            {filtros.map((item) => {
              const active = filtro === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFiltro(item.value)}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${active
                    ? "border-yellow-300 bg-yellow-500 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${active
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-600"
                      }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Mostrando:{" "}
            <span className="font-semibold text-gray-900">
              {getFiltroLabel(filtro)}
            </span>{" "}
            ({rowsFiltradasYOrdenadas.length})
          </div>
        </div>
      </div>

      {!rowsFiltradasYOrdenadas.length ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500 md:p-8">
          No hay órdenes en el filtro seleccionado.
        </div>
      ) : (
        <div className="grid gap-3 md:gap-4">
          {rowsFiltradasYOrdenadas.map((orden) => {
            const preOrden = esPreOrden(orden);
            const ordenOculta = esOculta(orden);

            return (
              <article
                key={orden.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm md:rounded-3xl ${ordenOculta
                  ? "border-gray-300 opacity-90"
                  : preOrden
                    ? "border-blue-300 ring-1 ring-blue-100"
                    : "border-gray-200"
                  }`}
              >
                <div className="p-4 md:p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="grid min-w-0 flex-1 gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900 md:text-xl">
                            {orden.numero}
                          </h3>

                          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700">
                            ID: {orden.id.slice(0, 8)}
                          </span>

                          {preOrden && isAdminView ? (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              PRE-ORDEN
                            </span>
                          ) : null}

                          {orden.estado === "entregada" ? (
                            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                              ENTREGADA
                            </span>
                          ) : null}

                          {orden.estado === "cancelada" ? (
                            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                              CANCELADA
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 text-sm text-gray-500">
                          Fecha registrada: {formatDate(orden.fecha)}
                        </p>
                      </div>

                      <div
                        className={`grid gap-3 ${isTecnico
                          ? "sm:grid-cols-2 xl:grid-cols-4"
                          : "sm:grid-cols-2 xl:grid-cols-5"
                          }`}
                      >
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            Cliente
                          </p>
                          <p className="mt-2 wrap-break-word text-sm font-semibold text-gray-900">
                            {clienteNombre(orden)}
                          </p>
                          <p className="mt-1 wrap-break-word text-xs text-gray-500">
                            {orden.clientes?.telefono ?? "Sin teléfono"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            Vehículo
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-900">
                            {orden.vehiculos?.placa ?? "-"}
                          </p>
                          <p className="mt-1 wrap-break-word text-xs text-gray-500">
                            {vehiculoNombre(orden)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            Fecha
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-900">
                            {formatDate(orden.fecha)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            Estado
                          </p>
                          <div className="mt-2">
                            <OrdenEstadoSelect
                              ordenId={orden.id}
                              estadoActual={orden.estado}
                              rol={rol}
                              onUpdated={(nuevoEstado) =>
                                handleEstadoUpdated(orden.id, nuevoEstado)
                              }
                            />
                          </div>
                        </div>

                        {canViewTotales ? (
                          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                              Total
                            </p>
                            <p className="mt-2 text-base font-semibold text-gray-900 md:text-lg">
                              {formatCurrency(orden.total)}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      {!isTecnico ? (
                        <div
                          className={`rounded-2xl border px-4 py-4 ${preOrden
                            ? "border-blue-200 bg-blue-50"
                            : "border-gray-200 bg-gray-50"
                            }`}
                        >
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            Técnicos asignados
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {orden.tecnicos && orden.tecnicos.length > 0 ? (
                              orden.tecnicos.map((tecnico) => (
                                <span
                                  key={tecnico.id}
                                  className={
                                    tecnico.es_principal
                                      ? "inline-flex max-w-full items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-800"
                                      : "inline-flex max-w-full items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700"
                                  }
                                >
                                  <span className="wrap-break-word">
                                    {tecnico.nombre}
                                  </span>
                                  {tecnico.es_principal ? (
                                    <span>⭐ Principal</span>
                                  ) : null}
                                </span>
                              ))
                            ) : preOrden ? (
                              <span className="text-sm font-medium text-blue-700">
                                Pre-orden sin asignación todavía
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">
                                Sin técnicos asignados
                              </span>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-2 xl:w-52">
                      <Link
                        href={`/ordenes/${orden.id}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-sm font-medium text-white transition hover:brightness-95"
                      >
                        Ver detalle
                      </Link>

                      {orden.estado === "completada" && isAdminView ? (
                        <button
                          onClick={() => handleCobrar(orden)}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-green-300 bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:brightness-95"
                        >
                          💵 Cobrar
                        </button>
                      ) : null}

                      {preOrden && isAdminView ? (
                        <Link
                          href={`/ordenes/${orden.id}/editar`}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                          Revisar / asignar
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {ordenCobrar && (
        <CobrarModal
          open={!!ordenCobrar}
          ordenId={ordenCobrar.id}
          total={ordenCobrar.total}
          onClose={(estadoFinal?: "entregada") => {
            setOrdenCobrar(null);

            if (estadoFinal === "entregada") {
              setRows((prev) => prev.filter((o) => o.id !== ordenCobrar.id));
            }
          }}
        />
      )}
    </>
  );
}