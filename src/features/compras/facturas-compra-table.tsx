"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  CreditCard,
  FileText,
  ReceiptText,
  UserRound,
} from "lucide-react";
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
  if (estado === "confirmada") return "border-green-200 bg-green-50 text-green-700";
  if (estado === "error") return "border-red-200 bg-red-50 text-red-700";
  return "border-yellow-200 bg-yellow-50 text-yellow-700";
}

function getEstadoPagoClass(estadoPago?: FacturaCompra["estado_pago"]) {
  if (estadoPago === "pagado") return "border-green-200 bg-green-50 text-green-700";
  if (estadoPago === "parcial") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-orange-200 bg-orange-50 text-orange-700";
}

function getEstadoPagoIcon(estadoPago?: FacturaCompra["estado_pago"]) {
  if (estadoPago === "pagado") return <CheckCircle2 className="size-3.5" />;
  if (estadoPago === "parcial") return <CreditCard className="size-3.5" />;
  return <AlertCircle className="size-3.5" />;
}

function getEstadoPagoLabel(estadoPago?: FacturaCompra["estado_pago"]) {
  if (estadoPago === "pagado") return "Pagado";
  if (estadoPago === "parcial") return "Parcial";
  return "Pendiente";
}

export function FacturasCompraTable({ facturas }: FacturasCompraTableProps) {
  const [openPagoId, setOpenPagoId] = useState<string | null>(null);
  const [localFacturas, setLocalFacturas] = useState<FacturaCompraRow[]>(facturas);

  const rows = useMemo(() => localFacturas, [localFacturas]);

  function handlePagoCreated(facturaId: string, montoPagado: number) {
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
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
          <ReceiptText className="size-6" />
        </div>
        <h3 className="mt-3 text-sm font-bold text-slate-900">
          No hay facturas pendientes
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Las compras pendientes o parciales aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-slate-500" />
            <p className="text-sm font-bold text-slate-900">
              Listado de facturas por pagar
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white">
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Proveedor</th>
                <th className="px-4 py-3 text-left">Factura</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Pago</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Pagado</th>
                <th className="px-4 py-3 text-right">Pendiente</th>
                <th className="px-4 py-3 text-right">Acción</th>
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
                      setOpenPagoId((prev) =>
                        prev === factura.id ? null : factura.id
                      )
                    }
                    onPagoCreated={(monto) =>
                      handlePagoCreated(factura.id, monto)
                    }
                  />
                );
              })}
            </tbody>
          </table>
        </div>
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
      <tr className="border-b border-slate-100 align-top transition hover:bg-slate-50/80">
        <td className="whitespace-nowrap px-4 py-4 text-slate-700">
          {factura.fecha}
        </td>

        <td className="px-4 py-4">
          <div className="flex min-w-48 items-start gap-2">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <UserRound className="size-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">
                {factura.proveedor?.nombre ?? "-"}
              </p>
              <p className="text-xs text-slate-500">
                {factura.proveedor?.ruc ?? "Sin RUC"}
              </p>
            </div>
          </div>
        </td>

        <td className="whitespace-nowrap px-4 py-4">
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
            <FileText className="size-4" />
            {factura.numero_factura}
          </div>
        </td>

        <td className="px-4 py-4">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold capitalize ${getEstadoClass(
              factura.estado
            )}`}
          >
            {factura.estado}
          </span>
        </td>

        <td className="px-4 py-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${getEstadoPagoClass(
              factura.estado_pago
            )}`}
          >
            {getEstadoPagoIcon(factura.estado_pago)}
            {getEstadoPagoLabel(factura.estado_pago)}
          </span>
        </td>

        <td className="px-4 py-4 text-right font-bold text-slate-900">
          {formatMoney(factura.total)}
        </td>

        <td className="px-4 py-4 text-right font-bold text-blue-700">
          {formatMoney(factura.total_pagado)}
        </td>

        <td className="px-4 py-4 text-right font-black text-orange-700">
          {formatMoney(factura.saldo_pendiente)}
        </td>

        <td className="px-4 py-4 text-right">
          <button
            type="button"
            onClick={onToggle}
            disabled={!puedePagar}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Banknote className="size-4" />
            {!puedePagar ? "Pagada" : isOpen ? "Cerrar" : "Pagar"}
            {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </td>
      </tr>

      {isOpen ? (
        <tr className="border-b border-slate-100 bg-slate-50/70">
          <td colSpan={9} className="px-4 py-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
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
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}