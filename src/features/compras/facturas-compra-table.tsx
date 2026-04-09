"use client";

import { useMemo, useState } from "react";
import type { FacturaCompra, Proveedor } from "@/types";
import { PagoProveedorForm } from "./pago-proveedor-form";

type FacturaCompraRow = FacturaCompra & {
  proveedor: Pick<Proveedor, "id" | "nombre" | "ruc"> | null;
};

type FacturasCompraTableProps = {
  facturas: FacturaCompraRow[];
};

function formatMoney(value?: number | string | null) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function getEstadoClass(estado?: FacturaCompra["estado"]) {
  if (estado === "confirmada") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (estado === "error") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-yellow-200 bg-yellow-50 text-yellow-700";
}

function getEstadoPagoClass(estadoPago?: FacturaCompra["estado_pago"]) {
  if (estadoPago === "pagado") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (estadoPago === "parcial") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-orange-200 bg-orange-50 text-orange-700";
}

function getEstadoPagoLabel(estadoPago?: FacturaCompra["estado_pago"]) {
  if (estadoPago === "pagado") return "Pagado";
  if (estadoPago === "parcial") return "Parcial";
  return "Pendiente";
}

export function FacturasCompraTable({
  facturas,
}: FacturasCompraTableProps) {
  const [openPagoId, setOpenPagoId] = useState<string | null>(null);
  const [localFacturas, setLocalFacturas] = useState<FacturaCompraRow[]>(facturas);

  const rows = useMemo(() => localFacturas, [localFacturas]);

  function handlePagoCreated(
    facturaId: string,
    montoPagado: number
  ) {
    setLocalFacturas((prev) =>
      prev.map((factura) => {
        if (factura.id !== facturaId) return factura;

        const totalPagadoNuevo =
          Number(factura.total_pagado ?? 0) + Number(montoPagado ?? 0);

        const saldoPendienteNuevo = Math.max(
          0,
          Number(factura.total ?? 0) - totalPagadoNuevo
        );

        const estadoPagoNuevo: FacturaCompra["estado_pago"] =
          totalPagadoNuevo <= 0
            ? "pendiente"
            : saldoPendienteNuevo <= 0
              ? "pagado"
              : "parcial";

        return {
          ...factura,
          total_pagado: totalPagadoNuevo,
          saldo_pendiente: saldoPendienteNuevo,
          estado_pago: estadoPagoNuevo,
        };
      })
    );

    setOpenPagoId(null);
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        No hay facturas registradas todavía.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Fecha</th>
              <th className="px-4 py-3 text-left font-medium">Proveedor</th>
              <th className="px-4 py-3 text-left font-medium">Factura</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Pago</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium">Pagado</th>
              <th className="px-4 py-3 text-right font-medium">Pendiente</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((factura) => {
              const isOpen = openPagoId === factura.id;
              const puedePagar = Number(factura.saldo_pendiente ?? 0) > 0;

              return (
                <FragmentRow
                  key={factura.id}
                  factura={factura}
                  isOpen={isOpen}
                  puedePagar={puedePagar}
                  onToggle={() =>
                    setOpenPagoId((prev) => (prev === factura.id ? null : factura.id))
                  }
                  onPagoCreated={(monto) => handlePagoCreated(factura.id, monto)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type FragmentRowProps = {
  factura: FacturaCompraRow;
  isOpen: boolean;
  puedePagar: boolean;
  onToggle: () => void;
  onPagoCreated: (monto: number) => void;
};

function FragmentRow({
  factura,
  isOpen,
  puedePagar,
  onToggle,
  onPagoCreated,
}: FragmentRowProps) {
  return (
    <>
      <tr className="border-t align-top">
        <td className="px-4 py-3 whitespace-nowrap">{factura.fecha}</td>

        <td className="px-4 py-3">
          <div className="min-w-45">
            <p className="font-medium">{factura.proveedor?.nombre ?? "-"}</p>
            <p className="text-xs text-muted-foreground">
              {factura.proveedor?.ruc ?? "Sin RUC"}
            </p>
          </div>
        </td>

        <td className="px-4 py-3 whitespace-nowrap">
          {factura.numero_factura}
        </td>

        <td className="px-4 py-3">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${getEstadoClass(
              factura.estado
            )}`}
          >
            {factura.estado}
          </span>
        </td>

        <td className="px-4 py-3">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getEstadoPagoClass(
              factura.estado_pago
            )}`}
          >
            {getEstadoPagoLabel(factura.estado_pago)}
          </span>
        </td>

        <td className="px-4 py-3 text-right font-medium">
          {formatMoney(factura.total)}
        </td>

        <td className="px-4 py-3 text-right font-medium text-blue-700">
          {formatMoney(factura.total_pagado)}
        </td>

        <td className="px-4 py-3 text-right font-semibold text-orange-700">
          {formatMoney(factura.saldo_pendiente)}
        </td>

        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={onToggle}
            disabled={!puedePagar}
            className="rounded-lg border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!puedePagar
              ? "Factura pagada"
              : isOpen
                ? "Cerrar pago"
                : "Registrar pago"}
          </button>
        </td>
      </tr>

      {isOpen ? (
        <tr className="border-t bg-muted/20">
          <td colSpan={9} className="px-4 py-4">
            <PagoProveedorForm
              factura={{
                id: factura.id,
                proveedor_id: factura.proveedor_id,
                numero_factura: factura.numero_factura,
                fecha: factura.fecha,
                total: factura.total,
                total_pagado: factura.total_pagado,
                saldo_pendiente: factura.saldo_pendiente,
                estado_pago: factura.estado_pago,
              }}
              proveedor={factura.proveedor}
              onCreated={(montoPagado) => {
                onPagoCreated(montoPagado);
              }}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}