"use client";

import { useEffect, useState } from "react";
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
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-2xl border p-4 bg-white"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">Proveedor</p>
          <p className="mt-1 font-medium">{proveedor?.nombre ?? "-"}</p>
          <p className="text-xs text-muted-foreground">
            {proveedor?.ruc ?? "Sin RUC"}
          </p>
        </div>

        <div className="rounded-xl border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">Factura</p>
          <p className="mt-1 font-medium">{factura.numero_factura}</p>
          <p className="text-xs text-muted-foreground">{factura.fecha}</p>
        </div>

        <div className="rounded-xl border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">Total factura</p>
          <p className="mt-1 font-semibold">{formatMoney(factura.total)}</p>
          <p className="text-xs text-blue-700">
            Pagado: {formatMoney(factura.total_pagado)}
          </p>
        </div>

        <div className="rounded-xl border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
          <p className="mt-1 font-semibold text-orange-700">
            {formatMoney(factura.saldo_pendiente)}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            Estado: {factura.estado_pago}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          <label className="mb-1 block text-sm font-medium">Monto</label>
          <input
            type="number"
            min="0"
            step="0.01"
            max={Number(factura.saldo_pendiente ?? 0)}
            value={form.monto}
            onChange={(e) => updateField("monto", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Método de pago
          </label>
          <select
            value={form.metodo_pago}
            onChange={(e) =>
              updateField(
                "metodo_pago",
                e.target.value as PagoProveedorFormData["metodo_pago"]
              )
            }
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="deuna">DeUna</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Cuenta</label>
          <select
            value={form.cuenta}
            onChange={(e) =>
              updateField("cuenta", e.target.value as CuentaDinero)
            }
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
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
          <label className="mb-1 block text-sm font-medium">Origen fondo</label>
          <select
            value={form.origen_fondo}
            onChange={(e) =>
              updateField("origen_fondo", e.target.value as OrigenFondo)
            }
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          >
            <option value="negocio">Negocio</option>
            <option value="prestamo">Préstamo</option>
            <option value="personal">Personal</option>
            <option value="socio">Socio</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Naturaleza</label>
          <select
            value={form.naturaleza}
            onChange={(e) =>
              updateField("naturaleza", e.target.value as NaturalezaMovimiento)
            }
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          >
            <option value="gasto_operativo">Gasto operativo</option>
            <option value="pago_prestamo">Pago préstamo</option>
            <option value="aporte">Aporte</option>
            <option value="retiro_dueno">Retiro dueño</option>
            <option value="transferencia_interna">Transferencia interna</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            ¿Afecta caja?
          </label>
          <select
            value={form.afecta_caja ? "si" : "no"}
            onChange={(e) => updateField("afecta_caja", e.target.value === "si")}
            disabled={form.cuenta !== "caja"}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black disabled:bg-gray-100"
          >
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Observaciones</label>
        <textarea
          value={form.observaciones}
          onChange={(e) => updateField("observaciones", e.target.value)}
          className="min-h-24 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          placeholder="Detalle opcional del pago"
        />
      </div>

      <div
        className={`rounded-2xl px-4 py-3 ${
          form.cuenta === "caja"
            ? "border border-amber-200 bg-amber-50"
            : "border border-blue-200 bg-blue-50"
        }`}
      >
        <p
          className={`text-sm font-medium ${
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

        <p className="mt-2 text-xs text-gray-600">
          Origen: <span className="font-medium">{form.origen_fondo}</span> ·
          Naturaleza: <span className="font-medium">{form.naturaleza}</span>
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            updateField(
              "monto",
              String(Number(factura.saldo_pendiente ?? 0).toFixed(2))
            )
          }
          className="rounded-xl border px-4 py-2 text-sm"
        >
          Pagar saldo completo
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl border border-blue-300 bg-blue-600 px-4 py-2 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Registrar pago"}
        </button>
      </div>
    </form>
  );
}