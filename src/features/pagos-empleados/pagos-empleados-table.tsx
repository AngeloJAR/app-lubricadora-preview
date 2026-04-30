"use client";

import {
  AlertCircle,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
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
      return "border-slate-200 bg-slate-50 text-slate-700";
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

function InfoCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>
      <p
        className={`mt-2 break-words ${
          highlight
            ? "text-xl font-black text-red-600"
            : "text-sm font-bold text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function PagosEmpleadosTable({
  pagos,
  canManagePagos,
}: PagosEmpleadosTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const resumen = useMemo(() => {
    const total = pagos.reduce((sum, pago) => sum + Number(pago.monto ?? 0), 0);

    return {
      totalPagos: pagos.length,
      totalMonto: total,
    };
  }, [pagos]);

  async function handleDelete(pagoId: string) {
    const confirmed = window.confirm("¿Seguro que quieres eliminar este pago?");

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
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
          <WalletCards className="h-7 w-7" />
        </div>

        <h3 className="mt-4 text-base font-bold text-slate-900">
          No hay pagos registrados
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Cuando registres sueldos, anticipos, bonos, comisiones o descuentos,
          aparecerán en esta sección.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Registros
              </p>
              <p className="text-2xl font-black text-slate-900">
                {resumen.totalPagos}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-red-100 bg-red-50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-3 text-red-600 shadow-sm">
              <BadgeDollarSign className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                Total pagado
              </p>
              <p className="text-2xl font-black text-red-600">
                {formatMoney(resumen.totalMonto)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {pagos.map((pago) => {
        const isLoading = loadingId === pago.id;
        const empleadoNombre = pago.usuarios_app?.nombre ?? "Empleado";
        const periodo =
          pago.periodo_inicio || pago.periodo_fin
            ? `${formatFecha(pago.periodo_inicio)} - ${formatFecha(
                pago.periodo_fin
              )}`
            : "-";

        return (
          <article
            key={pago.id}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                    <UserRound className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-xl font-black text-slate-900">
                        {empleadoNombre}
                      </h3>

                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getTipoPagoClass(
                          pago.tipo_pago
                        )}`}
                      >
                        {formatTipoPago(pago.tipo_pago)}
                      </span>
                    </div>

                    <p className="mt-2 break-words text-sm leading-6 text-slate-500">
                      {pago.observaciones?.trim() ||
                        "Sin observaciones registradas."}
                    </p>
                  </div>
                </div>

                {canManagePagos ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(pago.id)}
                    disabled={isLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 xl:w-40"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Fecha de pago"
                  value={formatFecha(pago.fecha_pago)}
                />

                <InfoCard
                  icon={<Clock className="h-4 w-4" />}
                  label="Período"
                  value={periodo}
                />

                <InfoCard
                  icon={<UserRound className="h-4 w-4" />}
                  label="Empleado"
                  value={empleadoNombre}
                />

                <InfoCard
                  icon={<BadgeDollarSign className="h-4 w-4" />}
                  label="Monto"
                  value={formatMoney(pago.monto)}
                  highlight
                />
              </div>

              {errorById[pago.id] ? (
                <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {errorById[pago.id]}
                </div>
              ) : null}

              {!errorById[pago.id] ? (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Pago registrado correctamente en el historial.
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}