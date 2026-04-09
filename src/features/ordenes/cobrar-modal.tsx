"use client";

import { useEffect, useState } from "react";
import { registrarPagoOrden } from "./actions";

type MetodoPago = "efectivo" | "transferencia" | "tarjeta";

type CobrarModalProps = {
  open: boolean;
  onClose: () => void;
  ordenId: string;
  total: number;
};

export function CobrarModal({
  open,
  onClose,
  ordenId,
  total,
}: CobrarModalProps) {
  const [monto, setMonto] = useState<number>(total);
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setMonto(total);
      setMetodo("efectivo");
    }
  }, [open, total]);

  if (!open) return null;

  async function handleSubmit() {
    try {
      setLoading(true);

      await registrarPagoOrden({
        ordenId,
        monto: Number(monto),
        metodo_pago: metodo,
      });

      onClose();
      window.location.reload();
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
      value === "tarjeta"
    ) {
      setMetodo(value);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Cobrar orden</h2>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm">Monto</label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(Number(e.target.value))}
              className="w-full rounded-xl border px-3 py-2"
            />
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
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border px-4 py-2"
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-white"
          >
            {loading ? "Procesando..." : "Cobrar"}
          </button>
        </div>
      </div>
    </div>
  );
}