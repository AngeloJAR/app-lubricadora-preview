"use client";

import { useMemo, useState, useTransition } from "react";
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

  const totalFactura = useMemo(() => {
    return items.reduce((acc, item) => {
      return acc + Number(item.cantidad || 0) * Number(item.costo_unitario || 0);
    }, 0);
  }, [items]);

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
    setItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
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
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Proveedor</label>
          <select
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            className="rounded-lg border px-3 py-2"
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
          <label className="text-sm font-medium">Número de factura</label>
          <input
            value={numeroFactura}
            onChange={(e) => setNumeroFactura(e.target.value)}
            className="rounded-lg border px-3 py-2"
            placeholder="001-001-000000123"
            required
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border px-3 py-2"
            required
          />
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Items</h3>
          <button
            type="button"
            onClick={addItem}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Agregar item
          </button>
        </div>

        {items.map((item, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-xl border p-3 md:grid-cols-12"
          >
            <div className="grid gap-2 md:col-span-4">
              <label className="text-sm font-medium">Descripción factura</label>
              <input
                value={item.descripcion_original}
                onChange={(e) =>
                  updateItem(index, "descripcion_original", e.target.value)
                }
                className="rounded-lg border px-3 py-2"
                placeholder="ACEITE KENDALL 20W50 GL"
                required
              />
            </div>

            <div className="grid gap-2 md:col-span-4">
              <label className="text-sm font-medium">Producto del sistema</label>
              <select
                value={item.producto_id}
                onChange={(e) => updateItem(index, "producto_id", e.target.value)}
                className="rounded-lg border px-3 py-2"
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
              <label className="text-sm font-medium">Cant.</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.cantidad}
                onChange={(e) =>
                  updateItem(index, "cantidad", Number(e.target.value))
                }
                className="rounded-lg border px-3 py-2"
                required
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-medium">Unidad</label>
              <select
                value={item.unidad_compra}
                onChange={(e) =>
                  updateItem(index, "unidad_compra", e.target.value)
                }
                className="rounded-lg border px-3 py-2"
              >
                <option value="unidad">Unidad</option>
                <option value="caja">Caja</option>
                <option value="galon">Galón</option>
                <option value="cuarto">Cuarto</option>
              </select>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-medium">Factor</label>
              <input
                type="number"
                min="1"
                step="1"
                value={item.factor_conversion}
                onChange={(e) =>
                  updateItem(index, "factor_conversion", Number(e.target.value))
                }
                className="rounded-lg border px-3 py-2"
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-medium">Costo unitario</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.costo_unitario}
                onChange={(e) =>
                  updateItem(index, "costo_unitario", Number(e.target.value))
                }
                className="rounded-lg border px-3 py-2"
                required
              />
            </div>



            <div className="flex items-end md:col-span-1">
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Observaciones</label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="min-h-24 rounded-lg border px-3 py-2"
          placeholder="Notas de la compra"
        />
      </div>

      <div className="rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">Total calculado</p>
        <p className="text-xl font-semibold">${totalFactura.toFixed(2)}</p>
      </div>

      {(error || success) && (
        <div>
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <p className="text-sm text-green-600">{success}</p>
          )}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar factura"}
        </button>
      </div>
    </form>
  );
}