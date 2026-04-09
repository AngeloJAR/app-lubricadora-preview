"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { deleteCombo, toggleComboActivo } from "./actions";
import type { Combo } from "@/types";

type ComboListProps = {
  initialCombos: Combo[];
  onRefresh?: () => Promise<void> | void;
  onEdit?: (comboId: string) => void;
};

function formatPrice(value: number | string | null | undefined) {
  return Number(value ?? 0).toFixed(2);
}

export function ComboList({
  initialCombos,
  onRefresh,
  onEdit,
}: ComboListProps) {
  const [combos, setCombos] = useState<Combo[]>(initialCombos);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "todos" | "activos" | "inactivos"
  >("todos");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCombos(initialCombos);
  }, [initialCombos]);

  const totalActivos = useMemo(
    () => combos.filter((combo) => combo.activo).length,
    [combos]
  );

  const totalInactivos = combos.length - totalActivos;

  const filteredCombos = useMemo(() => {
    const term = search.trim().toLowerCase();

    return combos.filter((combo) => {
      const matchesSearch =
        !term ||
        combo.nombre.toLowerCase().includes(term) ||
        combo.categoria.toLowerCase().includes(term) ||
        (combo.descripcion ?? "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "todos"
          ? true
          : statusFilter === "activos"
          ? combo.activo
          : !combo.activo;

      return matchesSearch && matchesStatus;
    });
  }, [combos, search, statusFilter]);

  async function refreshData() {
    if (onRefresh) {
      await onRefresh();
    }
  }

  async function handleToggle(comboId: string, activoActual: boolean) {
    try {
      setLoadingId(comboId);
      setError("");
      setSuccess("");

      const updated = await toggleComboActivo(comboId, !activoActual);

      setCombos((prev) =>
        prev.map((combo) => (combo.id === comboId ? updated : combo))
      );

      setSuccess(
        updated.activo
          ? "Combo activado correctamente."
          : "Combo desactivado correctamente."
      );

      await refreshData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo cambiar el estado";
      setError(message);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(comboId: string) {
    const confirmed = window.confirm("¿Seguro que deseas eliminar este combo?");

    if (!confirmed) {
      return;
    }

    try {
      setLoadingId(comboId);
      setError("");
      setSuccess("");

      await deleteCombo(comboId);

      setCombos((prev) => prev.filter((combo) => combo.id !== comboId));
      setSuccess("Combo eliminado correctamente.");

      await refreshData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo eliminar el combo";
      setError(message);
    } finally {
      setLoadingId(null);
    }
  }

  function handleRefreshClick() {
    setError("");
    setSuccess("");

    startTransition(async () => {
      await refreshData();
    });
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm text-gray-500">Total combos</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{combos.length}</p>
        </div>

        <div className="rounded-3xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-700">Combos activos</p>
          <p className="mt-2 text-3xl font-bold text-green-700">{totalActivos}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Combos inactivos</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalInactivos}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Catálogo
            </p>
            <h3 className="mt-1 text-xl font-semibold text-gray-900">
              Lista de combos
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Busca, filtra y administra los combos registrados.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={isPending}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              {isPending ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Buscar combo
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, categoría o descripción"
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-gray-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "todos" | "activos" | "inactivos"
                )
              }
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-gray-200"
            >
              <option value="todos">Todos</option>
              <option value="activos">Solo activos</option>
              <option value="inactivos">Solo inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      {filteredCombos.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-sm text-gray-500">
          {combos.length === 0
            ? "Aún no has creado combos."
            : "No hay combos que coincidan con la búsqueda o el filtro seleccionado."}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCombos.map((combo) => {
            const isLoading = loadingId === combo.id;

            return (
              <article
                key={combo.id}
                className="rounded-3xl border border-gray-200 bg-white p-5 transition hover:shadow-sm"
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_160px]">
                  <div className="grid gap-4 min-w-0">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xl font-semibold text-gray-900 wrap-break-word">
                            {combo.nombre}
                          </h4>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              combo.activo
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {combo.activo ? "Activo" : "Inactivo"}
                          </span>
                        </div>

                        <p className="mt-2 wrap-break-word text-sm leading-6 text-gray-500">
                          {combo.descripcion?.trim()
                            ? combo.descripcion
                            : "Sin descripción registrada"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 min-w-0">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          Categoría
                        </p>
                        <p className="mt-2 wrap-break-word text-sm font-medium leading-6 text-gray-800">
                          {combo.categoria}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 min-w-0">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          Precio combo
                        </p>
                        <p className="mt-2 text-lg font-semibold text-gray-900">
                          ${formatPrice(combo.precio_combo)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 sm:col-span-2 min-w-0">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          Estado
                        </p>
                        <p
                          className={`mt-2 wrap-break-word text-sm font-semibold leading-6 ${
                            combo.activo ? "text-green-700" : "text-gray-600"
                          }`}
                        >
                          {combo.activo
                            ? "Disponible para usar en órdenes"
                            : "No disponible para usar"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 self-start">
                    <button
                      type="button"
                      onClick={() => onEdit?.(combo.id)}
                      disabled={isLoading}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggle(combo.id, combo.activo)}
                      disabled={isLoading}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                    >
                      {isLoading
                        ? "Procesando..."
                        : combo.activo
                        ? "Desactivar"
                        : "Activar"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(combo.id)}
                      disabled={isLoading}
                      className="w-full rounded-xl border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      {isLoading ? "Procesando..." : "Eliminar"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}