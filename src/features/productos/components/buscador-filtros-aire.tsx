"use client";

import {
  AlertCircle,
  CarFront,
  CheckCircle2,
  CircleDollarSign,
  Eraser,
  Filter,
  Loader2,
  PackageSearch,
  Search,
  Tag,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buscarCatalogoGeneral } from "../actions";

type ResultadoCatalogo = {
  tipo: "producto" | "aplicacion";
  id: string;
  producto: {
    id: string;
    nombre: string;
    categoria: string;
    marca: string | null;
    stock: number;
    precio_venta: number;
    activo: boolean;
    notas?: string | null;
  } | null;
  aplicacion: {
    id: string;
    tipo_filtro: string;
    vehiculo_marca: string;
    vehiculo_modelo: string | null;
    vehiculo_motor: string | null;
    codigo_referencia: string;
    notas: string | null;
  } | null;
};

function formatMoney(value: number | string | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

export function BuscadorFiltrosAire() {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<ResultadoCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [error, setError] = useState("");

  const resumen = useMemo(() => {
    const conStock = resultados.filter(
      (item) => Number(item.producto?.stock ?? 0) > 0
    ).length;

    return {
      total: resultados.length,
      conStock,
      sinStock: resultados.length - conStock,
    };
  }, [resultados]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const texto = busqueda.trim();

      if (!texto) {
        setResultados([]);
        setBuscado(false);
        setError("");
        return;
      }

      try {
        setLoading(true);
        setBuscado(true);
        setError("");

        const data = (await buscarCatalogoGeneral({
          busqueda: texto,
        })) as ResultadoCatalogo[];

        const productosConAplicacion = new Set(
          data
            .filter((item) => item.tipo === "aplicacion")
            .map((item) => item.producto?.id)
            .filter(Boolean)
        );

        const filtrados = data.filter((item) => {
          if (item.tipo === "producto" && item.producto?.id) {
            return !productosConAplicacion.has(item.producto.id);
          }

          return true;
        });

        setResultados(filtrados);
      } catch (err) {
        console.error(err);
        setResultados([]);
        setError("No se pudo buscar en el catálogo.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [busqueda]);

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-yellow-100 p-3 text-yellow-700">
              <PackageSearch className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                Buscador de filtros de aire
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Busca por producto, código, marca, categoría, vehículo o motor.
              </p>
            </div>
          </div>

          {buscado ? (
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 text-center">
              <div className="px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Total
                </p>
                <p className="text-lg font-black text-slate-900">
                  {resumen.total}
                </p>
              </div>

              <div className="px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
                  Stock
                </p>
                <p className="text-lg font-black text-emerald-600">
                  {resumen.conStock}
                </p>
              </div>

              <div className="px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                  Sin
                </p>
                <p className="text-lg font-black text-red-600">
                  {resumen.sinStock}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              placeholder="Ej: A1433, Suzuki Grand Vitara, Sakura..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
            />
          </div>

          {busqueda ? (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <Eraser className="h-4 w-4" />
              Limpiar
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-yellow-600" />
          <p className="mt-3 text-sm font-bold text-slate-600">
            Buscando en catálogo...
          </p>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {!loading && !error && buscado && resultados.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
            <Filter className="h-7 w-7" />
          </div>

          <h3 className="mt-4 text-base font-bold text-slate-900">
            No se encontraron resultados
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Intenta buscar por código de filtro, marca del vehículo, modelo,
            motor, categoría o nombre del producto.
          </p>
        </div>
      ) : null}

      {!loading && !error && resultados.length > 0 ? (
        <div className="grid gap-3">
          {resultados.map((item) => {
            const producto = item.producto;
            const aplicacion = item.aplicacion;

            const productoNombre = producto?.nombre ?? "Producto no vinculado";
            const productoMarca = producto?.marca ?? "Sin marca";
            const categoria = producto?.categoria ?? "Sin categoría";
            const stock = Number(producto?.stock ?? 0);
            const precio = Number(producto?.precio_venta ?? 0);
            const hasStock = stock > 0;

            return (
              <article
                key={`${item.tipo}-${item.id}`}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="break-words text-base font-black text-slate-900">
                        {productoNombre}
                      </h4>

                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                        <Tag className="h-3.5 w-3.5" />
                        {categoria}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                        {productoMarca}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${
                          hasStock
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {hasStock ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5" />
                        )}
                        {hasStock ? `Stock: ${stock}` : "Sin stock"}
                      </span>
                    </div>

                    {aplicacion ? (
                      <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                        <div className="flex items-start gap-2">
                          <CarFront className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                          <div className="min-w-0">
                            <p className="break-words text-sm font-bold text-blue-900">
                              {aplicacion.vehiculo_marca}{" "}
                              {aplicacion.vehiculo_modelo ?? ""}
                              {aplicacion.vehiculo_motor
                                ? ` • ${aplicacion.vehiculo_motor}`
                                : ""}
                            </p>

                            <p className="mt-1 text-sm text-blue-700">
                              Código:{" "}
                              <span className="font-black">
                                {aplicacion.codigo_referencia}
                              </span>{" "}
                              • Tipo: {aplicacion.tipo_filtro}
                            </p>

                            {aplicacion.notas ? (
                              <p className="mt-1 text-xs text-blue-700/80">
                                {aplicacion.notas}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm font-medium text-slate-500">
                        Producto del inventario sin aplicación específica.
                      </p>
                    )}

                    {producto?.notas ? (
                      <p className="mt-2 text-sm text-slate-500">
                        {producto.notas}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right lg:min-w-40">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Precio venta
                    </p>

                    <div className="flex items-center justify-end gap-2">
                      <CircleDollarSign className="h-5 w-5 text-emerald-600" />
                      <p className="text-2xl font-black text-slate-900">
                        {formatMoney(precio)}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}