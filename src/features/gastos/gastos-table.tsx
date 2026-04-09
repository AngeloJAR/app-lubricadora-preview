"use client";

import { useState } from "react";
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
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function getCategoriaClass(categoria?: string | null) {
  const value = (categoria ?? "").toLowerCase();

  if (value.includes("combust")) {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  if (value.includes("compra") || value.includes("insumo")) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (value.includes("sueldo") || value.includes("pago")) {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

function getTipoGastoClass(tipo?: string | null) {
  if (tipo === "fijo") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getAmbitoClass(ambito?: string) {
  return ambito === "personal"
    ? "border-pink-200 bg-pink-50 text-pink-700"
    : "border-blue-200 bg-blue-50 text-blue-700";
}

function getMetodoClass(metodo?: string) {
  if (metodo === "efectivo") return "bg-gray-100 text-gray-700";
  if (metodo === "transferencia") return "bg-indigo-100 text-indigo-700";
  if (metodo === "deuna") return "bg-green-100 text-green-700";
  if (metodo === "tarjeta") return "bg-purple-100 text-purple-700";

  return "bg-gray-100 text-gray-700";
}

export function GastosTable({
  gastos,
  canManageGastos,
}: GastosTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  async function handleDelete(gastoId: string) {
    const confirmed = window.confirm(
      "¿Seguro que quieres eliminar este gasto?"
    );

    if (!confirmed) return;

    try {
      setLoadingId(gastoId);
      setErrorById((prev) => ({
        ...prev,
        [gastoId]: "",
      }));

      await deleteGasto(gastoId);

      window.location.reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo eliminar el gasto.";

      setErrorById((prev) => ({
        ...prev,
        [gastoId]: message,
      }));
    } finally {
      setLoadingId(null);
    }
  }

  if (gastos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
        No hay gastos registrados todavía.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {gastos.map((gasto) => {
        const isLoading = loadingId === gasto.id;

        return (
          <article
            key={gasto.id}
            className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:justify-between">
                <div className="grid flex-1 gap-4">
                  {/* HEADER */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {gasto.categoria}
                      </h3>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${getCategoriaClass(
                          gasto.categoria
                        )}`}
                      >
                        {gasto.categoria}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${getTipoGastoClass(
                          gasto.tipo_gasto
                        )}`}
                      >
                        {gasto.tipo_gasto === "fijo" ? "Fijo" : "Variable"}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${getAmbitoClass(
                          gasto.ambito
                        )}`}
                      >
                        {gasto.ambito === "personal" ? "Personal" : "Negocio"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      {gasto.descripcion?.trim() ||
                        "Sin descripción registrada."}
                    </p>
                  </div>

                  {/* INFO */}
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-2xl border bg-gray-50 px-4 py-4">
                      <p className="text-xs text-gray-400">Fecha</p>
                      <p className="mt-1 font-medium">
                        {formatFecha(gasto.fecha)}
                      </p>
                    </div>

                    <div className="rounded-2xl border bg-gray-50 px-4 py-4">
                      <p className="text-xs text-gray-400">Monto</p>
                      <p className="mt-1 text-lg font-semibold text-red-600">
                        {formatMoney(gasto.monto)}
                      </p>
                    </div>

                    <div className="rounded-2xl border bg-gray-50 px-4 py-4">
                      <p className="text-xs text-gray-400">Método</p>
                      <span
                        className={`mt-1 inline-block rounded px-2 py-1 text-xs font-medium ${getMetodoClass(
                          gasto.metodo_pago
                        )}`}
                      >
                        {gasto.metodo_pago}
                      </span>
                    </div>

                    <div className="rounded-2xl border bg-gray-50 px-4 py-4">
                      <p className="text-xs text-gray-400">Caja</p>
                      <p
                        className={`mt-1 text-sm font-medium ${
                          gasto.afecta_caja
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {gasto.afecta_caja
                          ? "Sí afecta"
                          : "No afecta"}
                      </p>
                    </div>

                    <div className="rounded-2xl border bg-gray-50 px-4 py-4">
                      <p className="text-xs text-gray-400">Ámbito</p>
                      <p className="mt-1 text-sm font-medium">
                        {gasto.ambito}
                      </p>
                    </div>
                  </div>

                  {errorById[gasto.id] && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorById[gasto.id]}
                    </div>
                  )}
                </div>

                {canManageGastos && (
                  <div className="grid gap-2 xl:w-40">
                    <button
                      onClick={() => handleDelete(gasto.id)}
                      disabled={isLoading}
                      className="rounded-xl border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {isLoading ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}