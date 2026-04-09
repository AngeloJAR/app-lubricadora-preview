"use client";

import { useState } from "react";
import { updateServicio } from "./actions";
import type { Servicio, ServicioFormData } from "@/types";

type ServicioEditFormProps = {
  servicio: Servicio;
  onUpdated?: () => Promise<void> | void;
};

export function ServicioEditForm({
  servicio,
  onUpdated,
}: ServicioEditFormProps) {
  const [form, setForm] = useState<ServicioFormData>({
    nombre: servicio.nombre,
    categoria: servicio.categoria,
    descripcion: servicio.descripcion || "",
    precio_base: String(servicio.precio_base),
    duracion_estimada_min: servicio.duracion_estimada_min
      ? String(servicio.duracion_estimada_min)
      : "",
    activo: servicio.activo,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField<K extends keyof ServicioFormData>(
    key: K,
    value: ServicioFormData[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      await updateServicio(servicio.id, form);

      if (onUpdated) {
        await onUpdated();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo actualizar el servicio.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={form.nombre}
          onChange={(e) => updateField("nombre", e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          placeholder="Nombre"
        />
        <input
          value={form.categoria}
          onChange={(e) => updateField("categoria", e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          placeholder="Categoría"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          type="number"
          step="0.01"
          value={form.precio_base}
          onChange={(e) => updateField("precio_base", e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          placeholder="Precio base"
        />
        <input
          type="number"
          value={form.duracion_estimada_min}
          onChange={(e) =>
            updateField("duracion_estimada_min", e.target.value)
          }
          className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          placeholder="Duración"
        />
      </div>

      <textarea
        value={form.descripcion}
        onChange={(e) => updateField("descripcion", e.target.value)}
        className="min-h-20 w-full rounded-xl border border-gray-300 px-3 py-2 whitespace-pre-line outline-none focus:border-black"
        placeholder="Descripción"
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.activo}
          onChange={(e) => updateField("activo", e.target.checked)}
        />
        Activo
      </label>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
      >
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}