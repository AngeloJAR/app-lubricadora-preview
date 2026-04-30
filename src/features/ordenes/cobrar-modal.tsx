"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, Landmark, Smartphone, X } from "lucide-react";
import { registrarPagoOrden } from "./actions";
import { calcularEstadoPagoOrden } from "@/lib/core/ordenes/reglas";

type MetodoPago = "efectivo" | "transferencia" | "deuna" | "tarjeta";

type CobrarModalClosePayload = {
  orden_estado: "completada" | "entregada";
  estado_pago: "pendiente" | "abonada" | "pagada";
  total_pagado: number;
  saldo_restante: number;
};

type CobrarModalProps = {
  open: boolean;
  ordenId: string;
  total: number;
  totalPagado?: number;
  onClose: (result?: CobrarModalClosePayload) => void;
};

const metodos: {
  value: MetodoPago;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "efectivo", label: "Efectivo", icon: <Banknote className="h-4 w-4" /> },
  { value: "transferencia", label: "Transferencia", icon: <Landmark className="h-4 w-4" /> },
  { value: "deuna", label: "Deuna", icon: <Smartphone className="h-4 w-4" /> },
  { value: "tarjeta", label: "Tarjeta", icon: <CreditCard className="h-4 w-4" /> },
];

export function CobrarModal({
  open,
  onClose,
  ordenId,
  total,
  totalPagado = 0,
}: CobrarModalProps) {
  const saldoPendienteInicial = useMemo(
    () => Math.max(0, Number(total) - Number(totalPagado)),
    [total, totalPagado]
  );

  const [monto, setMonto] = useState<number>(saldoPendienteInicial);
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setMonto(saldoPendienteInicial);
      setMetodo("efectivo");
    }
  }, [open, saldoPendienteInicial]);

  if (!open) return null;

  async function handleSubmit() {
    try {
      setLoading(true);

      const response = await registrarPagoOrden({
        ordenId,
        monto: Number(monto),
        metodo_pago: metodo,
      });

      onClose({
        orden_estado: response.orden_estado,
        estado_pago: response.estado_pago,
        total_pagado: response.total_pagado,
        saldo_restante: response.saldo_restante,
      });
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "No se pudo registrar el pago");
    } finally {
      setLoading(false);
    }
  }

  const montoValido =
    Number.isFinite(monto) && monto > 0 && monto <= saldoPendienteInicial;

  const estadoPagoPreview = calcularEstadoPagoOrden(
    Number(total),
    Number(totalPagado) + Number(monto || 0)
  );

  const ordenQuedaraEntregada = estadoPagoPreview === "pagada";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 p-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Cobrar orden</h2>
            <p className="mt-1 text-sm text-gray-500">
              Registra el pago o abono de esta orden.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onClose()}
            className="rounded-2xl border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5">
          <div className="grid gap-3 rounded-3xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total orden</span>
              <span className="font-bold text-gray-900">
                ${Number(total).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total pagado</span>
              <span className="font-bold text-gray-900">
                ${Number(totalPagado).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-gray-900 px-4 py-3">
              <span className="text-sm font-semibold text-white">
                Saldo pendiente
              </span>
              <span className="text-xl font-extrabold text-white">
                ${Number(saldoPendienteInicial).toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Monto a cobrar
            </label>

            <input
              type="number"
              min={0}
              max={saldoPendienteInicial}
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(Number(e.target.value))}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-lg font-bold text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white"
            />

            {!montoValido && (
              <p className="mt-2 text-xs font-medium text-red-600">
                El monto debe ser mayor a 0 y no superar el saldo pendiente.
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">
              Método de pago
            </p>

            <div className="grid grid-cols-2 gap-2">
              {metodos.map((item) => {
                const active = metodo === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setMetodo(item.value)}
                    className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                      active
                        ? "border-gray-900 bg-gray-900 text-white shadow-md"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
            {ordenQuedaraEntregada
              ? "Si cubre todo el saldo pendiente, la orden pasará a entregada."
              : "Se registrará como abono y la orden seguirá completada."}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-gray-200 bg-gray-50 p-5">
          <button
            type="button"
            onClick={() => onClose()}
            disabled={loading}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !montoValido}
            className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Procesando..."
              : Number(monto) < saldoPendienteInicial
                ? "Registrar abono"
                : "Cobrar"}
          </button>
        </div>
      </div>
    </div>
  );
}