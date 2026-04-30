"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Save,
  UserRound,
} from "lucide-react";
import { createProveedor } from "./actions";

const inputClass =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-500";

export function ProveedorForm() {
  const [isPending, startTransition] = useTransition();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ruc, setRuc] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function resetForm() {
    setNombre("");
    setEmail("");
    setTelefono("");
    setRuc("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        await createProveedor({
          nombre,
          email,
          telefono,
          ruc,
        });

        resetForm();
        setSuccess("Proveedor creado correctamente.");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo crear el proveedor."
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <UserRound className="size-5" />
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-950">
            Registrar proveedor
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Guarda los datos básicos para usarlo en compras e importaciones XML.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label className={labelClass}>Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={inputClass}
            placeholder="Proveedor"
            required
          />
        </div>

        <div className="grid gap-2">
          <label className={labelClass}>RUC</label>
          <input
            value={ruc}
            onChange={(e) => setRuc(e.target.value)}
            className={inputClass}
            placeholder="1799999999001"
          />
        </div>

        <div className="grid gap-2">
          <label className={labelClass}>Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-3 size-5 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputClass} w-full pl-10`}
              placeholder="correo@proveedor.com"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label className={labelClass}>Teléfono</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-3 size-5 text-slate-400" />
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={`${inputClass} w-full pl-10`}
              placeholder="0999999999"
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {success}
        </div>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="size-4" />
              Guardar proveedor
            </>
          )}
        </button>
      </div>
    </form>
  );
}