"use client";

import { useMemo, useState, type FormEvent } from "react";
import { createGasto } from "./actions";
import type { GastoFormData } from "@/types";

type GastoFormProps = {
  onCreated?: () => Promise<void> | void;
};

function getToday() {
  return new Date().toISOString().split("T")[0];
}

const categoriasSugeridas = [
  "Agua",
  "Luz",
  "Arriendo",
  "Internet",
  "Comida",
  "Transporte",
  "Herramientas",
  "Limpieza",
  "Repuestos",
  "Mantenimiento",
];

function cuentaDesdeMetodo(
  metodo: GastoFormData["metodo_pago"]
): GastoFormData["cuenta"] {
  if (metodo === "efectivo") return "caja";
  if (metodo === "deuna") return "deuna";
  if (metodo === "transferencia") return "banco";
  if (metodo === "tarjeta") return "banco";
  return "banco";
}

const initialState: GastoFormData = {
  categoria: "",
  descripcion: "",
  monto: "",
  fecha: getToday(),
  tipo_gasto: "variable",
  ambito: "negocio",
  metodo_pago: "efectivo",
  afecta_caja: true,
  cuenta: "caja",
  origen_fondo: "negocio",
  naturaleza: "gasto_operativo",
};

function money(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

export function GastoForm({ onCreated }: GastoFormProps) {
  const [form, setForm] = useState<GastoFormData>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const montoNumber = useMemo(() => {
    const parsed = Number(String(form.monto).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }, [form.monto]);

  function updateField<K extends keyof GastoFormData>(
    key: K,
    value: GastoFormData[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateMetodoPago(value: GastoFormData["metodo_pago"]) {
    setForm((prev) => ({
      ...prev,
      metodo_pago: value,
      cuenta: cuentaDesdeMetodo(value),
      afecta_caja: true,
    }));
  }

  function updateAmbito(value: GastoFormData["ambito"]) {
    setForm((prev) => ({
      ...prev,
      ambito: value,
      origen_fondo: value,
      naturaleza: value === "personal" ? "retiro_dueno" : "gasto_operativo",
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.categoria.trim()) {
      setError("La categoría es obligatoria.");
      return;
    }

    if (!form.monto.trim() || montoNumber <= 0) {
      setError("El monto debe ser mayor a 0.");
      return;
    }

    if (!form.fecha.trim()) {
      setError("La fecha es obligatoria.");
      return;
    }

    try {
      setLoading(true);

      await createGasto({
        ...form,
        monto: String(montoNumber),
      });

      setSuccess(
        form.afecta_caja
          ? `Gasto registrado correctamente. Se descontó de ${form.cuenta}.`
          : "Gasto registrado correctamente sin afectar saldos."
      );

      setForm({
        ...initialState,
        fecha: getToday(),
      });

      await onCreated?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo registrar el gasto."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900">Registrar gasto</h2>
          <p className="text-sm text-slate-500">
            Controla gastos del negocio, personales y el dinero que sale de caja,
            banco o DeUna.
          </p>
        </div>

        <div className="mt-5 grid gap-5">
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Categoría
              </label>
              <input
                type="text"
                value={form.categoria}
                onChange={(e) => updateField("categoria", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                placeholder="Ej: agua, luz, arriendo, comida"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {categoriasSugeridas.map((categoria) => (
                  <button
                    key={categoria}
                    type="button"
                    onClick={() => updateField("categoria", categoria)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      form.categoria === categoria
                        ? "border-yellow-400 bg-yellow-100 text-yellow-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-yellow-300 hover:bg-yellow-50"
                    }`}
                  >
                    {categoria}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Monto
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.monto}
                onChange={(e) => updateField("monto", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                placeholder="0.00"
              />
              <p className="mt-2 text-sm font-semibold text-red-600">
                Salida: {money(montoNumber)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Fecha
              </label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => updateField("fecha", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Tipo de gasto
              </label>
              <select
                value={form.tipo_gasto}
                onChange={(e) =>
                  updateField(
                    "tipo_gasto",
                    e.target.value as GastoFormData["tipo_gasto"]
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
              >
                <option value="variable">Variable</option>
                <option value="fijo">Fijo</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Ámbito
              </label>
              <select
                value={form.ambito}
                onChange={(e) =>
                  updateAmbito(e.target.value as GastoFormData["ambito"])
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
              >
                <option value="negocio">Negocio</option>
                <option value="personal">Personal</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Método de pago
              </label>
              <select
                value={form.metodo_pago}
                onChange={(e) =>
                  updateMetodoPago(
                    e.target.value as GastoFormData["metodo_pago"]
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="deuna">DeUna</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="mixto">Otro</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Cuenta afectada
              </label>
              <select
                value={form.cuenta}
                onChange={(e) =>
                  updateField("cuenta", e.target.value as GastoFormData["cuenta"])
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
              >
                <option value="caja">Caja</option>
                <option value="banco">Banco</option>
                <option value="deuna">DeUna</option>
                <option value="tarjeta_por_cobrar">Tarjeta por cobrar</option>
                <option value="boveda">Bóveda</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                ¿Afecta saldos?
              </label>
              <select
                value={form.afecta_caja ? "si" : "no"}
                onChange={(e) =>
                  updateField("afecta_caja", e.target.value === "si")
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
              >
                <option value="si">Sí, descontar dinero</option>
                <option value="no">No, solo registrar</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Descripción
            </label>
            <input
              type="text"
              value={form.descripcion}
              onChange={(e) => updateField("descripcion", e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
              placeholder="Detalle opcional del gasto"
            />
          </div>
        </div>
      </div>

      <div
        className={`rounded-3xl border p-5 ${
          form.afecta_caja
            ? "border-red-200 bg-red-50"
            : "border-blue-200 bg-blue-50"
        }`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p
              className={`text-sm font-bold ${
                form.afecta_caja ? "text-red-800" : "text-blue-800"
              }`}
            >
              Resumen del movimiento
            </p>
            <p
              className={`mt-1 text-sm ${
                form.afecta_caja ? "text-red-700" : "text-blue-700"
              }`}
            >
              {form.afecta_caja
                ? `Se registrará un egreso de ${money(montoNumber)} en ${
                    form.cuenta
                  }.`
                : "El gasto quedará guardado, pero no descontará dinero de ninguna cuenta."}
            </p>
          </div>

          <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total
            </p>
            <p className="text-xl font-black text-red-600">
              {money(montoNumber)}
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {success}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl border border-yellow-400 bg-yellow-500 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Registrar gasto"}
        </button>
      </div>
    </form>
  );
}