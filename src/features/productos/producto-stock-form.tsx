"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { agregarStockProducto } from "./actions";
import type { Producto, ProductoStockFormData } from "@/types";
import { getConfiguracionTaller } from "@/features/configuracion/actions";

const IVA = 0.15;

type ProductoStockFormProps = {
  productos: Producto[];
  onCreated?: () => Promise<void> | void;
};

const initialState: ProductoStockFormData = {
  producto_id: "",
  cantidad: "",
  precio_compra: "",
  precio_venta: "",
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

function round2(value: number) {
  return Number(value.toFixed(2));
}

export function ProductoStockForm({
  productos,
  onCreated,
}: ProductoStockFormProps) {
  const [form, setForm] = useState<ProductoStockFormData>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [margenGanancia, setMargenGanancia] = useState(0.45);
  const [searchProducto, setSearchProducto] = useState("");

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

  const productosFiltrados = useMemo(() => {
    const normalized = searchProducto.trim().toLowerCase();

    if (!normalized) {
      return productos.slice(0, 12);
    }

    return productos
      .filter((producto) => {
        const nombre = (producto.nombre ?? "").toLowerCase();
        const categoria = (producto.categoria ?? "").toLowerCase();
        const marca = (producto.marca ?? "").toLowerCase();

        return (
          nombre.includes(normalized) ||
          categoria.includes(normalized) ||
          marca.includes(normalized)
        );
      })
      .slice(0, 12);
  }, [productos, searchProducto]);

  const productoSeleccionado = useMemo(
    () => productos.find((producto) => producto.id === form.producto_id) ?? null,
    [productos, form.producto_id]
  );

  const resumenPrecio = useMemo(() => {
    if (!productoSeleccionado) {
      return {
        precioCompraConIVA: 0,
        precioCompraSinIVA: 0,
        descuentoExtras: 0,
        costoReal: 0,
        precioVentaSugeridoSinIVA: 0,
        precioVentaSugeridoConIVA: 0,
        gananciaUnitaria: 0,
        margen: 0,
      };
    }

    const precioCompraIngresado =
      form.precio_compra.trim() !== ""
        ? toNumber(form.precio_compra)
        : Boolean(productoSeleccionado.precio_compra_incluye_iva)
          ? round2(Number(productoSeleccionado.precio_compra ?? 0) * (1 + IVA))
          : Number(productoSeleccionado.precio_compra ?? 0);

    const precioCompraConIVA = Boolean(productoSeleccionado.precio_compra_incluye_iva)
      ? round2(precioCompraIngresado)
      : round2(precioCompraIngresado * (1 + IVA));

    const precioCompraSinIVA = Boolean(productoSeleccionado.precio_compra_incluye_iva)
      ? round2(precioCompraIngresado / (1 + IVA))
      : round2(precioCompraIngresado);

    const descuentoFiltro = Boolean(productoSeleccionado.incluye_filtro)
      ? toNumber(productoSeleccionado.costo_filtro)
      : 0;

    const descuentoAmbiental = Boolean(productoSeleccionado.incluye_ambiental)
      ? toNumber(productoSeleccionado.costo_ambiental)
      : 0;

    const descuentoTarjeta = Boolean(productoSeleccionado.incluye_tarjeta)
      ? toNumber(productoSeleccionado.costo_tarjeta)
      : 0;

    const descuentoExtras = round2(
      descuentoFiltro + descuentoAmbiental + descuentoTarjeta
    );

    const costoReal = Math.max(0, round2(precioCompraSinIVA - descuentoExtras));
    const precioVentaSugeridoSinIVA = Math.ceil(costoReal * (1 + margenGanancia));
    const precioVentaSugeridoConIVA = Math.ceil(
      precioVentaSugeridoSinIVA * (1 + IVA)
    );
    const gananciaUnitaria = round2(precioVentaSugeridoSinIVA - costoReal);

    const margen =
      precioVentaSugeridoSinIVA > 0
        ? round2((gananciaUnitaria / precioVentaSugeridoSinIVA) * 100)
        : 0;

    return {
      precioCompraConIVA,
      precioCompraSinIVA,
      descuentoExtras,
      costoReal,
      precioVentaSugeridoSinIVA,
      precioVentaSugeridoConIVA,
      gananciaUnitaria,
      margen,
    };
  }, [productoSeleccionado, form.precio_compra, margenGanancia]);

  function updateField<K extends keyof ProductoStockFormData>(
    key: K,
    value: ProductoStockFormData[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.producto_id) {
      setError("Selecciona un producto.");
      return;
    }

    if (!form.cantidad.trim() || Number(form.cantidad) <= 0) {
      setError("La cantidad debe ser mayor a 0.");
      return;
    }

    if (!form.precio_compra.trim() || toNumber(form.precio_compra) <= 0) {
      setError("Ingresa el precio de compra.");
      return;
    }

    try {
      setLoading(true);

      await agregarStockProducto(form.producto_id, {
        cantidad: form.cantidad,
        precio_compra: form.precio_compra,
        precio_venta: String(resumenPrecio.precioVentaSugeridoSinIVA),
      });

      setSuccess("Stock agregado correctamente.");
      setForm(initialState);
      setSearchProducto("");

      if (onCreated) {
        await onCreated();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo agregar stock.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Buscar producto
          </label>
          <input
            value={searchProducto}
            onChange={(e) => setSearchProducto(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Escribe nombre, categoría o marca..."
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <p className="mb-3 text-sm font-semibold text-gray-900">
            Resultados
          </p>

          {productosFiltrados.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay productos que coincidan con la búsqueda.
            </p>
          ) : (
            <div className="grid gap-2">
              {productosFiltrados.map((producto) => {
                const seleccionado = form.producto_id === producto.id;

                return (
                  <button
                    key={producto.id}
                    type="button"
                    onClick={() => {
                      updateField("producto_id", producto.id);
                      setSearchProducto(producto.nombre ?? "");
                    }}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      seleccionado
                        ? "border-yellow-400 bg-yellow-50"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <p className="font-medium text-gray-900">
                      {producto.nombre}
                    </p>
                    <p className="text-sm text-gray-500">
                      {producto.categoria}
                      {producto.marca ? ` • ${producto.marca}` : ""}
                      {typeof producto.stock !== "undefined"
                        ? ` • Stock: ${producto.stock}`
                        : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {productoSeleccionado ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Cantidad a ingresar
              </label>
              <input
                type="number"
                min="1"
                value={form.cantidad}
                onChange={(e) => updateField("cantidad", e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                placeholder="10"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Nuevo precio compra facturado
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.precio_compra}
                onChange={(e) => updateField("precio_compra", e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                placeholder="22.55"
              />
              <p className="mt-1 text-xs text-gray-500">
                Ingresa el valor tal como te lo cobra el proveedor.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-4">
            <p className="mb-3 text-sm font-semibold text-gray-900">
              Configuración actual del producto
            </p>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Stock actual</p>
                <p className="text-sm font-semibold">
                  {productoSeleccionado.stock}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Incluye filtro</p>
                <p className="text-sm font-semibold">
                  {productoSeleccionado.incluye_filtro ? "Sí" : "No"}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Incluye ambiental</p>
                <p className="text-sm font-semibold">
                  {productoSeleccionado.incluye_ambiental ? "Sí" : "No"}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Incluye tarjeta</p>
                <p className="text-sm font-semibold">
                  {productoSeleccionado.incluye_tarjeta ? "Sí" : "No"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-8">
            <div>
              <p className="text-xs text-gray-500">Compra con IVA</p>
              <p className="text-sm font-semibold">
                ${resumenPrecio.precioCompraConIVA.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Compra sin IVA</p>
              <p className="text-sm font-semibold">
                ${resumenPrecio.precioCompraSinIVA.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Descuento extras</p>
              <p className="text-sm font-semibold">
                ${resumenPrecio.descuentoExtras.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Costo real</p>
              <p className="text-sm font-semibold">
                ${resumenPrecio.costoReal.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Venta sugerida sin IVA</p>
              <p className="text-sm font-semibold">
                ${resumenPrecio.precioVentaSugeridoSinIVA.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Venta sugerida con IVA</p>
              <p className="text-sm font-semibold">
                ${resumenPrecio.precioVentaSugeridoConIVA.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Ganancia unitaria</p>
              <p className="text-sm font-semibold">
                ${resumenPrecio.gananciaUnitaria.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Margen</p>
              <p className="text-sm font-semibold">
                {resumenPrecio.margen.toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-900">
              Estado de rentabilidad
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {resumenPrecio.gananciaUnitaria < 0
                ? "Pierdes dinero con este precio."
                : resumenPrecio.gananciaUnitaria === 0
                  ? "No tienes ganancia con este precio."
                  : "La reposición mantiene ganancia positiva."}
            </p>
          </div>
        </>
      ) : null}

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
          disabled={loading || !productoSeleccionado}
          className="rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Agregar stock"}
        </button>
      </div>
    </form>
  );
}