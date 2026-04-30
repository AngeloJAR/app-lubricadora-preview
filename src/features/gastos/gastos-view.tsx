"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import type { Gasto } from "@/types";
import { getGastos } from "./actions";
import { GastoForm } from "./gasto-form";
import { GastosTable } from "./gastos-table";

type GastosViewProps = {
  canManageGastos: boolean;
};

type TipoGastoFiltro = "todos" | "fijo" | "variable";
type AmbitoFiltro = "todos" | "negocio" | "personal";
type MetodoPagoFiltro =
  | "todos"
  | "efectivo"
  | "transferencia"
  | "deuna"
  | "tarjeta"
  | "mixto";
type AfectaCajaFiltro = "todos" | "si" | "no";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

export function GastosView({ canManageGastos }: GastosViewProps) {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tipoGasto, setTipoGasto] = useState<TipoGastoFiltro>("todos");
  const [ambito, setAmbito] = useState<AmbitoFiltro>("todos");
  const [metodoPago, setMetodoPago] = useState<MetodoPagoFiltro>("todos");
  const [afectaCaja, setAfectaCaja] = useState<AfectaCajaFiltro>("todos");

  const filtrosActivos = useMemo(() => {
    return [
      from,
      to,
      tipoGasto !== "todos" ? tipoGasto : "",
      ambito !== "todos" ? ambito : "",
      metodoPago !== "todos" ? metodoPago : "",
      afectaCaja !== "todos" ? afectaCaja : "",
    ].filter(Boolean).length;
  }, [from, to, tipoGasto, ambito, metodoPago, afectaCaja]);

  const resumen = useMemo(() => {
    const total = gastos.reduce((acc, gasto) => acc + Number(gasto.monto ?? 0), 0);

    const negocio = gastos
      .filter((gasto) => gasto.ambito !== "personal")
      .reduce((acc, gasto) => acc + Number(gasto.monto ?? 0), 0);

    const personal = gastos
      .filter((gasto) => gasto.ambito === "personal")
      .reduce((acc, gasto) => acc + Number(gasto.monto ?? 0), 0);

    const afectaSaldos = gastos
      .filter((gasto) => gasto.afecta_caja)
      .reduce((acc, gasto) => acc + Number(gasto.monto ?? 0), 0);

    return {
      total,
      negocio,
      personal,
      afectaSaldos,
      cantidad: gastos.length,
    };
  }, [gastos]);

  const loadGastos = useCallback(async () => {
    try {
      setError("");

      const data = await getGastos({
        from: from || undefined,
        to: to || undefined,
        tipo_gasto: tipoGasto,
        ambito,
        metodo_pago: metodoPago,
        afecta_caja: afectaCaja,
      });

      setGastos(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar los gastos."
      );
    } finally {
      setLoading(false);
    }
  }, [from, to, tipoGasto, ambito, metodoPago, afectaCaja]);

  useEffect(() => {
    setLoading(true);
    loadGastos();
  }, [loadGastos]);

  function limpiarFiltros() {
    setFrom("");
    setTo("");
    setTipoGasto("todos");
    setAmbito("todos");
    setMetodoPago("todos");
    setAfectaCaja("todos");
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-yellow-600">
            Control de egresos
          </p>
          <h1 className="text-2xl font-black text-slate-900">Gastos</h1>
          <p className="max-w-3xl text-sm text-slate-500">
            Registra gastos del negocio o personales, separa gastos fijos y
            variables, y controla qué movimientos descuentan dinero de tus saldos.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
              Total gastos
            </p>
            <p className="mt-1 text-xl font-black text-red-700">
              {formatMoney(resumen.total)}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
              Negocio
            </p>
            <p className="mt-1 text-xl font-bold text-blue-700">
              {formatMoney(resumen.negocio)}
            </p>
          </div>

          <div className="rounded-2xl border border-pink-100 bg-pink-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-pink-400">
              Personal
            </p>
            <p className="mt-1 text-xl font-bold text-pink-700">
              {formatMoney(resumen.personal)}
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-400">
              Descontado
            </p>
            <p className="mt-1 text-xl font-bold text-orange-700">
              {formatMoney(resumen.afectaSaldos)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Registros
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {resumen.cantidad}
            </p>
          </div>
        </div>
      </section>

      {canManageGastos ? (
        <Card
          title="Registrar gasto"
          description="Guarda un gasto y decide si debe descontar dinero de caja, banco, DeUna o bóveda."
        >
          <div className="grid gap-4">
            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-bold text-blue-800">
                Recomendación
              </p>
              <p className="mt-1 text-sm text-blue-700">
                Usa “Negocio” para gastos operativos del taller. Usa “Personal”
                cuando el dinero sale para el dueño o uso fuera del negocio.
              </p>
            </div>

            <GastoForm onCreated={loadGastos} />
          </div>
        </Card>
      ) : null}

      <Card
        title="Historial de gastos"
        description="Consulta, filtra y revisa los gastos registrados."
      >
        <div className="grid gap-4">
          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Filtros de consulta
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {filtrosActivos > 0
                  ? `${filtrosActivos} filtro(s) aplicado(s).`
                  : "Mostrando todos los gastos registrados."}
              </p>
            </div>

            <button
              type="button"
              onClick={limpiarFiltros}
              disabled={filtrosActivos === 0}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Desde
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Hasta
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Tipo de gasto
              </label>
              <select
                value={tipoGasto}
                onChange={(e) =>
                  setTipoGasto(e.target.value as TipoGastoFiltro)
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
              >
                <option value="todos">Todos</option>
                <option value="fijo">Fijos</option>
                <option value="variable">Variables</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Ámbito
              </label>
              <select
                value={ambito}
                onChange={(e) => setAmbito(e.target.value as AmbitoFiltro)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
              >
                <option value="todos">Todos</option>
                <option value="negocio">Negocio</option>
                <option value="personal">Personal</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Método de pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) =>
                  setMetodoPago(e.target.value as MetodoPagoFiltro)
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
              >
                <option value="todos">Todos</option>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="deuna">DeUna</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="mixto">Mixto / Otro</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                ¿Descontó dinero?
              </label>
              <select
                value={afectaCaja}
                onChange={(e) =>
                  setAfectaCaja(e.target.value as AfectaCajaFiltro)
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
              >
                <option value="todos">Todos</option>
                <option value="si">Sí descontó</option>
                <option value="no">No descontó</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Cargando gastos...
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Consultando registros con los filtros aplicados.
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : (
            <GastosTable gastos={gastos} canManageGastos={canManageGastos} />
          )}
        </div>
      </Card>
    </div>
  );
}