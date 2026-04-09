"use client";

import { useMemo, useState } from "react";
import { createPagoEmpleado } from "./actions";
import type { PagoEmpleadoFormData } from "@/types";

type EmpleadoOption = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
};

type PagoEmpleadoFormProps = {
  empleados: EmpleadoOption[];
  onCreated?: () => Promise<void> | void;
};

const today = new Date().toISOString().split("T")[0];

const initialState: PagoEmpleadoFormData = {
  empleado_id: "",
  tipo_pago: "sueldo",
  monto: "",
  fecha_pago: today,
  periodo_inicio: "",
  periodo_fin: "",
  observaciones: "",
};

export function PagoEmpleadoForm({
  empleados,
  onCreated,
}: PagoEmpleadoFormProps) {
  const [form, setForm] = useState<PagoEmpleadoFormData>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField<K extends keyof PagoEmpleadoFormData>(
    key: K,
    value: PagoEmpleadoFormData[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const empleadoSeleccionado = useMemo(
    () => empleados.find((item) => item.id === form.empleado_id) ?? null,
    [empleados, form.empleado_id]
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.empleado_id.trim()) {
      setError("Debes seleccionar un empleado.");
      return;
    }

    if (!form.monto.trim() || Number(form.monto) <= 0) {
      setError("El monto debe ser mayor a 0.");
      return;
    }

    if (!form.fecha_pago.trim()) {
      setError("La fecha de pago es obligatoria.");
      return;
    }

    try {
      setLoading(true);

      await createPagoEmpleado(form);

      setSuccess("Pago registrado correctamente.");
      setForm({
        ...initialState,
        fecha_pago: today,
      });

      await onCreated?.();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo registrar el pago del empleado.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Empleado</label>
          <select
            value={form.empleado_id}
            onChange={(e) => updateField("empleado_id", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          >
            <option value="">Selecciona un empleado</option>
            {empleados.map((empleado) => (
              <option key={empleado.id} value={empleado.id}>
                {empleado.nombre} - {empleado.rol}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Tipo de pago</label>
          <select
            value={form.tipo_pago}
            onChange={(e) =>
              updateField(
                "tipo_pago",
                e.target.value as PagoEmpleadoFormData["tipo_pago"]
              )
            }
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          >
            <option value="sueldo">Sueldo</option>
            <option value="anticipo">Anticipo</option>
            <option value="bono">Bono</option>
            <option value="comision">Comisión</option>
            <option value="descuento">Descuento</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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

        <div>
          <label className="mb-1 block text-sm font-medium">Fecha de pago</label>
          <input
            type="date"
            value={form.fecha_pago}
            onChange={(e) => updateField("fecha_pago", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Observaciones</label>
          <input
            type="text"
            value={form.observaciones}
            onChange={(e) => updateField("observaciones", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Período inicio
          </label>
          <input
            type="date"
            value={form.periodo_inicio}
            onChange={(e) => updateField("periodo_inicio", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Período fin
          </label>
          <input
            type="date"
            value={form.periodo_fin}
            onChange={(e) => updateField("periodo_fin", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          />
        </div>
      </div>

      {empleadoSeleccionado ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Registrando pago para <strong>{empleadoSeleccionado.nombre}</strong>.
        </div>
      ) : null}

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
          {loading ? "Guardando..." : "Registrar pago"}
        </button>
      </div>
    </form>
  );
}