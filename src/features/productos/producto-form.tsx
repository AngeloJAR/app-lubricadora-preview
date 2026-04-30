"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Boxes,
  CarFront,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Loader2,
  PackagePlus,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import type { ProductoFormData } from "@/types";
import { getConfiguracionTaller } from "@/features/configuracion/actions";
import {
  createAplicacionFiltroAire,
  createProducto,
  getCategoriasProductos,
} from "./actions";

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

type AplicacionFiltro = {
  vehiculo_marca: string;
  vehiculo_modelo: string;
  vehiculo_motor: string;
};

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return 0;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function ordenarCategorias(categorias: string[]) {
  return [...categorias].sort((a, b) => {
    const aOtros = a.toLowerCase().trim() === "otros";
    const bOtros = b.toLowerCase().trim() === "otros";

    if (aOtros) return 1;
    if (bOtros) return -1;

    return a.localeCompare(b, "es");
  });
}

export function ProductoForm({ onCreated }: ProductoFormProps) {
  const [form, setForm] = useState<ProductoFormData>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [margenGanancia, setMargenGanancia] = useState(0.45);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [aplicaciones, setAplicaciones] = useState<AplicacionFiltro[]>([]);

  const esFiltro = form.categoria.toLowerCase().includes("filtro");

  const categoriasOrdenadas = useMemo(
    () => ordenarCategorias(categorias),
    [categorias]
  );

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

  useEffect(() => {
    async function loadCategorias() {
      try {
        const data = await getCategoriasProductos();
        setCategorias(data);
      } catch {
        setCategorias([]);
      }
    }

    loadCategorias();
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
        margenReal: 0,
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
    const margenReal =
      precioVentaSinIVA > 0 ? (gananciaSinIVA / precioVentaSinIVA) * 100 : 0;

    return {
      precioCompraConIVA: Number(precioCompraConIVA.toFixed(2)),
      precioCompraSinIVA: Number(precioCompraSinIVA.toFixed(2)),
      costoReal: Number(costoReal.toFixed(2)),
      precioVentaSinIVA: Number(precioVentaSinIVA.toFixed(2)),
      precioVentaConIVA: Number(precioVentaConIVA.toFixed(2)),
      gananciaSinIVA: Number(gananciaSinIVA.toFixed(2)),
      descuentoExtras: Number(descuentoExtras.toFixed(2)),
      margenReal: Number(margenReal.toFixed(1)),
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

      const productoCreado = await createProducto({
        ...form,
        precio_venta: String(resumenPrecio.precioVentaSinIVA),
        costo_filtro: form.incluye_filtro ? form.costo_filtro : "0",
        costo_ambiental: form.incluye_ambiental ? form.costo_ambiental : "0",
        costo_tarjeta: form.incluye_tarjeta ? form.costo_tarjeta : "0",
      });

      const aplicacionesFiltradas = Array.from(
        new Map(
          aplicaciones
            .filter(
              (app) => app.vehiculo_marca.trim() && app.vehiculo_modelo.trim()
            )
            .map((app) => [
              `${app.vehiculo_marca.toLowerCase().trim()}-${app.vehiculo_modelo
                .toLowerCase()
                .trim()}-${app.vehiculo_motor.toLowerCase().trim()}`,
              app,
            ])
        ).values()
      );

      if (esFiltro && aplicacionesFiltradas.length > 0) {
        for (const app of aplicacionesFiltradas) {
          await createAplicacionFiltroAire({
            producto_id: productoCreado.id,
            vehiculo_marca: app.vehiculo_marca,
            vehiculo_modelo: app.vehiculo_modelo,
            vehiculo_motor: app.vehiculo_motor,
            codigo_referencia: form.nombre,
          });
        }
      }

      setSuccess("Producto registrado correctamente en el catálogo.");
      setForm(initialState);
      setAplicaciones([]);

      if (onCreated) await onCreated();
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

  function agregarAplicacion() {
    setAplicaciones((prev) => [
      ...prev,
      {
        vehiculo_marca: "",
        vehiculo_modelo: "",
        vehiculo_motor: "",
      },
    ]);
  }

  function actualizarAplicacion(
    index: number,
    campo: keyof AplicacionFiltro,
    valor: string
  ) {
    setAplicaciones((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [campo]: valor };
      return copia;
    });
  }

  function eliminarAplicacion(index: number) {
    setAplicaciones((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-yellow-100 p-3 text-yellow-700">
              <PackagePlus className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Registrar producto
              </h2>
              <p className="text-sm text-slate-500">
                Agrega el producto al catálogo, calcula su precio sugerido y
                registra aplicaciones si es filtro.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Nombre del producto
              </label>
              <input
                value={form.nombre}
                onChange={(e) => updateField("nombre", e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                placeholder="Ej: Sakura A1433 / Kendall 20W50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Categoría
              </label>
              <select
                value={form.categoria}
                onChange={(e) => updateField("categoria", e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
              >
                <option value="">Selecciona una categoría</option>

                {categoriasOrdenadas.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Marca
              </label>
              <input
                value={form.marca}
                onChange={(e) => updateField("marca", e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                placeholder="Kendall / Sakura"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Stock inicial
              </label>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => updateField("stock", e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                placeholder="10"
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
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                placeholder="Ej: 20.24"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Precio venta sugerido
              </label>
              <div className="flex h-11 items-center justify-between rounded-2xl border border-yellow-200 bg-yellow-50 px-4">
                <span className="text-sm text-yellow-800">
                  Sin IVA para guardar en producto
                </span>
                <span className="text-lg font-black text-yellow-700">
                  {money(resumenPrecio.precioVentaSinIVA)}
                </span>
              </div>
            </div>
          </div>

          <label className="flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.precio_compra_incluye_iva}
              onChange={(e) =>
                updateField("precio_compra_incluye_iva", e.target.checked)
              }
              className="h-4 w-4 accent-yellow-500"
            />
            El precio de compra ingresado ya incluye IVA
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
            <CircleDollarSign className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-bold text-slate-900">Costos incluidos</h3>
            <p className="text-sm text-slate-500">
              Estos valores se descuentan del costo real cuando el proveedor ya
              los incluye en la compra.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: "Incluye filtro",
              checked: form.incluye_filtro,
              checkKey: "incluye_filtro" as const,
              value: form.costo_filtro,
              valueKey: "costo_filtro" as const,
              placeholder: "Costo del filtro",
            },
            {
              label: "Incluye ambiental",
              checked: form.incluye_ambiental,
              checkKey: "incluye_ambiental" as const,
              value: form.costo_ambiental,
              valueKey: "costo_ambiental" as const,
              placeholder: "Costo ambiental",
            },
            {
              label: "Incluye tarjeta kilometraje",
              checked: form.incluye_tarjeta,
              checkKey: "incluye_tarjeta" as const,
              value: form.costo_tarjeta,
              valueKey: "costo_tarjeta" as const,
              placeholder: "Costo tarjeta",
            },
          ].map((item) => (
            <div
              key={item.checkKey}
              className={`rounded-2xl border p-4 transition ${
                item.checked
                  ? "border-yellow-300 bg-yellow-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => updateField(item.checkKey, e.target.checked)}
                  className="h-4 w-4 accent-yellow-500"
                />
                {item.label}
              </label>

              <input
                type="number"
                step="0.01"
                min="0"
                value={item.value}
                onChange={(e) => updateField(item.valueKey, e.target.value)}
                disabled={!item.checked}
                className="mt-3 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                placeholder={item.placeholder}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
            <Boxes className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-bold text-slate-900">Resumen de precio</h3>
            <p className="text-sm text-slate-500">
              Margen configurado: {(margenGanancia * 100).toFixed(0)}%.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          {[
            ["Compra con IVA", money(resumenPrecio.precioCompraConIVA)],
            ["Compra sin IVA", money(resumenPrecio.precioCompraSinIVA)],
            ["Extras", money(resumenPrecio.descuentoExtras)],
            ["Costo real", money(resumenPrecio.costoReal)],
            ["Venta sin IVA", money(resumenPrecio.precioVentaSinIVA)],
            ["Venta con IVA", money(resumenPrecio.precioVentaConIVA)],
            ["Ganancia", money(resumenPrecio.gananciaSinIVA)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {label}
              </p>
              <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {esFiltro ? (
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-600 p-3 text-white">
                <CarFront className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-bold text-blue-950">
                  Aplicaciones del filtro
                </h3>
                <p className="text-sm text-blue-700">
                  Agrega los vehículos compatibles con este filtro.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={agregarAplicacion}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Agregar aplicación
            </button>
          </div>

          {aplicaciones.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-5 text-center text-sm text-blue-700">
              Todavía no agregas aplicaciones. Puedes registrar el producto sin
              aplicaciones o agregarlas aquí.
            </div>
          ) : (
            <div className="grid gap-3">
              {aplicaciones.map((app, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-2xl border border-blue-200 bg-white p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <input
                    value={app.vehiculo_marca}
                    onChange={(e) =>
                      actualizarAplicacion(
                        index,
                        "vehiculo_marca",
                        e.target.value
                      )
                    }
                    placeholder="Marca del vehículo"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  <input
                    value={app.vehiculo_modelo}
                    onChange={(e) =>
                      actualizarAplicacion(
                        index,
                        "vehiculo_modelo",
                        e.target.value
                      )
                    }
                    placeholder="Modelo"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  <input
                    value={app.vehiculo_motor}
                    onChange={(e) =>
                      actualizarAplicacion(
                        index,
                        "vehiculo_motor",
                        e.target.value
                      )
                    }
                    placeholder="Motor / año"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() => eliminarAplicacion(index)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <FileText className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-bold text-slate-900">Notas y estado</h3>
            <p className="text-sm text-slate-500">
              Información adicional para identificar mejor el producto.
            </p>
          </div>
        </div>

        <textarea
          value={form.notas}
          onChange={(e) => updateField("notas", e.target.value)}
          className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
          placeholder="Observaciones del producto..."
        />

        <label className="mt-4 flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(e) => updateField("activo", e.target.checked)}
            className="h-4 w-4 accent-yellow-500"
          />
          Producto activo
        </label>
      </section>

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {success}
        </div>
      ) : null}

      <div className="sticky bottom-4 z-10 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-w-52 items-center justify-center gap-2 rounded-2xl bg-yellow-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-yellow-500/20 transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <PackagePlus className="h-4 w-4" />
              Registrar producto
            </>
          )}
        </button>
      </div>
    </form>
  );
}