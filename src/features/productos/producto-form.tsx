"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createProducto } from "./actions";
import type { ProductoFormData } from "@/types";
import { getConfiguracionTaller } from "@/features/configuracion/actions";

const IVA = 0.15;

const initialState: ProductoFormData = {
  nombre: "",
  categoria: "",
  marca: "",
  stock: "0",
  precio_compra: "0",
  precio_venta: "0",
  precio_compra_incluye_iva: true,
  incluye_filtro: false,
  incluye_ambiental: false,
  incluye_tarjeta: false,
  costo_filtro: "0",
  costo_ambiental: "0",
  costo_tarjeta: "0",
  activo: true,
  notas: "",
};

type ProductoFormProps = {
  onCreated?: () => Promise<void> | void;
};

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return 0;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function ProductoForm({ onCreated }: ProductoFormProps) {
  const [form, setForm] = useState<ProductoFormData>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [margenGanancia, setMargenGanancia] = useState(0.45);

  useEffect(() => {
    async function loadMargen() {
      try {
        const config = await getConfiguracionTaller();
        const margen = Number(config?.margen_ganancia ?? 45);
        setMargenGanancia(margen > 0 ? margen / 100 : 0.45);
      } catch {
        setMargenGanancia(0.45);
      }
    }

    loadMargen();
  }, []);

  function updateField<K extends keyof ProductoFormData>(
    key: K,
    value: ProductoFormData[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const resumenPrecio = useMemo(() => {
    const precioCompraIngresado = toNumber(form.precio_compra);

    if (!precioCompraIngresado || precioCompraIngresado <= 0) {
      return {
        precioCompraConIVA: 0,
        precioCompraSinIVA: 0,
        costoReal: 0,
        precioVentaSinIVA: 0,
        precioVentaConIVA: 0,
        gananciaSinIVA: 0,
        descuentoExtras: 0,
      };
    }

    const precioCompraConIVA = form.precio_compra_incluye_iva
      ? precioCompraIngresado
      : precioCompraIngresado * (1 + IVA);

    const precioCompraSinIVA = form.precio_compra_incluye_iva
      ? precioCompraIngresado / (1 + IVA)
      : precioCompraIngresado;

    const descuentoFiltro = form.incluye_filtro ? toNumber(form.costo_filtro) : 0;
    const descuentoAmbiental = form.incluye_ambiental
      ? toNumber(form.costo_ambiental)
      : 0;
    const descuentoTarjeta = form.incluye_tarjeta ? toNumber(form.costo_tarjeta) : 0;

    const descuentoExtras =
      descuentoFiltro + descuentoAmbiental + descuentoTarjeta;

    const costoReal = Math.max(0, precioCompraSinIVA - descuentoExtras);
    const precioVentaSinIVA = Math.ceil(costoReal * (1 + margenGanancia));
    const precioVentaConIVA = Math.ceil(precioVentaSinIVA * (1 + IVA));
    const gananciaSinIVA = precioVentaSinIVA - costoReal;

    return {
      precioCompraConIVA: Number(precioCompraConIVA.toFixed(2)),
      precioCompraSinIVA: Number(precioCompraSinIVA.toFixed(2)),
      costoReal: Number(costoReal.toFixed(2)),
      precioVentaSinIVA: Number(precioVentaSinIVA.toFixed(2)),
      precioVentaConIVA: Number(precioVentaConIVA.toFixed(2)),
      gananciaSinIVA: Number(gananciaSinIVA.toFixed(2)),
      descuentoExtras: Number(descuentoExtras.toFixed(2)),
    };
  }, [
    form.precio_compra,
    form.precio_compra_incluye_iva,
    form.incluye_filtro,
    form.incluye_ambiental,
    form.incluye_tarjeta,
    form.costo_filtro,
    form.costo_ambiental,
    form.costo_tarjeta,
    margenGanancia,
  ]);
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (!form.categoria.trim()) {
      setError("La categoría es obligatoria.");
      return;
    }

    if (Number(form.stock) < 0) {
      setError("El stock no puede ser negativo.");
      return;
    }

    if (toNumber(form.precio_compra) <= 0) {
      setError("El precio de compra debe ser mayor a 0.");
      return;
    }

    if (form.incluye_filtro && toNumber(form.costo_filtro) < 0) {
      setError("El costo del filtro no puede ser negativo.");
      return;
    }

    if (form.incluye_ambiental && toNumber(form.costo_ambiental) < 0) {
      setError("El costo del ambiental no puede ser negativo.");
      return;
    }

    if (form.incluye_tarjeta && toNumber(form.costo_tarjeta) < 0) {
      setError("El costo de la tarjeta no puede ser negativo.");
      return;
    }

    try {
      setLoading(true);

      await createProducto({
        ...form,
        precio_venta: String(resumenPrecio.precioVentaSinIVA),
        costo_filtro: form.incluye_filtro ? form.costo_filtro : "0",
        costo_ambiental: form.incluye_ambiental ? form.costo_ambiental : "0",
        costo_tarjeta: form.incluye_tarjeta ? form.costo_tarjeta : "0",
      });

      setSuccess("Producto registrado correctamente en el catálogo.");
      setForm(initialState);

      if (onCreated) {
        await onCreated();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ocurrió un error inesperado.";

      if (message.toLowerCase().includes("duplicate")) {
        setError(
          "Este producto ya existe. Usa la opción 'Agregar stock' en lugar de crear uno nuevo."
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Nombre</label>
          <input
            value={form.nombre}
            onChange={(e) => updateField("nombre", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Aceite Soil 5W30"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Categoría</label>
          <input
            value={form.categoria}
            onChange={(e) => updateField("categoria", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Aceites"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Marca</label>
          <input
            value={form.marca}
            onChange={(e) => updateField("marca", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Kendall / Soil / Castrol"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Stock</label>
          <input
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => updateField("stock", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="10"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Precio compra facturado
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.precio_compra}
            onChange={(e) => updateField("precio_compra", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Ej: 20.24"
          />

          <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.precio_compra_incluye_iva}
              onChange={(e) =>
                updateField("precio_compra_incluye_iva", e.target.checked)
              }
            />
            El precio ingresado ya incluye IVA
          </label>

          <p className="mt-1 text-xs text-gray-500">
            Este es el valor tal como viene en la factura del proveedor.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Precio venta sugerido
          </label>
          <input
            type="text"
            value={
              resumenPrecio.precioVentaSinIVA > 0
                ? `$${resumenPrecio.precioVentaSinIVA.toFixed(2)}`
                : "-"
            }
            readOnly
            className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-gray-700 outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            Calculado con el margen configurado en tu taller (
            {(margenGanancia * 100).toFixed(0)}%).
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 p-4">
        <p className="mb-3 text-sm font-semibold text-gray-900">
          Extras incluidos por el proveedor
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
              <input
                type="checkbox"
                checked={form.incluye_filtro}
                onChange={(e) => updateField("incluye_filtro", e.target.checked)}
              />
              Incluye filtro
            </label>

            <input
              type="number"
              step="0.01"
              min="0"
              value={form.costo_filtro}
              onChange={(e) => updateField("costo_filtro", e.target.value)}
              disabled={!form.incluye_filtro}
              className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none disabled:cursor-not-allowed disabled:bg-gray-100 focus:border-black"
              placeholder="Costo del filtro"
            />
          </div>

          <div className="rounded-xl border border-gray-200 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
              <input
                type="checkbox"
                checked={form.incluye_ambiental}
                onChange={(e) =>
                  updateField("incluye_ambiental", e.target.checked)
                }
              />
              Incluye ambiental
            </label>

            <input
              type="number"
              step="0.01"
              min="0"
              value={form.costo_ambiental}
              onChange={(e) => updateField("costo_ambiental", e.target.value)}
              disabled={!form.incluye_ambiental}
              className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none disabled:cursor-not-allowed disabled:bg-gray-100 focus:border-black"
              placeholder="Costo del ambiental"
            />
          </div>

          <div className="rounded-xl border border-gray-200 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
              <input
                type="checkbox"
                checked={form.incluye_tarjeta}
                onChange={(e) => updateField("incluye_tarjeta", e.target.checked)}
              />
              Incluye tarjeta kilometraje
            </label>

            <input
              type="number"
              step="0.01"
              min="0"
              value={form.costo_tarjeta}
              onChange={(e) => updateField("costo_tarjeta", e.target.value)}
              disabled={!form.incluye_tarjeta}
              className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none disabled:cursor-not-allowed disabled:bg-gray-100 focus:border-black"
              placeholder="Costo de la tarjeta"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Compra con IVA
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            ${resumenPrecio.precioCompraConIVA.toFixed(2)}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Compra sin IVA
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            ${resumenPrecio.precioCompraSinIVA.toFixed(2)}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Venta con IVA
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            ${resumenPrecio.precioVentaConIVA.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Descuento extras
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            ${resumenPrecio.descuentoExtras.toFixed(2)}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Costo real
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            ${resumenPrecio.costoReal.toFixed(2)}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Ganancia estimada
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            ${resumenPrecio.gananciaSinIVA.toFixed(2)}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Venta sugerida
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            ${resumenPrecio.precioVentaSinIVA.toFixed(2)}
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notas</label>
        <textarea
          value={form.notas}
          onChange={(e) => updateField("notas", e.target.value)}
          className="min-h-24 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          placeholder="Observaciones del producto..."
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.activo}
          onChange={(e) => updateField("activo", e.target.checked)}
        />
        Producto activo
      </label>

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

      <div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Registrar producto"}
        </button>
      </div>
    </form>
  );
}