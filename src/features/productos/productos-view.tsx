"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  DollarSign,
  Loader2,
  PackageSearch,
  PackageX,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";
import type { Producto } from "@/types";
import { getProductos } from "./actions";
import { ProductoForm } from "./producto-form";
import { ProductoStockForm } from "./producto-stock-form";
import { ProductosTable } from "./productos-table";
import { BuscadorFiltrosAire } from "./components/buscador-filtros-aire";

type ProductosViewProps = {
  canManageProductos: boolean;
};

function formatMoney(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function ProductosView({ canManageProductos }: ProductosViewProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProductos() {
    try {
      setError("");
      setLoading(true);

      const data = await getProductos();
      setProductos(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los productos.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProductos();
  }, []);

  const resumen = useMemo(() => {
    const totalProductos = productos.length;

    const productosConStock = productos.filter(
      (producto) => Number(producto.stock ?? 0) > 0
    ).length;

    const productosSinStock = productos.filter(
      (producto) => Number(producto.stock ?? 0) <= 0
    ).length;

    const valorInventario = productos.reduce((total, producto) => {
      return (
        total +
        Number(producto.stock ?? 0) * Number(producto.precio_compra ?? 0)
      );
    }, 0);

    const valorVentaPotencial = productos.reduce((total, producto) => {
      return (
        total +
        Number(producto.stock ?? 0) * Number(producto.precio_venta ?? 0)
      );
    }, 0);

    return {
      totalProductos,
      productosConStock,
      productosSinStock,
      valorInventario,
      valorVentaPotencial,
    };
  }, [productos]);

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-sm">
        <div className="relative p-5 text-white md:p-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-yellow-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-10 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-300">
                <Boxes className="h-3.5 w-3.5" />
                Catálogo e inventario
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
                Productos del taller
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Busca productos por código, marca, categoría o compatibilidad.
                Registra productos limpios y administra el stock real del
                negocio.
              </p>
            </div>

            <button
              type="button"
              onClick={loadProductos}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Total productos
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {resumen.totalProductos}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <PackageSearch className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                Con stock
              </p>
              <p className="mt-2 text-2xl font-black text-emerald-800">
                {resumen.productosConStock}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                Sin stock
              </p>
              <p className="mt-2 text-2xl font-black text-red-800">
                {resumen.productosSinStock}
              </p>
            </div>

            <div className="rounded-2xl bg-red-100 p-3 text-red-700">
              <PackageX className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-yellow-700">
                Valor inventario
              </p>
              <p className="mt-2 text-2xl font-black text-yellow-900">
                {formatMoney(resumen.valorInventario)}
              </p>
            </div>

            <div className="rounded-2xl bg-yellow-100 p-3 text-yellow-700">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4 shadow-sm sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                Venta potencial
              </p>
              <p className="mt-2 text-2xl font-black text-blue-900">
                {formatMoney(resumen.valorVentaPotencial)}
              </p>
            </div>

            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
            <Search className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-900">
              Buscar catálogo general
            </h2>
            <p className="text-sm text-slate-500">
              Busca por producto, código, marca o vehículo compatible.
            </p>
          </div>
        </div>

        <BuscadorFiltrosAire />
      </section>

      {canManageProductos ? (
        <section className="grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <ProductoForm onCreated={loadProductos} />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <ProductoStockForm productos={productos} onCreated={loadProductos} />
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Inventario y rentabilidad
            </h2>
            <p className="text-sm text-slate-500">
              Lista completa de productos, stock, precios y estado.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            {resumen.totalProductos} registros
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm font-medium text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
            Cargando productos...
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : (
          <ProductosTable
            productos={productos}
            canManageProductos={canManageProductos}
          />
        )}
      </section>
    </div>
  );
}