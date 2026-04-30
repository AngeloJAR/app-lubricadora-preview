"use client";

import {
  AlertCircle,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Eraser,
  Loader2,
  Mail,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
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

const tipoPagoLabels: Record<PagoEmpleadoFormData["tipo_pago"], string> = {
  sueldo: "Sueldo",
  anticipo: "Anticipo",
  bono: "Bono",
  comision: "Comisión",
  descuento: "Descuento",
};

const tipoPagoDescriptions: Record<PagoEmpleadoFormData["tipo_pago"], string> = {
  sueldo: "Pago normal del período laboral.",
  anticipo: "Adelanto entregado al empleado.",
  bono: "Reconocimiento o incentivo adicional.",
  comision: "Pago por ventas o trabajos realizados.",
  descuento: "Valor descontado al empleado.",
};

function formatMoney(value: string) {
  const number = Number(value || 0);
  return number.toFixed(2);
}

function FieldBox({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span className="text-slate-400">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

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
    setError("");
    setSuccess("");

    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm({
      ...initialState,
      fecha_pago: today,
    });
    setError("");
    setSuccess("");
  }

  const empleadosActivos = useMemo(
    () => empleados.filter((empleado) => empleado.activo),
    [empleados]
  );

  const empleadoSeleccionado = useMemo(
    () => empleados.find((item) => item.id === form.empleado_id) ?? null,
    [empleados, form.empleado_id]
  );

  const montoNumber = Number(form.monto || 0);

  const periodoCompleto = Boolean(form.periodo_inicio && form.periodo_fin);

  const periodoInvalido =
    periodoCompleto && form.periodo_fin < form.periodo_inicio;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.empleado_id.trim()) {
      setError("Debes seleccionar un empleado.");
      return;
    }

    if (!form.monto.trim() || montoNumber <= 0) {
      setError("El monto debe ser mayor a 0.");
      return;
    }

    if (!form.fecha_pago.trim()) {
      setError("La fecha de pago es obligatoria.");
      return;
    }

    if (periodoInvalido) {
      setError("El período fin no puede ser menor al período inicio.");
      return;
    }

    try {
      setLoading(true);

      await createPagoEmpleado(form);

      setSuccess("Pago registrado correctamente.");
      resetForm();

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
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-yellow-100 p-3 text-yellow-700">
              <WalletCards className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Registrar pago de empleado
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Controla sueldos, anticipos, bonos, comisiones y descuentos del
                personal.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
              Monto a registrar
            </p>
            <p className="text-2xl font-black text-yellow-700">
              ${formatMoney(form.monto)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <FieldBox icon={<UserRound className="h-4 w-4" />} label="Empleado">
            <select
              value={form.empleado_id}
              onChange={(e) => updateField("empleado_id", e.target.value)}
              disabled={loading}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Selecciona un empleado</option>
              {empleadosActivos.map((empleado) => (
                <option key={empleado.id} value={empleado.id}>
                  {empleado.nombre} - {empleado.rol}
                </option>
              ))}
            </select>
          </FieldBox>

          <FieldBox
            icon={<CreditCard className="h-4 w-4" />}
            label="Tipo de pago"
          >
            <select
              value={form.tipo_pago}
              onChange={(e) =>
                updateField(
                  "tipo_pago",
                  e.target.value as PagoEmpleadoFormData["tipo_pago"]
                )
              }
              disabled={loading}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="sueldo">Sueldo</option>
              <option value="anticipo">Anticipo</option>
              <option value="bono">Bono</option>
              <option value="comision">Comisión</option>
              <option value="descuento">Descuento</option>
            </select>
          </FieldBox>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <FieldBox
            icon={<BadgeDollarSign className="h-4 w-4" />}
            label="Monto"
          >
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.monto}
              onChange={(e) => updateField("monto", e.target.value)}
              disabled={loading}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="0.00"
            />
          </FieldBox>

          <FieldBox
            icon={<CalendarDays className="h-4 w-4" />}
            label="Fecha de pago"
          >
            <input
              type="date"
              value={form.fecha_pago}
              onChange={(e) => updateField("fecha_pago", e.target.value)}
              disabled={loading}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </FieldBox>

          <FieldBox
            icon={<Clock className="h-4 w-4" />}
            label="Observaciones"
          >
            <input
              type="text"
              value={form.observaciones}
              onChange={(e) => updateField("observaciones", e.target.value)}
              disabled={loading}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Opcional"
            />
          </FieldBox>
        </div>

        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-2">
          <FieldBox
            icon={<CalendarDays className="h-4 w-4" />}
            label="Período inicio"
          >
            <input
              type="date"
              value={form.periodo_inicio}
              onChange={(e) => updateField("periodo_inicio", e.target.value)}
              disabled={loading}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </FieldBox>

          <FieldBox
            icon={<CalendarDays className="h-4 w-4" />}
            label="Período fin"
          >
            <input
              type="date"
              value={form.periodo_fin}
              onChange={(e) => updateField("periodo_fin", e.target.value)}
              disabled={loading}
              className={`h-11 w-full rounded-2xl border bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
                periodoInvalido
                  ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                  : "border-slate-200 focus:border-yellow-400 focus:ring-yellow-100"
              }`}
            />
          </FieldBox>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Resumen
            </p>

            {empleadoSeleccionado ? (
              <div className="mt-3 grid gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                    <UserRound className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                      {empleadoSeleccionado.nombre}
                    </p>
                    <p className="text-sm capitalize text-slate-500">
                      {empleadoSeleccionado.rol}
                    </p>
                  </div>
                </div>

                {empleadoSeleccionado.email ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{empleadoSeleccionado.email}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Selecciona un empleado para ver el resumen del pago.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
              Detalle del pago
            </p>

            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-yellow-700">Tipo</span>
                <span className="font-bold text-yellow-900">
                  {tipoPagoLabels[form.tipo_pago]}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-yellow-700">Monto</span>
                <span className="font-black text-yellow-900">
                  ${formatMoney(form.monto)}
                </span>
              </div>

              <p className="pt-2 text-xs leading-relaxed text-yellow-700">
                {tipoPagoDescriptions[form.tipo_pago]}
              </p>
            </div>
          </div>
        </div>

        {periodoInvalido ? (
          <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            El período fin no puede ser menor al período inicio.
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {success}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={resetForm}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Eraser className="h-4 w-4" />
            Limpiar
          </button>

          <button
            type="submit"
            disabled={loading || periodoInvalido}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-yellow-500 px-6 text-sm font-black text-white shadow-sm shadow-yellow-200 transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Registrar pago
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}