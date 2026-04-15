"use client";

import { useState } from "react";
import { createGasto } from "./actions";
import type { GastoFormData } from "@/types";

type GastoFormProps = {
  onCreated?: () => Promise<void> | void;
};

const today = new Date().toISOString().split("T")[0];

const initialState: GastoFormData = {
  categoria: "",
  descripcion: "",
  monto: "",
  fecha: today,
  tipo_gasto: "variable",
  ambito: "negocio",
  metodo_pago: "efectivo",
  afecta_caja: true,
  cuenta: "caja",
  origen_fondo: "negocio",
  naturaleza: "gasto_operativo",
};

export function GastoForm({ onCreated }: GastoFormProps) {
  const [form, setForm] = useState<GastoFormData>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField<K extends keyof GastoFormData>(
    key: K,
    value: GastoFormData[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.categoria.trim()) {
      setError("La categoría es obligatoria.");
      return;
    }

    if (!form.monto.trim() || Number(form.monto) <= 0) {
      setError("El monto debe ser mayor a 0.");
      return;
    }

    if (!form.fecha.trim()) {
      setError("La fecha es obligatoria.");
      return;
    }

    try {
      setLoading(true);

      await createGasto(form);

      setSuccess(
        form.afecta_caja
          ? "Gasto registrado correctamente y descontado de caja."
          : "Gasto registrado correctamente."
      );

      setForm({
        ...initialState,
        fecha: today,
      });

      await onCreated?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo registrar el gasto.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Categoría</label>
          <input
            type="text"
            value={form.categoria}
            onChange={(e) => updateField("categoria", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Ej: agua, luz, arriendo, comida, transporte"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Monto</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.monto}
            onChange={(e) => updateField("monto", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Fecha</label>
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => updateField("fecha", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Tipo de gasto</label>
          <select
            value={form.tipo_gasto}
            onChange={(e) =>
              updateField(
                "tipo_gasto",
                e.target.value as GastoFormData["tipo_gasto"]
              )
            }
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          >
            <option value="variable">Variable</option>
            <option value="fijo">Fijo</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Ámbito</label>
          <select
            value={form.ambito}
            onChange={(e) =>
              updateField("ambito", e.target.value as GastoFormData["ambito"])
            }
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          >
            <option value="negocio">Negocio</option>
            <option value="personal">Personal</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Método de pago</label>
          <select
            value={form.metodo_pago}
            onChange={(e) =>
              updateField(
                "metodo_pago",
                e.target.value as GastoFormData["metodo_pago"]
              )
            }
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="deuna">DeUna</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="mixto">Otro</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">¿Afecta caja?</label>
          <select
            value={form.afecta_caja ? "si" : "no"}
            onChange={(e) => updateField("afecta_caja", e.target.value === "si")}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          >
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Descripción</label>
          <input
            type="text"
            value={form.descripcion}
            onChange={(e) => updateField("descripcion", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Detalle opcional"
          />
        </div>
      </div>

      <div
        className={`rounded-2xl px-4 py-3 ${
          form.afecta_caja
            ? "border border-amber-200 bg-amber-50"
            : "border border-blue-200 bg-blue-50"
        }`}
      >
        <p
          className={`text-sm font-medium ${
            form.afecta_caja ? "text-amber-800" : "text-blue-800"
          }`}
        >
          Importante
        </p>

        <p
          className={`mt-1 text-sm ${
            form.afecta_caja ? "text-amber-700" : "text-blue-700"
          }`}
        >
          {form.afecta_caja
            ? "Este gasto se registrará también como egreso en la caja abierta."
            : "Este gasto se guardará sin afectar la caja."}
        </p>
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
          disabled={loading}
          className="rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Registrar gasto"}
        </button>
      </div>
    </form>
  );
}