"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  ReceiptText,
  Save,
  Wallet,
} from "lucide-react";
import { createPagoProveedor } from "./actions";
import type {
  CuentaDinero,
  FacturaCompra,
  NaturalezaMovimiento,
  OrigenFondo,
  PagoProveedorFormData,
  Proveedor,
} from "@/types";

type PagoProveedorFormProps = {
  factura: Pick<
    FacturaCompra,
    | "id"
    | "proveedor_id"
    | "numero_factura"
    | "fecha"
    | "total"
    | "total_pagado"
    | "saldo_pendiente"
    | "estado_pago"
  >;
  proveedor: Pick<Proveedor, "id" | "nombre" | "ruc"> | null;
  onCreated?: (montoPagado: number) => Promise<void> | void;
};

const today = new Date().toISOString().split("T")[0];

const initialState: PagoProveedorFormData = {
  fecha: today,
  monto: "",
  metodo_pago: "efectivo",
  afecta_caja: true,
  observaciones: "",
  cuenta: "caja",
  origen_fondo: "negocio",
  naturaleza: "gasto_operativo",
};

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:bg-slate-100 disabled:text-slate-400";

const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

function formatMoney(value?: number | string | null) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function resolveCuentaFromMetodoPago(
  metodo: PagoProveedorFormData["metodo_pago"]
): CuentaDinero {
  if (metodo === "efectivo") return "caja";
  if (metodo === "deuna") return "deuna";
  if (metodo === "tarjeta") return "tarjeta_por_cobrar";
  return "banco";
}

export function PagoProveedorForm({
  factura,
  proveedor,
  onCreated,
}: PagoProveedorFormProps) {
  const [form, setForm] = useState<PagoProveedorFormData>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField<K extends keyof PagoProveedorFormData>(
    key: K,
    value: PagoProveedorFormData[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  useEffect(() => {
    const cuentaSugerida = resolveCuentaFromMetodoPago(form.metodo_pago);

    setForm((prev) => ({
      ...prev,
      cuenta: cuentaSugerida,
      afecta_caja: cuentaSugerida === "caja",
    }));
  }, [form.metodo_pago]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const monto = Number(form.monto);

    if (!form.fecha.trim()) {
      setError("La fecha es obligatoria.");
      return;
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      setError("El monto debe ser mayor a 0.");
      return;
    }

    if (monto > Number(factura.saldo_pendiente ?? 0)) {
      setError("El monto no puede ser mayor al saldo pendiente.");
      return;
    }

    try {
      setLoading(true);

      await createPagoProveedor({
        factura_compra_id: factura.id,
        proveedor_id: factura.proveedor_id,
        fecha: form.fecha,
        monto,
        metodo_pago: form.metodo_pago,
        cuenta: form.cuenta,
        origen_fondo: form.origen_fondo,
        naturaleza: form.naturaleza,
        afecta_caja: form.cuenta === "caja" ? form.afecta_caja : false,
        observaciones: form.observaciones,
      });

      setSuccess(
        form.cuenta === "caja"
          ? "Pago registrado correctamente y descontado de caja."
          : "Pago registrado correctamente."
      );

      setForm({
        ...initialState,
        fecha: today,
      });

      await onCreated?.(monto);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo registrar el pago al proveedor."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Banknote className="size-5" />
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-950">
            Registrar pago al proveedor
          </h3>
          <p className="text-sm text-slate-500">
            Confirma la cuenta de salida para mantener caja y compras cuadradas.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Building2 className="size-4" />
            Proveedor
          </p>
          <p className="mt-1 font-bold text-slate-900">{proveedor?.nombre ?? "-"}</p>
          <p className="text-xs text-slate-500">{proveedor?.ruc ?? "Sin RUC"}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <ReceiptText className="size-4" />
            Factura
          </p>
          <p className="mt-1 font-bold text-slate-900">{factura.numero_factura}</p>
          <p className="text-xs text-slate-500">{factura.fecha}</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-xs font-medium text-blue-600">Total / pagado</p>
          <p className="mt-1 font-bold text-blue-900">{formatMoney(factura.total)}</p>
          <p className="text-xs text-blue-700">
            Pagado: {formatMoney(factura.total_pagado)}
          </p>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-xs font-medium text-orange-600">Saldo pendiente</p>
          <p className="mt-1 text-lg font-black text-orange-800">
            {formatMoney(factura.saldo_pendiente)}
          </p>
          <p className="text-xs capitalize text-orange-700">
            Estado: {factura.estado_pago}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className={labelClass}>Fecha</label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-3 size-5 text-slate-400" />
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => updateField("fecha", e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Monto</label>
          <input
            type="number"
            min="0"
            step="0.01"
            max={Number(factura.saldo_pendiente ?? 0)}
            value={form.monto}
            onChange={(e) => updateField("monto", e.target.value)}
            className={inputClass}
            placeholder="0.00"
          />
        </div>

        <div>
          <label className={labelClass}>Método de pago</label>
          <select
            value={form.metodo_pago}
            onChange={(e) =>
              updateField(
                "metodo_pago",
                e.target.value as PagoProveedorFormData["metodo_pago"]
              )
            }
            className={inputClass}
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="deuna">DeUna</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="mixto">Mixto</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Cuenta</label>
          <select
            value={form.cuenta}
            onChange={(e) => updateField("cuenta", e.target.value as CuentaDinero)}
            className={inputClass}
          >
            <option value="caja">Caja</option>
            <option value="banco">Banco</option>
            <option value="deuna">DeUna</option>
            <option value="tarjeta_por_cobrar">Tarjeta por cobrar</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <label className={labelClass}>Origen fondo</label>
          <select
            value={form.origen_fondo}
            onChange={(e) =>
              updateField("origen_fondo", e.target.value as OrigenFondo)
            }
            className={inputClass}
          >
            <option value="negocio">Negocio</option>
            <option value="prestamo">Préstamo</option>
            <option value="personal">Personal</option>
            <option value="socio">Socio</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Naturaleza</label>
          <select
            value={form.naturaleza}
            onChange={(e) =>
              updateField("naturaleza", e.target.value as NaturalezaMovimiento)
            }
            className={inputClass}
          >
            <option value="gasto_operativo">Gasto operativo</option>
            <option value="pago_prestamo">Pago préstamo</option>
            <option value="aporte">Aporte</option>
            <option value="retiro_dueno">Retiro dueño</option>
            <option value="transferencia_interna">Transferencia interna</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>¿Afecta caja?</label>
          <select
            value={form.afecta_caja ? "si" : "no"}
            onChange={(e) => updateField("afecta_caja", e.target.value === "si")}
            disabled={form.cuenta !== "caja"}
            className={inputClass}
          >
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Observaciones</label>
        <textarea
          value={form.observaciones}
          onChange={(e) => updateField("observaciones", e.target.value)}
          className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          placeholder="Detalle opcional del pago"
        />
      </div>

      <div
        className={`flex items-start gap-3 rounded-3xl px-4 py-3 ${
          form.cuenta === "caja"
            ? "border border-amber-200 bg-amber-50"
            : "border border-blue-200 bg-blue-50"
        }`}
      >
        <div
          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl ${
            form.cuenta === "caja"
              ? "bg-amber-100 text-amber-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {form.cuenta === "caja" ? (
            <Wallet className="size-5" />
          ) : form.cuenta === "banco" ? (
            <Landmark className="size-5" />
          ) : form.cuenta === "tarjeta_por_cobrar" ? (
            <CreditCard className="size-5" />
          ) : (
            <Banknote className="size-5" />
          )}
        </div>

        <div>
          <p
            className={`text-sm font-bold ${
              form.cuenta === "caja" ? "text-amber-800" : "text-blue-800"
            }`}
          >
            Resumen del movimiento
          </p>

          <p
            className={`mt-1 text-sm ${
              form.cuenta === "caja" ? "text-amber-700" : "text-blue-700"
            }`}
          >
            {form.cuenta === "caja"
              ? "Este pago saldrá de caja y se registrará como egreso si hay caja abierta."
              : `Este pago saldrá de ${form.cuenta} y no descontará efectivo de caja.`}
          </p>

          <p className="mt-2 text-xs text-slate-600">
            Origen: <span className="font-semibold">{form.origen_fondo}</span> ·
            Naturaleza: <span className="font-semibold">{form.naturaleza}</span>
          </p>
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            updateField(
              "monto",
              String(Number(factura.saldo_pendiente ?? 0).toFixed(2))
            )
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <Banknote className="size-4" />
          Pagar saldo completo
        </button>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="size-4" />
              Registrar pago
            </>
          )}
        </button>
      </div>
    </form>
  );
}