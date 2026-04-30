"use client";

import Link from "next/link";
import {
  CarFront,
  ClipboardList,
  CreditCard,
  Eye,
  Search,
  UserRound,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { OrdenConRelaciones } from "@/types";
import { OrdenEstadoSelect } from "./orden-estado-select";
import { CobrarModal } from "./cobrar-modal";
import type { OrdenEstado } from "@/lib/core/ordenes/reglas";
import { puedeCobrarOrdenUI } from "@/lib/core/ui/permisos-ordenes";


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
  | "entregadas_sin_cobrar"
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

function esEntregadaSinCobrar(orden: OrdenConRelaciones) {
  return orden.estado === "entregada" && orden.estado_pago !== "pagada";
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
    case "entregadas_sin_cobrar":
      return esEntregadaSinCobrar(orden);
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
    case "entregadas_sin_cobrar":
      return "Entregadas sin cobrar";
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
  const [busqueda, setBusqueda] = useState("");

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
      entregadas_sin_cobrar: rows.filter(esEntregadaSinCobrar).length,
      ocultas: rows.filter(esOculta).length,
      todas: rows.length,
    };
  }, [rows]);

  const rowsFiltradasYOrdenadas = useMemo(() => {
    const texto = busqueda.toLowerCase();

    const copia = rows.filter((orden) => {
      const cumpleFiltro = coincideConFiltro(orden, filtro);

      if (!cumpleFiltro) return false;

      if (!texto) return true;

      const cliente = `${orden.clientes?.nombres ?? ""} ${orden.clientes?.apellidos ?? ""}`.toLowerCase();
      const placa = (orden.vehiculos?.placa ?? "").toLowerCase();
      const numero = (orden.numero ?? "").toLowerCase();

      return (
        cliente.includes(texto) ||
        placa.includes(texto) ||
        numero.includes(texto)
      );
    });

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
  }, [rows, filtro, isAdminView, busqueda]);

  function handleCobrar(orden: OrdenConRelaciones) {
    setOrdenCobrar(orden);
  }

  function handleEstadoUpdated(id: string, nuevoEstado: OrdenEstado) {
    setOrdenCobrar(null);

    setRows((prev) => {
      if (nuevoEstado === "cancelada") {
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
        {
          value: "entregadas_sin_cobrar",
          label: "Sin cobrar",
          count: conteos.entregadas_sin_cobrar,
        },
        { value: "pre_orden", label: "Pre-órdenes", count: conteos.pre_orden },
        { value: "ocultas", label: "Ocultas", count: conteos.ocultas },
        { value: "todas", label: "Todas", count: conteos.todas },
      ];

  return (
    <>
      <div className="mb-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-yellow-50 p-3 text-yellow-600">
              <ClipboardList className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {isTecnico ? "Mis órdenes" : "Órdenes de trabajo"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isTecnico
                  ? "Aquí ves solo las órdenes que necesitas trabajar."
                  : "Filtra, busca, cobra y revisa el estado de cada orden."}
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, placa o número..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="min-h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-gray-400 focus:bg-white"
            />
          </div>

          <div className="md:hidden">
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as FiltroOrden)}
              className="min-h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium outline-none focus:border-gray-400"
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
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${active
                      ? "border-yellow-300 bg-yellow-500 text-white shadow-sm"
                      : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/20 text-white" : "bg-white text-gray-600"
                      }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Mostrando{" "}
            <span className="font-bold text-gray-900">
              {getFiltroLabel(filtro)}
            </span>{" "}
            ({rowsFiltradasYOrdenadas.length})
          </div>
        </div>
      </div>

      {!rowsFiltradasYOrdenadas.length ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          No hay órdenes en el filtro seleccionado.
        </div>
      ) : (
        <div className="grid gap-4">
          {rowsFiltradasYOrdenadas.map((orden) => {
            const preOrden = esPreOrden(orden);
            const ordenOculta = esOculta(orden);

            return (
              <article
                key={orden.id}
                className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${ordenOculta
                    ? "border-gray-300 opacity-90"
                    : preOrden
                      ? "border-blue-300 ring-1 ring-blue-100"
                      : "border-gray-200"
                  }`}
              >
                <div className="grid gap-4 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-extrabold text-gray-900">
                          {orden.numero}
                        </h3>

                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                          ID: {orden.id.slice(0, 8)}
                        </span>

                        {preOrden && isAdminView ? (
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                            PRE-ORDEN
                          </span>
                        ) : null}

                        {orden.estado === "entregada" ? (
                          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                            ENTREGADA
                          </span>
                        ) : null}

                        {orden.estado === "cancelada" ? (
                          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                            CANCELADA
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-sm font-medium text-gray-500">
                        Fecha registrada: {formatDate(orden.fecha)}
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:w-56 xl:grid-cols-1">
                      <Link
                        href={`/ordenes/${orden.id}`}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <Eye className="h-4 w-4" />
                        Ver detalle
                      </Link>

                      {(puedeCobrarOrdenUI(
                        rol,
                        orden.estado,
                        orden.estado_pago ?? "pendiente"
                      ) ||
                        (isAdminView && filtro === "entregadas_sin_cobrar")) ? (
                        <button
                          type="button"
                          onClick={() => handleCobrar(orden)}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-md"
                        >
                          <CreditCard className="h-4 w-4" />
                          Cobrar
                        </button>
                      ) : null}

                      {preOrden && isAdminView ? (
                        <Link
                          href={`/ordenes/${orden.id}/editar`}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                        >
                          Revisar / asignar
                        </Link>
                      ) : null}

                      {isAdminView && filtro === "entregadas_sin_cobrar" ? (
                        <Link
                          href={`/ordenes/${orden.id}/editar`}
                          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
                        >
                          Editar deuda
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={`grid gap-3 ${isTecnico
                        ? "sm:grid-cols-2 xl:grid-cols-4"
                        : "sm:grid-cols-2 xl:grid-cols-5"
                      }`}
                  >
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-gray-400" />
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                          Cliente
                        </p>
                      </div>
                      <p className="wrap-break-word text-sm font-bold text-gray-900">
                        {clienteNombre(orden)}
                      </p>
                      <p className="mt-1 wrap-break-word text-xs font-medium text-gray-500">
                        {orden.clientes?.telefono ?? "Sin teléfono"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <CarFront className="h-4 w-4 text-gray-400" />
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                          Vehículo
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {orden.vehiculos?.placa ?? "-"}
                      </p>
                      <p className="mt-1 wrap-break-word text-xs font-medium text-gray-500">
                        {vehiculoNombre(orden)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Fecha
                      </p>
                      <p className="mt-2 text-sm font-bold text-gray-900">
                        {formatDate(orden.fecha)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
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
                      <div className="rounded-2xl border border-gray-900 bg-gray-900 p-4 text-white">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-300">
                          Total
                        </p>
                        <p className="mt-2 text-xl font-extrabold">
                          {formatCurrency(orden.total)}
                        </p>
                        <p className="mt-2 text-xs text-gray-300">
                          Pago:{" "}
                          <span className="font-bold text-white">
                            {orden.estado_pago ?? "pendiente"}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-gray-300">
                          Saldo:{" "}
                          <span className="font-bold text-white">
                            {formatCurrency(
                              orden.saldo_pendiente ?? orden.total
                            )}
                          </span>
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {!isTecnico ? (
                    <div
                      className={`rounded-2xl border p-4 ${preOrden
                          ? "border-blue-200 bg-blue-50"
                          : "border-gray-200 bg-gray-50"
                        }`}
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-gray-400" />
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                          Técnicos asignados
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {orden.tecnicos && orden.tecnicos.length > 0 ? (
                          orden.tecnicos.map((tecnico) => (
                            <span
                              key={tecnico.id}
                              className={
                                tecnico.es_principal
                                  ? "inline-flex max-w-full items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-800"
                                  : "inline-flex max-w-full items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700"
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
                          <span className="text-sm font-bold text-blue-700">
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
              </article>
            );
          })}
        </div>
      )}

      {ordenCobrar && (
        <CobrarModal
          open={!!ordenCobrar}
          ordenId={ordenCobrar.id}
          total={Number(ordenCobrar.total ?? 0)}
          totalPagado={Number(ordenCobrar.total_pagado ?? 0)}
          onClose={(result) => {
            const ordenId = ordenCobrar.id;

            setOrdenCobrar(null);

            if (!result) return;

            setRows((prev) =>
              prev.map((o) =>
                o.id === ordenId
                  ? {
                    ...o,
                    estado: result.orden_estado,
                    estado_pago: result.estado_pago,
                    total_pagado: result.total_pagado,
                    saldo_pendiente: result.saldo_restante,
                  }
                  : o
              )
            );
          }}
        />
      )}
    </>
  );
}