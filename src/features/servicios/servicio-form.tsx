"use client";

import { useMemo, useState } from "react";
import { createServicio } from "./actions";
import { SERVICIOS_ORDEN_BASE } from "@/features/ordenes/constants";
import type { ServicioFormData } from "@/types";

const initialState: ServicioFormData = {
  nombre: "",
  categoria: "",
  descripcion: "",
  precio_base: "0",
  duracion_estimada_min: "",
  activo: true,
};

type ServicioFormProps = {
  onCreated?: () => Promise<void> | void;
};

export function ServicioForm({ onCreated }: ServicioFormProps) {
  const [form, setForm] = useState<ServicioFormData>(initialState);
  const [servicioBaseSeleccionado, setServicioBaseSeleccionado] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const serviciosBaseOptions = useMemo(() => SERVICIOS_ORDEN_BASE, []);

  function updateField<K extends keyof ServicioFormData>(
    key: K,
    value: ServicioFormData[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleSeleccionServicioBase(codigo: string) {
    setServicioBaseSeleccionado(codigo);

    const servicioBase = SERVICIOS_ORDEN_BASE.find(
      (item) => item.codigo === codigo
    );

    if (!servicioBase) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      nombre: servicioBase.nombre,
      categoria: servicioBase.categoria,
      descripcion: servicioBase.tareas.map((tarea) => `• ${tarea}`).join("\n"),
      precio_base: String(servicioBase.precio),
      duracion_estimada_min: prev.duracion_estimada_min,
      activo: true,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.nombre.trim()) {
      setError("El nombre del servicio es obligatorio.");
      return;
    }

    if (!form.categoria.trim()) {
      setError("La categoría es obligatoria.");
      return;
    }

    try {
      setLoading(true);
      await createServicio(form);
      setSuccess("Servicio creado correctamente.");
      setForm(initialState);
      setServicioBaseSeleccionado("");

      if (onCreated) {
        await onCreated();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo crear el servicio.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">
          Cargar desde servicios base
        </label>
        <select
          value={servicioBaseSeleccionado}
          onChange={(e) => handleSeleccionServicioBase(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
        >
          <option value="">Selecciona un servicio base</option>
          {serviciosBaseOptions.map((servicio) => (
            <option key={servicio.codigo} value={servicio.codigo}>
              {servicio.nombre} - ${servicio.precio}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Nombre</label>
          <input
            value={form.nombre}
            onChange={(e) => updateField("nombre", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Cambio de aceite"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Categoría</label>
          <input
            value={form.categoria}
            onChange={(e) => updateField("categoria", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Mantenimiento"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Precio base</label>
          <input
            type="number"
            step="0.01"
            value={form.precio_base}
            onChange={(e) => updateField("precio_base", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="25.00"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Duración estimada (min)
          </label>
          <input
            type="number"
            value={form.duracion_estimada_min}
            onChange={(e) =>
              updateField("duracion_estimada_min", e.target.value)
            }
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="30"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Descripción</label>
        <textarea
          value={form.descripcion}
          onChange={(e) => updateField("descripcion", e.target.value)}
          className="min-h-25 w-full rounded-xl border border-gray-300 px-3 py-2 whitespace-pre-line outline-none focus:border-black"
          placeholder="Describe el servicio..."
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.activo}
          onChange={(e) => updateField("activo", e.target.checked)}
        />
        Servicio activo
      </label>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-yellow-500 border border-yellow-300 text-white px-4 py-2 text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar servicio"}
        </button>
      </div>
    </form>
  );
}