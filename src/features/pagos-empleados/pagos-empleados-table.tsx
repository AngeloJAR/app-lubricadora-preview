"use client";

import { useState } from "react";
import type { PagoEmpleado } from "@/types";
import { deletePagoEmpleado } from "./actions";

type PagosEmpleadosTableProps = {
  pagos: PagoEmpleado[];
  canManagePagos: boolean;
};

function formatFecha(value?: string | null) {
  if (!value) return "-";

  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return value;

  return fecha.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatMoney(value?: number | string | null) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function getTipoPagoClass(tipo?: string | null) {
  switch (tipo) {
    case "sueldo":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "anticipo":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    case "bono":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "comision":
      return "border-purple-200 bg-purple-50 text-purple-700";
    case "descuento":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

function formatTipoPago(tipo?: string | null) {
  switch (tipo) {
    case "sueldo":
      return "Sueldo";
    case "anticipo":
      return "Anticipo";
    case "bono":
      return "Bono";
    case "comision":
      return "Comisión";
    case "descuento":
      return "Descuento";
    default:
      return "Pago";
  }
}

export function PagosEmpleadosTable({
  pagos,
  canManagePagos,
}: PagosEmpleadosTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  async function handleDelete(pagoId: string) {
    const confirmed = window.confirm(
      "¿Seguro que quieres eliminar este pago?"
    );

    if (!confirmed) return;

    try {
      setLoadingId(pagoId);
      setErrorById((prev) => ({
        ...prev,
        [pagoId]: "",
      }));

      await deletePagoEmpleado(pagoId);

      window.location.reload();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el pago del empleado.";

      setErrorById((prev) => ({
        ...prev,
        [pagoId]: message,
      }));
    } finally {
      setLoadingId(null);
    }
  }

  if (pagos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
        No hay pagos registrados todavía.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {pagos.map((pago) => {
        const isLoading = loadingId === pago.id;

        return (
          <article
            key={pago.id}
            className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 grid flex-1 gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-gray-900 break-words">
                        {pago.usuarios_app?.nombre ?? "Empleado"}
                      </h3>

                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getTipoPagoClass(
                          pago.tipo_pago
                        )}`}
                      >
                        {formatTipoPago(pago.tipo_pago)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-gray-500 break-words">
                      {pago.observaciones?.trim() || "Sin observaciones registradas."}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Fecha de pago
                      </p>
                      <p className="mt-2 text-sm font-medium text-gray-900">
                        {formatFecha(pago.fecha_pago)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Período
                      </p>
                      <p className="mt-2 text-sm font-medium text-gray-900">
                        {formatFecha(pago.periodo_inicio)} - {formatFecha(pago.periodo_fin)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Empleado
                      </p>
                      <p className="mt-2 text-sm font-medium text-gray-900 break-words">
                        {pago.usuarios_app?.nombre ?? "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Monto
                      </p>
                      <p className="mt-2 text-lg font-semibold text-red-600">
                        {formatMoney(pago.monto)}
                      </p>
                    </div>
                  </div>

                  {errorById[pago.id] ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorById[pago.id]}
                    </div>
                  ) : null}
                </div>

                {canManagePagos ? (
                  <div className="grid gap-2 xl:w-40">
                    <button
                      type="button"
                      onClick={() => handleDelete(pago.id)}
                      disabled={isLoading}
                      className="rounded-xl border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      {isLoading ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}