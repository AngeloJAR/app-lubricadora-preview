"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100";

const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700";

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
      await onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
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
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Nombres</label>
          <input
            value={form.nombres}
            onChange={(e) => updateField("nombres", e.target.value)}
            className={inputClass}
            placeholder="Ángelo"
          />
        </div>

        <div>
          <label className={labelClass}>Apellidos</label>
          <input
            value={form.apellidos}
            onChange={(e) => updateField("apellidos", e.target.value)}
            className={inputClass}
            placeholder="Andino"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Teléfono</label>
          <input
            value={form.telefono}
            onChange={(e) => updateField("telefono", e.target.value)}
            className={inputClass}
            placeholder="0999999999"
          />
        </div>

        <div>
          <label className={labelClass}>WhatsApp</label>
          <input
            value={form.whatsapp}
            onChange={(e) => updateField("whatsapp", e.target.value)}
            className={inputClass}
            placeholder="0999999999"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Correo</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className={inputClass}
            placeholder="cliente@email.com"
          />
        </div>

        <div>
          <label className={labelClass}>Cédula / RUC</label>
          <input
            value={form.cedula_ruc}
            onChange={(e) => updateField("cedula_ruc", e.target.value)}
            className={inputClass}
            placeholder="1234567890"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Notas</label>
        <textarea
          value={form.notas}
          onChange={(e) => updateField("notas", e.target.value)}
          className={`${inputClass} min-h-28 resize-none`}
          placeholder="Observaciones del cliente..."
        />
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={form.acepta_promociones}
          onChange={(e) => updateField("acepta_promociones", e.target.checked)}
          className="h-4 w-4 accent-yellow-500"
        />
        Acepta promociones y recordatorios
      </label>

      {error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      ) : null}

      <div>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Guardar cliente
            </>
          )}
        </Button>
      </div>
    </form>
  );
}