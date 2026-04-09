"use client";

import { useState } from "react";
import { deleteServicio, toggleServicioActivo } from "./actions";
import { ServicioEditForm } from "./servicio-edit-form";
import type { Servicio } from "@/types";

type ServiciosTableProps = {
  servicios: Servicio[];
  onChanged?: () => Promise<void> | void;
  canManageServicios: boolean;
};

function formatPrice(value: number | string | null | undefined) {
  return Number(value ?? 0).toFixed(2);
}

export function ServiciosTable({
  servicios,
  onChanged,
  canManageServicios,
}: ServiciosTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleToggle(servicio: Servicio) {
    try {
      setLoadingId(servicio.id);
      await toggleServicioActivo(servicio.id, !servicio.activo);

      if (onChanged) {
        await onChanged();
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(servicio: Servicio) {
    const ok = window.confirm("¿Eliminar este servicio?");
    if (!ok) return;

    try {
      setLoadingId(servicio.id);
      await deleteServicio(servicio.id);

      if (onChanged) {
        await onChanged();
      }
    } finally {
      setLoadingId(null);
    }
  }

  if (servicios.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
        No hay servicios registrados todavía.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {servicios.map((servicio) => {
        const isLoading = loadingId === servicio.id;
        const isEditing = editingId === servicio.id;

        return (
          <article
            key={servicio.id}
            className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 grid gap-4 flex-1">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-gray-900 wrap-break-word">
                        {servicio.nombre}
                      </h3>

                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                          servicio.activo
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-gray-200 bg-gray-50 text-gray-600"
                        }`}
                      >
                        {servicio.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-gray-500 wrap-break-word">
                      {servicio.descripcion || "Sin descripción registrada."}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Categoría
                      </p>
                      <p className="mt-2 text-sm font-medium text-gray-900 wrap-break-word">
                        {servicio.categoria}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Precio base
                      </p>
                      <p className="mt-2 text-lg font-semibold text-gray-900">
                        ${formatPrice(servicio.precio_base)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 sm:col-span-2 xl:col-span-1">
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Duración estimada
                      </p>
                      <p className="mt-2 text-sm font-medium text-gray-900">
                        {servicio.duracion_estimada_min ?? "-"} min
                      </p>
                    </div>
                  </div>
                </div>

                {canManageServicios ? (
                  <div className="grid gap-2 xl:w-37.5">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingId((prev) =>
                          prev === servicio.id ? null : servicio.id
                        )
                      }
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      {isEditing ? "Cerrar edición" : "Editar"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggle(servicio)}
                      disabled={isLoading}
                      className="rounded-xl border border-yellow-300 bg-yellow-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-95 disabled:opacity-60"
                    >
                      {isLoading
                        ? "Actualizando..."
                        : servicio.activo
                        ? "Desactivar"
                        : "Activar"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(servicio)}
                      disabled={isLoading}
                      className="rounded-xl border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      Eliminar
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {canManageServicios && isEditing ? (
              <div className="border-t border-gray-200 bg-gray-50/70 px-5 py-4">
                <ServicioEditForm
                  servicio={servicio}
                  onUpdated={async () => {
                    setEditingId(null);

                    if (onChanged) {
                      await onChanged();
                    }
                  }}
                />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}