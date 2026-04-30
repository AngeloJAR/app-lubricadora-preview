"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  DollarSign,
  Loader2,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  Search,
  TrendingUp,
} from "lucide-react";
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
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
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

    const base = productos
      .filter((producto) => {
        if (!normalized) return true;

        const baseTexto = [
          producto.nombre,
          producto.categoria,
          producto.marca,
          producto.stock,
          producto.precio_venta,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const aplicacionesTexto = (
          producto.producto_aplicaciones_vehiculo ?? []
        )
          .map((a) =>
            [a.vehiculo_marca, a.vehiculo_modelo, a.vehiculo_motor]
              .filter(Boolean)
              .join(" ")
          )
          .join(" ")
          .toLowerCase();

        return `${baseTexto} ${aplicacionesTexto}`.includes(normalized);
      })
      .sort((a, b) => {
        const stockA = Number(a.stock ?? 0);
        const stockB = Number(b.stock ?? 0);

        if (stockA <= 0 && stockB > 0) return -1;
        if (stockA > 0 && stockB <= 0) return 1;

        return String(a.nombre ?? "").localeCompare(String(b.nombre ?? ""), "es");
      });

    return base.slice(0, 10);
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
        totalCompra: 0,
        totalVentaPotencial: 0,
        totalGananciaPotencial: 0,
      };
    }

    const cantidad = toNumber(form.cantidad);

    const precioCompraIngresado =
      form.precio_compra.trim() !== ""
        ? toNumber(form.precio_compra)
        : Boolean(productoSeleccionado.precio_compra_incluye_iva)
          ? round2(Number(productoSeleccionado.precio_compra ?? 0) * (1 + IVA))
          : Number(productoSeleccionado.precio_compra ?? 0);

    const precioCompraConIVA = Boolean(
      productoSeleccionado.precio_compra_incluye_iva
    )
      ? round2(precioCompraIngresado)
      : round2(precioCompraIngresado * (1 + IVA));

    const precioCompraSinIVA = Boolean(
      productoSeleccionado.precio_compra_incluye_iva
    )
      ? round2(precioCompraIngresado / (1 + IVA))
      : round2(precioCompraIngresado);

    const descuentoExtras = round2(
      (productoSeleccionado.incluye_filtro
        ? toNumber(productoSeleccionado.costo_filtro)
        : 0) +
        (productoSeleccionado.incluye_ambiental
          ? toNumber(productoSeleccionado.costo_ambiental)
          : 0) +
        (productoSeleccionado.incluye_tarjeta
          ? toNumber(productoSeleccionado.costo_tarjeta)
          : 0)
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

    const totalCompra = round2(precioCompraConIVA * cantidad);
    const totalVentaPotencial = round2(precioVentaSugeridoSinIVA * cantidad);
    const totalGananciaPotencial = round2(gananciaUnitaria * cantidad);

    return {
      precioCompraConIVA,
      precioCompraSinIVA,
      descuentoExtras,
      costoReal,
      precioVentaSugeridoSinIVA,
      precioVentaSugeridoConIVA,
      gananciaUnitaria,
      margen,
      totalCompra,
      totalVentaPotencial,
      totalGananciaPotencial,
    };
  }, [
    productoSeleccionado,
    form.precio_compra,
    form.cantidad,
    margenGanancia,
  ]);

  function updateField<K extends keyof ProductoStockFormData>(
    key: K,
    value: ProductoStockFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.producto_id) {
      setError("Selecciona un producto.");
      return;
    }

    if (!form.cantidad.trim() || toNumber(form.cantidad) <= 0) {
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

      await onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar stock.");
    } finally {
      setLoading(false);
    }
  }

  const rentabilidadTexto =
    resumenPrecio.gananciaUnitaria < 0
      ? "Pierdes dinero con este precio."
      : resumenPrecio.gananciaUnitaria === 0
        ? "No tienes ganancia con este precio."
        : "Reposición con ganancia positiva.";

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-yellow-100 p-3 text-yellow-700">
              <PackagePlus className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900">
                Agregar stock existente
              </h2>
              <p className="text-sm text-slate-500">
                Busca un producto ya registrado y actualiza su stock con el
                nuevo costo de compra.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Buscar producto
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchProducto}
                onChange={(e) => setSearchProducto(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-yellow-500 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                placeholder="Buscar producto, marca, categoría o vehículo..."
              />
            </div>
          </div>

          <div className="grid max-h-[380px] gap-2 overflow-y-auto pr-1">
            {productosFiltrados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
                No hay productos que coincidan.
              </div>
            ) : (
              productosFiltrados.map((producto) => {
                const seleccionado = form.producto_id === producto.id;
                const stock = Number(producto.stock ?? 0);

                return (
                  <button
                    key={producto.id}
                    type="button"
                    onClick={() => {
                      updateField("producto_id", producto.id);
                      setSearchProducto(producto.nombre ?? "");
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      seleccionado
                        ? "border-yellow-400 bg-yellow-50 ring-4 ring-yellow-100"
                        : "border-slate-200 bg-white hover:border-yellow-200 hover:bg-yellow-50/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-black text-slate-900">
                            {producto.nombre}
                          </p>

                          {seleccionado ? (
                            <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-[11px] font-bold text-white">
                              Seleccionado
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {[producto.categoria, producto.marca]
                            .filter(Boolean)
                            .join(" • ") || "Producto del inventario"}
                        </p>

                        {(producto.producto_aplicaciones_vehiculo?.length ?? 0) >
                        0 ? (
                          <p className="mt-1 line-clamp-1 text-xs text-slate-600">
                            {(producto.producto_aplicaciones_vehiculo ?? [])
                              .slice(0, 3)
                              .map((a) =>
                                [
                                  a.vehiculo_marca,
                                  a.vehiculo_modelo,
                                  a.vehiculo_motor,
                                ]
                                  .filter(Boolean)
                                  .join(" ")
                              )
                              .join(" • ")}
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-black ${
                            stock > 0
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          Stock {stock}
                        </span>

                        <p className="mt-2 text-xs font-bold text-slate-600">
                          Venta {money(Number(producto.precio_venta ?? 0))}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </section>

      {productoSeleccionado ? (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                <Boxes className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-black text-slate-900">
                  Datos de reposición
                </h3>
                <p className="text-sm text-slate-500">
                  Ingresa la cantidad y el costo real de la nueva compra.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Cantidad a ingresar
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.cantidad}
                  onChange={(e) => updateField("cantidad", e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                  placeholder="Ej: 10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Precio compra facturado
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.precio_compra}
                  onChange={(e) => updateField("precio_compra", e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                  placeholder="Ej: 22.55"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Ingresa el valor tal como cobra el proveedor.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <TrendingUp className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-black text-slate-900">
                    Resumen automático
                  </h3>
                  <p
                    className={`text-sm font-medium ${
                      resumenPrecio.gananciaUnitaria > 0
                        ? "text-emerald-600"
                        : resumenPrecio.gananciaUnitaria < 0
                          ? "text-red-600"
                          : "text-slate-500"
                    }`}
                  >
                    {rentabilidadTexto}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-3 text-right">
                <p className="text-xs font-bold uppercase tracking-wide text-yellow-700">
                  Venta sugerida
                </p>
                <p className="text-2xl font-black text-yellow-900">
                  {money(resumenPrecio.precioVentaSugeridoSinIVA)}
                </p>
              </div>
            </div>

            <div className="mb-3 grid gap-3 md:grid-cols-3">
              <InfoCard
                icon={<DollarSign className="h-5 w-5" />}
                label="Total compra"
                value={money(resumenPrecio.totalCompra)}
                tone="yellow"
              />
              <InfoCard
                icon={<PackageCheck className="h-5 w-5" />}
                label="Venta potencial"
                value={money(resumenPrecio.totalVentaPotencial)}
                tone="blue"
              />
              <InfoCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Ganancia potencial"
                value={money(resumenPrecio.totalGananciaPotencial)}
                tone={
                  resumenPrecio.totalGananciaPotencial > 0
                    ? "green"
                    : resumenPrecio.totalGananciaPotencial < 0
                      ? "red"
                      : "slate"
                }
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Info label="Stock actual" value={productoSeleccionado.stock} />
              <Info
                label="Compra con IVA"
                value={money(resumenPrecio.precioCompraConIVA)}
              />
              <Info
                label="Compra sin IVA"
                value={money(resumenPrecio.precioCompraSinIVA)}
              />
              <Info label="Extras" value={money(resumenPrecio.descuentoExtras)} />
              <Info label="Costo real" value={money(resumenPrecio.costoReal)} />
              <Info
                label="Venta con IVA"
                value={money(resumenPrecio.precioVentaSugeridoConIVA)}
              />
              <Info
                label="Ganancia unidad"
                value={money(resumenPrecio.gananciaUnitaria)}
              />
              <Info
                label="Margen"
                value={`${resumenPrecio.margen.toFixed(2)}%`}
              />
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
            <PackageSearch className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">
            Selecciona un producto para continuar
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Después de seleccionarlo podrás ingresar cantidad, costo y revisar la
            venta sugerida.
          </p>
        </section>
      )}

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading || !productoSeleccionado}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <PackagePlus className="h-4 w-4" />
            Agregar stock
          </>
        )}
      </button>
    </form>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-900">{value ?? "-"}</p>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "yellow" | "blue" | "green" | "red" | "slate";
}) {
  const styles = {
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    red: "border-red-200 bg-red-50 text-red-800",
    slate: "border-slate-200 bg-slate-50 text-slate-800",
  };

  return (
    <div className={`rounded-3xl border p-4 ${styles[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            {label}
          </p>
          <p className="mt-1 text-xl font-black">{value}</p>
        </div>

        <div className="rounded-2xl bg-white/70 p-3">{icon}</div>
      </div>
    </div>
  );
}