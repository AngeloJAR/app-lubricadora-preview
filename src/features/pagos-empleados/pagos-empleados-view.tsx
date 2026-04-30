"use client";

import {
  AlertCircle,
  CalendarDays,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import type { PagoEmpleado } from "@/types";
import { getPagosEmpleados } from "./actions";
import { PagoEmpleadoForm } from "./pago-empleado-form";
import { PagosEmpleadosTable } from "./pagos-empleados-table";

type EmpleadoOption = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
};

type TipoPagoFiltro =
  | "todos"
  | "sueldo"
  | "anticipo"
  | "bono"
  | "comision"
  | "descuento";

type PagosEmpleadosViewProps = {
  canManagePagos: boolean;
  empleados: EmpleadoOption[];
};

function formatMoney(value: number | string | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

export function PagosEmpleadosView({
  canManagePagos,
  empleados,
}: PagosEmpleadosViewProps) {
  const [pagos, setPagos] = useState<PagoEmpleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [empleadoId, setEmpleadoId] = useState("");
  const [tipoPago, setTipoPago] = useState<TipoPagoFiltro>("todos");

  const empleadosActivos = useMemo(
    () => empleados.filter((empleado) => empleado.activo),
    [empleados]
  );

  const resumen = useMemo(() => {
    const total = pagos.reduce((sum, pago) => sum + Number(pago.monto ?? 0), 0);

    return {
      totalPagos: pagos.length,
      totalMonto: total,
    };
  }, [pagos]);

  const hasFilters = Boolean(from || to || empleadoId || tipoPago !== "todos");

  const loadPagos = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getPagosEmpleados({
        from: from || undefined,
        to: to || undefined,
        empleado_id: empleadoId || undefined,
        tipo_pago: tipoPago,
      });

      setPagos(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los pagos de empleados.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [from, to, empleadoId, tipoPago]);

  function clearFilters() {
    setFrom("");
    setTo("");
    setEmpleadoId("");
    setTipoPago("todos");
  }

  useEffect(() => {
    loadPagos();
  }, [loadPagos]);

  return (
    <div className="grid gap-6">
      {canManagePagos ? (
        <Card
          title="Registrar pago de empleado"
          description="Guarda sueldos, anticipos, bonos, comisiones y descuentos."
        >
          <div className="grid gap-4">
            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-2 text-blue-600 shadow-sm">
                  <WalletCards className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold text-blue-700">Consejo</p>
                  <p className="mt-1 text-sm leading-6 text-blue-700/90">
                    Registra cada pago con fecha y período para que el dashboard
                    financiero muestre mejor los egresos del personal.
                  </p>
                </div>
              </div>
            </div>

            <PagoEmpleadoForm empleados={empleadosActivos} onCreated={loadPagos} />
          </div>
        </Card>
      ) : null}

      <Card
        title="Historial de pagos"
        description="Consulta los pagos registrados para cada empleado."
      >
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white p-3 text-slate-600 shadow-sm">
                  <Search className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Resultados
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {resumen.totalPagos}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-red-100 bg-red-50 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white p-3 text-red-600 shadow-sm">
                  <WalletCards className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                    Total filtrado
                  </p>
                  <p className="text-2xl font-black text-red-600">
                    {formatMoney(resumen.totalMonto)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-2xl bg-slate-100 p-2 text-slate-600">
                  <Filter className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Filtros</h3>
                  <p className="text-xs text-slate-500">
                    Filtra por fecha, empleado o tipo de pago.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {hasFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                    Limpiar
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={loadPagos}
                  disabled={loading}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 text-sm font-bold text-yellow-700 transition hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Actualizar
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  Desde
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  Hasta
                </label>
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  Empleado
                </label>
                <select
                  value={empleadoId}
                  onChange={(e) => setEmpleadoId(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                >
                  <option value="">Todos</option>
                  {empleadosActivos.map((empleado) => (
                    <option key={empleado.id} value={empleado.id}>
                      {empleado.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <WalletCards className="h-4 w-4 text-slate-400" />
                  Tipo de pago
                </label>
                <select
                  value={tipoPago}
                  onChange={(e) => setTipoPago(e.target.value as TipoPagoFiltro)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                >
                  <option value="todos">Todos</option>
                  <option value="sueldo">Sueldos</option>
                  <option value="anticipo">Anticipos</option>
                  <option value="bono">Bonos</option>
                  <option value="comision">Comisiones</option>
                  <option value="descuento">Descuentos</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-yellow-600" />
              <p className="mt-3 text-sm font-bold text-slate-600">
                Cargando pagos...
              </p>
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : (
            <PagosEmpleadosTable
              pagos={pagos}
              canManagePagos={canManagePagos}
            />
          )}
        </div>
      </Card>
    </div>
  );
}