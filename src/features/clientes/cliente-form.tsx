"use client";

import { useEffect, useState } from "react";
import { createCliente } from "./actions";
import type { ClienteFormData } from "@/types";

const initialState: ClienteFormData = {
  nombres: "",
  apellidos: "",
  telefono: "",
  whatsapp: "",
  email: "",
  cedula_ruc: "",
  notas: "",
  acepta_promociones: false,
};


type ClienteFormProps = {
  onCreated?: () => Promise<void> | void;
};

export function ClienteForm({ onCreated }: ClienteFormProps) {
  const [form, setForm] = useState<ClienteFormData>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField<K extends keyof ClienteFormData>(
    key: K,
    value: ClienteFormData[K]
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

    if (!form.nombres.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (!form.apellidos.trim()) {
      setError("El apellido es obligatorio.");
      return;
    }

    if (!form.telefono.trim()) {
      setError("El teléfono es obligatorio.");
      return;
    }

    try {
      setLoading(true);
      await createCliente(form);
      setSuccess("Cliente creado correctamente.");
      setForm(initialState);

      if (onCreated) {
        await onCreated();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ocurrió un error inesperado.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  const telefono = localStorage.getItem("nuevo_cliente_telefono");

  if (telefono) {
    setForm((prev) => ({
      ...prev,
      telefono,
      whatsapp: telefono,
    }));

    localStorage.removeItem("nuevo_cliente_telefono");
  }
}, []);

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Nombres</label>
          <input
            value={form.nombres}
            onChange={(e) => updateField("nombres", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Ángelo"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Apellidos</label>
          <input
            value={form.apellidos}
            onChange={(e) => updateField("apellidos", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Andino"
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
          <label className="mb-1 block text-sm font-medium">Correo</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="cliente@email.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Cédula / RUC</label>
          <input
            value={form.cedula_ruc}
            onChange={(e) => updateField("cedula_ruc", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="1234567890"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notas</label>
        <textarea
          value={form.notas}
          onChange={(e) => updateField("notas", e.target.value)}
          className="min-h-25 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          placeholder="Observaciones del cliente..."
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.acepta_promociones}
          onChange={(e) =>
            updateField("acepta_promociones", e.target.checked)
          }
        />
        Acepta promociones y recordatorios
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
          className="rounded-xl bg-yellow-500 border border-yellow-300 text-white px-4 py-2 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar cliente"}
        </button>
      </div>
    </form>
  );
}