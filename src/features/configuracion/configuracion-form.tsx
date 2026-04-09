"use client";

import { useEffect, useState } from "react";
import {
  getConfiguracionTaller,
  upsertConfiguracionTaller,
  uploadLogoTaller,
} from "./actions";
import type {
  ConfiguracionTaller,
  ConfiguracionTallerFormData,
} from "@/types";

const initialState: ConfiguracionTallerFormData = {
  nombre_negocio: "",
  telefono: "",
  whatsapp: "",
  direccion: "",
  mensaje_final: "",
  moneda: "USD",
  logo_url: "",
  margen_ganancia: "45",
};

export function ConfiguracionForm() {
  const [configuracion, setConfiguracion] = useState<ConfiguracionTaller | null>(null);
  const [form, setForm] = useState<ConfiguracionTallerFormData>(initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadConfiguracion() {
      try {
        const data = await getConfiguracionTaller();
        setConfiguracion(data);

        if (data) {
          setForm({
            nombre_negocio: data.nombre_negocio ?? "",
            telefono: data.telefono ?? "",
            whatsapp: data.whatsapp ?? "",
            direccion: data.direccion ?? "",
            mensaje_final: data.mensaje_final ?? "",
            moneda: data.moneda ?? "USD",
            logo_url: data.logo_url ?? "",
            margen_ganancia: String(data.margen_ganancia ?? 45),
          });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo cargar la configuración.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadConfiguracion();
  }, []);

  function updateField<K extends keyof ConfiguracionTallerFormData>(
    key: K,
    value: ConfiguracionTallerFormData[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setError("");
      setSuccess("");
      setUploadingLogo(true);

      const logoUrl = await uploadLogoTaller(file);

      setForm((prev) => ({
        ...prev,
        logo_url: logoUrl,
      }));

      setSuccess("Logo subido correctamente. Guarda la configuración para aplicarlo.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo subir el logo.";
      setError(message);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.nombre_negocio.trim()) {
      setError("El nombre del negocio es obligatorio.");
      return;
    }

    if (!form.margen_ganancia.trim()) {
      setError("El margen de ganancia es obligatorio.");
      return;
    }

    if (Number(form.margen_ganancia) < 0) {
      setError("El margen de ganancia no puede ser negativo.");
      return;
    }

    try {
      setSaving(true);
      const saved = await upsertConfiguracionTaller(form, configuracion?.id);
      setConfiguracion(saved);
      setForm((prev) => ({
        ...prev,
        margen_ganancia: String(saved.margen_ganancia ?? 45),
      }));
      setSuccess("Configuración guardada correctamente.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo guardar la configuración.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-gray-600">Cargando configuración...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Nombre del taller</label>
          <input
            value={form.nombre_negocio}
            onChange={(e) => updateField("nombre_negocio", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="AYR Motors Mecánica"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Moneda</label>
          <input
            value={form.moneda}
            onChange={(e) => updateField("moneda", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="USD"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Teléfono</label>
          <input
            value={form.telefono}
            onChange={(e) => updateField("telefono", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="0999999999"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">WhatsApp</label>
          <input
            value={form.whatsapp}
            onChange={(e) => updateField("whatsapp", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="0999999999"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Dirección</label>
          <input
            value={form.direccion}
            onChange={(e) => updateField("direccion", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Alfaro, Ecuador"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Margen de ganancia (%)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.margen_ganancia}
            onChange={(e) => updateField("margen_ganancia", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="45"
          />
          <p className="mt-1 text-xs text-gray-500">
            Ejemplo: 45 = 45% de ganancia.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Subir logo</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          />
          {uploadingLogo ? (
            <p className="mt-2 text-sm text-gray-500">Subiendo logo...</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Logo URL</label>
          <input
            value={form.logo_url}
            onChange={(e) => updateField("logo_url", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="https://..."
          />
        </div>

        {form.logo_url ? (
          <div className="rounded-2xl border border-gray-200 p-4">
            <p className="mb-2 text-sm font-medium text-gray-700">Vista previa</p>
            <img
              src={form.logo_url}
              alt="Logo del taller"
              className="max-h-24 w-auto object-contain"
            />
          </div>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Mensaje final</label>
        <textarea
          value={form.mensaje_final}
          onChange={(e) => updateField("mensaje_final", e.target.value)}
          className="min-h-25 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          placeholder="Gracias por su visita..."
        />
      </div>

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
          disabled={saving}
          className="rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
    </form>
  );
}