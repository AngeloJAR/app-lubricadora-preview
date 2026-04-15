"use client";

import { useEffect, useMemo, useState } from "react";
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

export function CobrarModal({
  open,
  onClose,
  ordenId,
  total,
  totalPagado = 0,
}: CobrarModalProps) {
  const saldoPendienteInicial = useMemo(() => {
    return Math.max(0, Number(total) - Number(totalPagado));
  }, [total, totalPagado]);

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
      const message =
        error instanceof Error ? error.message : "No se pudo registrar el pago";
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  function handleMetodoChange(value: string) {
    if (
      value === "efectivo" ||
      value === "transferencia" ||
      value === "deuna" ||
      value === "tarjeta"
    ) {
      setMetodo(value);
    }
  }

  const montoValido =
    Number.isFinite(monto) &&
    monto > 0 &&
    monto <= saldoPendienteInicial;
  const estadoPagoPreview = calcularEstadoPagoOrden(
    Number(total),
    Number(totalPagado) + Number(monto || 0)
  );

  const ordenQuedaraEntregada = estadoPagoPreview === "pagada";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Cobrar orden</h2>

        <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Total orden</span>
            <span className="font-medium">${Number(total).toFixed(2)}</span>
          </div>

          <div className="mt-1 flex items-center justify-between">
            <span>Total pagado</span>
            <span className="font-medium">${Number(totalPagado).toFixed(2)}</span>
          </div>

          <div className="mt-1 flex items-center justify-between">
            <span>Saldo pendiente</span>
            <span className="font-semibold">
              ${Number(saldoPendienteInicial).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm">Monto a cobrar</label>
            <input
              type="number"
              min={0}
              max={saldoPendienteInicial}
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(Number(e.target.value))}
              className="w-full rounded-xl border px-3 py-2"
            />
            {!montoValido && (
              <p className="mt-1 text-xs text-red-600">
                El monto debe ser mayor a 0 y no superar el saldo pendiente.
              </p>
            )}
          </div>

          <div>
            <label className="text-sm">Método de pago</label>
            <select
              value={metodo}
              onChange={(e) => handleMetodoChange(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="deuna">Deuna</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {ordenQuedaraEntregada
              ? "Si cubre todo el saldo pendiente, la orden pasará a entregada."
              : "Se registrará como abono y la orden seguirá completada."}
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => onClose()}
            className="flex-1 rounded-xl border px-4 py-2"
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading || !montoValido}
            className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-white disabled:opacity-60"
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