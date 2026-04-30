"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, ReceiptText, Trash2 } from "lucide-react";
import { createFacturaCompra } from "./actions";
import type { ProductoLite, Proveedor } from "@/types";

type FacturaCompraFormProps = {
  proveedores: Proveedor[];
  productos: ProductoLite[];
};

type ItemForm = {
  descripcion_original: string;
  producto_id: string;
  cantidad: number;
  costo_unitario: number;
  unidad_compra: "unidad" | "caja" | "galon" | "cuarto";
  factor_conversion: number;
};

const inputClass =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-500";

export function FacturaCompraForm({
  proveedores,
  productos,
}: FacturaCompraFormProps) {
  const [isPending, startTransition] = useTransition();
  const [proveedorId, setProveedorId] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [items, setItems] = useState<ItemForm[]>([
    {
      descripcion_original: "",
      producto_id: "",
      cantidad: 1,
      costo_unitario: 0,
      unidad_compra: "unidad",
      factor_conversion: 1,
    },
  ]);

  const totalFactura = useMemo(
    () =>
      items.reduce(
        (acc, item) =>
          acc + Number(item.cantidad || 0) * Number(item.costo_unitario || 0),
        0
      ),
    [items]
  );

  function updateItem(index: number, field: keyof ItemForm, value: string | number) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        descripcion_original: "",
        producto_id: "",
        cantidad: 1,
        costo_unitario: 0,
        unidad_compra: "unidad",
        factor_conversion: 1,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function resetForm() {
    setProveedorId("");
    setNumeroFactura("");
    setFecha(new Date().toISOString().slice(0, 10));
    setObservaciones("");
    setItems([
      {
        descripcion_original: "",
        producto_id: "",
        cantidad: 1,
        costo_unitario: 0,
        unidad_compra: "unidad",
        factor_conversion: 1,
      },
    ]);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        await createFacturaCompra({
          proveedor_id: proveedorId,
          numero_factura: numeroFactura,
          fecha,
          observaciones,
          subtotal: totalFactura,
          iva: 0,
          total: totalFactura,
          origen: "manual",
          items: items.map((item) => {
            const cantidad = Number(item.cantidad);
            const factor = Number(item.factor_conversion || 1);

            return {
              descripcion_original: item.descripcion_original,
              producto_id: item.producto_id || null,
              cantidad,
              costo_unitario: Number(item.costo_unitario),
              unidad_compra: item.unidad_compra,
              factor_conversion: factor,
              cantidad_base: cantidad * factor,
              subtotal: cantidad * Number(item.costo_unitario),
              iva: 0,
              total: cantidad * Number(item.costo_unitario),
            };
          }),
        });

        resetForm();
        setSuccess("Factura creada correctamente.");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo crear la factura."
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <ReceiptText className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Datos de la factura
            </h3>
            <p className="text-xs text-slate-500">
              Información principal del proveedor y comprobante.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <label className={labelClass}>Proveedor</label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Selecciona un proveedor</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className={labelClass}>Número de factura</label>
            <input
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              className={inputClass}
              placeholder="001-001-000000123"
              required
            />
          </div>

          <div className="grid gap-2">
            <label className={labelClass}>Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Items</h3>
            <p className="text-xs text-slate-500">
              Vincula cada producto para que aumente el stock automáticamente.
            </p>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Plus className="size-4" />
            Agregar item
          </button>
        </div>

        {items.map((item, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 md:grid-cols-12"
          >
            <div className="grid gap-2 md:col-span-4">
              <label className={labelClass}>Descripción factura</label>
              <input
                value={item.descripcion_original}
                onChange={(e) =>
                  updateItem(index, "descripcion_original", e.target.value)
                }
                className={inputClass}
                placeholder="ACEITE KENDALL 20W50 GL"
                required
              />
            </div>

            <div className="grid gap-2 md:col-span-4">
              <label className={labelClass}>Producto del sistema</label>
              <select
                value={item.producto_id}
                onChange={(e) => updateItem(index, "producto_id", e.target.value)}
                className={inputClass}
              >
                <option value="">Sin vincular</option>
                {productos.map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre}
                    {producto.marca ? ` - ${producto.marca}` : ""}
                    {` (${producto.categoria})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 md:col-span-1">
              <label className={labelClass}>Cant.</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.cantidad}
                onChange={(e) =>
                  updateItem(index, "cantidad", Number(e.target.value))
                }
                className={inputClass}
                required
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <label className={labelClass}>Unidad</label>
              <select
                value={item.unidad_compra}
                onChange={(e) =>
                  updateItem(index, "unidad_compra", e.target.value)
                }
                className={inputClass}
              >
                <option value="unidad">Unidad</option>
                <option value="caja">Caja</option>
                <option value="galon">Galón</option>
                <option value="cuarto">Cuarto</option>
              </select>
            </div>

            <div className="grid gap-2 md:col-span-1">
              <label className={labelClass}>Factor</label>
              <input
                type="number"
                min="1"
                step="1"
                value={item.factor_conversion}
                onChange={(e) =>
                  updateItem(index, "factor_conversion", Number(e.target.value))
                }
                className={inputClass}
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <label className={labelClass}>Costo unitario</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.costo_unitario}
                onChange={(e) =>
                  updateItem(index, "costo_unitario", Number(e.target.value))
                }
                className={inputClass}
                required
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <label className={labelClass}>Subtotal</label>
              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900">
                ${(Number(item.cantidad || 0) * Number(item.costo_unitario || 0)).toFixed(2)}
              </div>
            </div>

            <div className="flex items-end md:col-span-1">
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={items.length === 1}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-2">
        <label className={labelClass}>Observaciones</label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="min-h-24 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          placeholder="Notas de la compra"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Total calculado
          </p>
          <p className="mt-1 text-2xl font-bold">${totalFactura.toFixed(2)}</p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar factura"}
        </button>
      </div>

      {(error || success) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error || success}
        </div>
      )}
    </form>
  );
}