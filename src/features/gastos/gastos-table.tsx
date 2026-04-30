"use client";

import { useMemo, useState } from "react";
import type { Gasto } from "@/types";
import { deleteGasto } from "./actions";

type GastosTableProps = {
  gastos: Gasto[];
  canManageGastos: boolean;
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
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0));
}

function getCategoriaClass(categoria?: string | null) {
  const value = (categoria ?? "").toLowerCase();

  if (value.includes("combust")) return "border-yellow-200 bg-yellow-50 text-yellow-700";
  if (value.includes("compra") || value.includes("insumo")) return "border-blue-200 bg-blue-50 text-blue-700";
  if (value.includes("sueldo") || value.includes("pago")) return "border-purple-200 bg-purple-50 text-purple-700";
  if (value.includes("luz") || value.includes("agua") || value.includes("internet")) return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (value.includes("arriendo")) return "border-orange-200 bg-orange-50 text-orange-700";

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getTipoGastoClass(tipo?: string | null) {
  return tipo === "fijo"
    ? "border-orange-200 bg-orange-50 text-orange-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getAmbitoClass(ambito?: string | null) {
  return ambito === "personal"
    ? "border-pink-200 bg-pink-50 text-pink-700"
    : "border-blue-200 bg-blue-50 text-blue-700";
}

function getMetodoClass(metodo?: string | null) {
  if (metodo === "efectivo") return "bg-slate-100 text-slate-700";
  if (metodo === "transferencia") return "bg-indigo-100 text-indigo-700";
  if (metodo === "deuna") return "bg-green-100 text-green-700";
  if (metodo === "tarjeta") return "bg-purple-100 text-purple-700";

  return "bg-slate-100 text-slate-700";
}

function labelMetodo(metodo?: string | null) {
  if (metodo === "efectivo") return "Efectivo";
  if (metodo === "transferencia") return "Transferencia";
  if (metodo === "deuna") return "DeUna";
  if (metodo === "tarjeta") return "Tarjeta";
  if (metodo === "mixto") return "Otro";

  return metodo || "-";
}

export function GastosTable({ gastos, canManageGastos }: GastosTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filtroAmbito, setFiltroAmbito] = useState<"todos" | "negocio" | "personal">("todos");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "fijo" | "variable">("todos");

  const gastosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase();

    return gastos.filter((gasto) => {
      const matchesSearch =
        !term ||
        gasto.categoria?.toLowerCase().includes(term) ||
        gasto.descripcion?.toLowerCase().includes(term) ||
        gasto.metodo_pago?.toLowerCase().includes(term);

      const matchesAmbito =
        filtroAmbito === "todos" || gasto.ambito === filtroAmbito;

      const matchesTipo =
        filtroTipo === "todos" || gasto.tipo_gasto === filtroTipo;

      return matchesSearch && matchesAmbito && matchesTipo;
    });
  }, [gastos, search, filtroAmbito, filtroTipo]);

  const resumen = useMemo(() => {
    const total = gastosFiltrados.reduce(
      (acc, gasto) => acc + Number(gasto.monto ?? 0),
      0
    );

    const negocio = gastosFiltrados
      .filter((gasto) => gasto.ambito !== "personal")
      .reduce((acc, gasto) => acc + Number(gasto.monto ?? 0), 0);

    const personal = gastosFiltrados
      .filter((gasto) => gasto.ambito === "personal")
      .reduce((acc, gasto) => acc + Number(gasto.monto ?? 0), 0);

    return {
      total,
      negocio,
      personal,
      cantidad: gastosFiltrados.length,
    };
  }, [gastosFiltrados]);

  async function handleDelete(gastoId: string) {
    const confirmed = window.confirm("¿Seguro que quieres eliminar este gasto?");
    if (!confirmed) return;

    try {
      setLoadingId(gastoId);
      setErrorById((prev) => ({ ...prev, [gastoId]: "" }));

      await deleteGasto(gastoId);

      window.location.reload();
    } catch (err) {
      setErrorById((prev) => ({
        ...prev,
        [gastoId]:
          err instanceof Error ? err.message : "No se pudo eliminar el gasto.",
      }));
    } finally {
      setLoadingId(null);
    }
  }

  if (gastos.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
        <p className="text-sm font-semibold text-slate-700">
          No hay gastos registrados todavía.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Cuando registres gastos aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
              Total filtrado
            </p>
            <p className="mt-1 text-2xl font-black text-red-700">
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

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Registros
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {resumen.cantidad}
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
            placeholder="Buscar por categoría, descripción o método..."
          />

          <select
            value={filtroAmbito}
            onChange={(e) =>
              setFiltroAmbito(e.target.value as "todos" | "negocio" | "personal")
            }
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
          >
            <option value="todos">Todos los ámbitos</option>
            <option value="negocio">Negocio</option>
            <option value="personal">Personal</option>
          </select>

          <select
            value={filtroTipo}
            onChange={(e) =>
              setFiltroTipo(e.target.value as "todos" | "fijo" | "variable")
            }
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
          >
            <option value="todos">Todos los tipos</option>
            <option value="fijo">Fijos</option>
            <option value="variable">Variables</option>
          </select>
        </div>
      </div>

      {gastosFiltrados.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          No hay gastos que coincidan con los filtros.
        </div>
      ) : (
        <div className="grid gap-4">
          {gastosFiltrados.map((gasto) => {
            const isLoading = loadingId === gasto.id;

            return (
              <article
                key={gasto.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="grid gap-4 p-5 xl:grid-cols-[1fr_170px]">
                  <div className="grid gap-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black text-slate-900">
                            {gasto.categoria || "Sin categoría"}
                          </h3>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${getTipoGastoClass(
                              gasto.tipo_gasto
                            )}`}
                          >
                            {gasto.tipo_gasto === "fijo" ? "Fijo" : "Variable"}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${getAmbitoClass(
                              gasto.ambito
                            )}`}
                          >
                            {gasto.ambito === "personal" ? "Personal" : "Negocio"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {gasto.descripcion?.trim() ||
                            "Sin descripción registrada."}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-red-50 px-4 py-3 text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                          Monto
                        </p>
                        <p className="text-2xl font-black text-red-700">
                          {formatMoney(gasto.monto)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Fecha
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-800">
                          {formatFecha(gasto.fecha)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Categoría
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getCategoriaClass(
                            gasto.categoria
                          )}`}
                        >
                          {gasto.categoria || "-"}
                        </span>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Método
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getMetodoClass(
                            gasto.metodo_pago
                          )}`}
                        >
                          {labelMetodo(gasto.metodo_pago)}
                        </span>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Saldos
                        </p>
                        <p
                          className={`mt-1 text-sm font-bold ${
                            gasto.afecta_caja ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {gasto.afecta_caja ? "Sí descuenta" : "No descuenta"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Ámbito
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-800">
                          {gasto.ambito === "personal" ? "Personal" : "Negocio"}
                        </p>
                      </div>
                    </div>

                    {errorById[gasto.id] ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {errorById[gasto.id]}
                      </div>
                    ) : null}
                  </div>

                  {canManageGastos ? (
                    <div className="flex items-start xl:justify-end">
                      <button
                        type="button"
                        onClick={() => handleDelete(gasto.id)}
                        disabled={isLoading}
                        className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 xl:w-auto"
                      >
                        {isLoading ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}