"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  BadgeDollarSign,
  Boxes,
  CalendarDays,
  CheckCircle2,
  FileText,
  Link2,
  PackagePlus,
  ReceiptText,
  RefreshCcw,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  createFacturaCompra,
  createProveedor,
  createProductoDesdeFactura,
  getProductoAliasProveedorMap,
  replaceProductoDesdeFactura,
} from "./actions";

import type { FacturaImportPreview, ProductoLite, Proveedor } from "@/types";

type FacturaImportEditorProps = {
  data: FacturaImportPreview;
  proveedores: Proveedor[];
  productos: ProductoLite[];
};

const PRODUCTO_CATEGORIAS = [
  "Aceites Galónes",
  "Aceites cuartos",
  "Filtros aceite",
  "Filtros aire",
  "Filtros combustible",
  "Aditivos",
  "Repuestos",
  "Accesorios",
  "Lubricantes",
  "Líquidos",
  "Otros",
] as const;

const inputClass =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-500";

function inferCategoriaFromDescripcion(descripcion: string) {
  const text = descripcion.toLowerCase();

  if (text.includes("filtro aceite")) return "Filtros aceite";
  if (text.includes("filtro aire")) return "Filtros aire";
  if (text.includes("filtro combustible")) return "Filtros combustible";
  if (text.includes("aditivo")) return "Aditivos";

  if (text.includes("aceite")) {
    if (
      text.includes("4/1") ||
      text.includes("4x1") ||
      text.includes("4 x 1") ||
      text.includes("gal") ||
      text.includes("gl")
    ) {
      return "Aceites Galónes";
    }

    return "Aceites cuartos";
  }

  if (
    text.includes("refrigerante") ||
    text.includes("coolant") ||
    text.includes("liquido") ||
    text.includes("líquido")
  ) {
    return "Líquidos";
  }

  return "Otros";
}

function inferUnidadCompraFromDescripcion(
  descripcion: string
): "unidad" | "caja" | "galon" | "cuarto" {
  const text = descripcion.toLowerCase();

  if (
    text.includes("4/1 gl") ||
    text.includes("4/1 gal") ||
    text.includes("4x1 gl") ||
    text.includes("4 x 1 gl") ||
    text.includes("4/1")
  ) {
    return "caja";
  }

  return "unidad";
}

function inferFactorConversionFromDescripcion(descripcion: string) {
  const text = descripcion.toLowerCase();

  const match = text.match(/(\d+)\s*(?:\/|x)\s*1\s*(?:gl|gal|gln|galon|galón)/i);
  if (match) return Number(match[1]);

  return 1;
}

function formatMoney(value?: number | string | null) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function calcularCostoUnitarioBase(subtotal: number, cantidadBase: number) {
  if (cantidadBase <= 0) return 0;
  return Number((subtotal / cantidadBase).toFixed(4));
}

export function FacturaImportEditor({
  data,
  proveedores,
  productos,
}: FacturaImportEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const proveedorEncontrado = proveedores.find(
    (item) =>
      item.ruc &&
      data.proveedor_ruc &&
      item.ruc.trim() === data.proveedor_ruc.trim()
  );

  const [proveedorId, setProveedorId] = useState(proveedorEncontrado?.id ?? "");
  const [proveedorNombre, setProveedorNombre] = useState(data.proveedor_nombre);
  const [proveedorRuc, setProveedorRuc] = useState(data.proveedor_ruc ?? "");
  const [numeroFactura, setNumeroFactura] = useState(data.numero_factura);
  const [fecha, setFecha] = useState(data.fecha);
  const [observaciones, setObservaciones] = useState("");

  const [items, setItems] = useState(
    data.items.map((item) => {
      const unidad_compra = inferUnidadCompraFromDescripcion(
        item.descripcion_original
      );
      const factor_conversion = inferFactorConversionFromDescripcion(
        item.descripcion_original
      );

      return {
        ...item,
        unidad_compra,
        factor_conversion,
        cantidad_base: Number(item.cantidad || 0) * factor_conversion,
      };
    })
  );

  const [categoriasPorItem, setCategoriasPorItem] = useState<string[]>(
    data.items.map((item) =>
      inferCategoriaFromDescripcion(item.descripcion_original)
    )
  );

  const [marcasPorItem, setMarcasPorItem] = useState<string[]>(
    data.items.map(() => "")
  );

  useEffect(() => {
    async function autovincularProductos() {
      if (!proveedorId) return;
      if (!items.length) return;

      try {
        const aliasMap = await getProductoAliasProveedorMap(proveedorId);

        setItems((prev) =>
          prev.map((item) => {
            if (item.producto_id) return item;

            const key = item.descripcion_original.trim().toLowerCase();
            const productoId = aliasMap[key];

            if (!productoId) return item;

            return {
              ...item,
              producto_id: productoId,
            };
          })
        );
      } catch {
        // no bloquear el editor si falla la autovinculación
      }
    }

    autovincularProductos();
  }, [proveedorId]);

  useEffect(() => {
    const proveedorMatch = proveedores.find(
      (item) =>
        item.ruc && proveedorRuc && item.ruc.trim() === proveedorRuc.trim()
    );

    if (proveedorMatch?.id && proveedorMatch.id !== proveedorId) {
      setProveedorId(proveedorMatch.id);
    }
  }, [proveedorRuc, proveedores, proveedorId]);

  const totalCalculado = useMemo(
    () => items.reduce((acc, item) => acc + Number(item.total || 0), 0),
    [items]
  );

  const subtotalCalculado = useMemo(
    () => items.reduce((acc, item) => acc + Number(item.subtotal || 0), 0),
    [items]
  );

  const ivaCalculado = useMemo(
    () => items.reduce((acc, item) => acc + Number(item.iva || 0), 0),
    [items]
  );

  const itemsVinculados = useMemo(
    () => items.filter((item) => item.producto_id).length,
    [items]
  );

  function updateItem(
    index: number,
    field: keyof (typeof items)[number],
    value: string | number | null
  ) {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const next = { ...item, [field]: value };

        const cantidad = Number(next.cantidad || 0);
        const costo = Number(next.costo_unitario || 0);
        const factor = Math.max(1, Number(next.factor_conversion || 1));

        const subtotal = cantidad * costo;
        const cantidad_base = cantidad * factor;

        return {
          ...next,
          factor_conversion: factor,
          cantidad_base,
          subtotal,
          total: subtotal + Number(next.iva || 0),
        };
      })
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setCategoriasPorItem((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== index)
    );
    setMarcasPorItem((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  async function replaceMiProducto(index: number) {
    const item = items[index];

    if (!item?.producto_id) {
      setError("Selecciona primero un producto del sistema.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await replaceProductoDesdeFactura({
        producto_id: item.producto_id,
        descripcion_original: item.descripcion_original,
        costo_unitario: Number(item.costo_unitario || 0),
      });

      setSuccess("Producto actualizado con los datos de la factura.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el producto."
      );
    }
  }

  async function createProductoFromItem(index: number) {
    const item = items[index];

    setError("");
    setSuccess("");

    try {
      const nuevoProducto = await createProductoDesdeFactura({
        descripcion_original: item.descripcion_original,
        costo_unitario: Number(item.costo_unitario || 0),
        categoria: categoriasPorItem[index] || "Otros",
        marca: marcasPorItem[index] || null,
      });

      setItems((prev) =>
        prev.map((current, itemIndex) =>
          itemIndex === index
            ? {
                ...current,
                producto_id: nuevoProducto.id,
              }
            : current
        )
      );

      setSuccess("Producto creado desde la factura y vinculado al item.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear el producto desde la factura."
      );
    }
  }

  async function ensureProveedor() {
    if (proveedorId) return proveedorId;

    const proveedor = await createProveedor({
      nombre: proveedorNombre,
      ruc: proveedorRuc,
    });

    setProveedorId(proveedor.id);
    return proveedor.id;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        if (items.length === 0) {
          throw new Error("Debes dejar al menos un item en la factura.");
        }

        const finalProveedorId = await ensureProveedor();

        await createFacturaCompra({
          proveedor_id: finalProveedorId,
          numero_factura: numeroFactura,
          fecha,
          observaciones,
          subtotal: subtotalCalculado,
          iva: ivaCalculado,
          total: totalCalculado,
          origen: "xml",
          items: items.map((item) => {
            const cantidad = Number(item.cantidad);
            const factor = Number(item.factor_conversion || 1);

            return {
              descripcion_original: item.descripcion_original,
              producto_id: item.producto_id ?? null,
              cantidad,
              costo_unitario: Number(item.costo_unitario),
              unidad_compra: item.unidad_compra ?? "unidad",
              factor_conversion: factor,
              cantidad_base: cantidad * factor,
              subtotal: Number(item.subtotal),
              iva: Number(item.iva),
              total: Number(item.total),
            };
          }),
        });

        setSuccess("Factura importada correctamente.");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo guardar la factura."
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <ReceiptText className="size-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Importación XML
              </p>
              <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                Revisión de factura importada
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Confirma proveedor, productos vinculados y costos antes de
                guardar la compra.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium text-slate-400">Items</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {items.length}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
              <p className="text-xs font-medium text-blue-600">Vinculados</p>
              <p className="mt-1 text-xl font-bold text-blue-800">
                {itemsVinculados}/{items.length}
              </p>
            </div>

            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 shadow-sm">
              <p className="text-xs font-medium text-green-700">Total</p>
              <p className="mt-1 text-xl font-bold text-green-800">
                {formatMoney(totalCalculado)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <UserRound className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Datos de la factura
            </h3>
            <p className="text-xs text-slate-500">
              Proveedor detectado desde el XML y datos del comprobante.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2">
            <label className={labelClass}>Proveedor detectado</label>
            <input
              value={proveedorNombre}
              onChange={(e) => setProveedorNombre(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div className="grid gap-2">
            <label className={labelClass}>RUC</label>
            <input
              value={proveedorRuc}
              onChange={(e) => setProveedorRuc(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid gap-2">
            <label className={labelClass}>Número factura</label>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-3 size-5 text-slate-400" />
              <input
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                className={`${inputClass} w-full pl-10`}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className={labelClass}>Fecha</label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-3 size-5 text-slate-400" />
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={`${inputClass} w-full pl-10`}
                required
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Boxes className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-950">
              Items detectados
            </h3>
            <p className="text-sm text-slate-500">
              Ajusta unidad, factor y vínculo con tu inventario.
            </p>
          </div>
        </div>

        {items.map((item, index) => {
          const cantidadBaseCalculada = Number(item.cantidad_base || 0);
          const costoUnitarioBase = calcularCostoUnitarioBase(
            Number(item.subtotal || 0),
            cantidadBaseCalculada
          );

          return (
            <div
              key={index}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                    <span className="text-sm font-black">#{index + 1}</span>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      {item.descripcion_original || `Item ${index + 1}`}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        <Boxes className="size-3.5" />
                        Base: {cantidadBaseCalculada.toFixed(2)}
                      </span>

                      {item.producto_id ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                          <CheckCircle2 className="size-3.5" />
                          Vinculado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          <AlertCircle className="size-3.5" />
                          Sin vincular
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </button>
              </div>

              <div className="grid gap-4 p-4">
                <div className="grid gap-4 lg:grid-cols-12">
                  <div className="grid gap-2 lg:col-span-5">
                    <label className={labelClass}>Descripción factura</label>
                    <input
                      value={item.descripcion_original}
                      onChange={(e) =>
                        updateItem(index, "descripcion_original", e.target.value)
                      }
                      className={inputClass}
                      required
                    />
                  </div>

                  <div className="grid gap-2 lg:col-span-4">
                    <label className={labelClass}>Producto sistema</label>
                    <select
                      value={item.producto_id ?? ""}
                      onChange={(e) =>
                        updateItem(index, "producto_id", e.target.value || null)
                      }
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

                  <div className="grid gap-2 lg:col-span-1">
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

                  <div className="grid gap-2 lg:col-span-2">
                    <label className={labelClass}>Costo</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.costo_unitario}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "costo_unitario",
                          Number(e.target.value)
                        )
                      }
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="grid gap-2">
                    <label className={labelClass}>Unidad</label>
                    <select
                      value={item.unidad_compra ?? "unidad"}
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

                  <div className="grid gap-2">
                    <label className={labelClass}>Factor</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.factor_conversion ?? 1}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "factor_conversion",
                          Number(e.target.value)
                        )
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className={labelClass}>Categoría nuevo producto</label>
                    <select
                      value={categoriasPorItem[index] ?? "Otros"}
                      onChange={(e) =>
                        setCategoriasPorItem((prev) =>
                          prev.map((value, itemIndex) =>
                            itemIndex === index ? e.target.value : value
                          )
                        )
                      }
                      className={inputClass}
                    >
                      {PRODUCTO_CATEGORIAS.map((categoria) => (
                        <option key={categoria} value={categoria}>
                          {categoria}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className={labelClass}>Marca nuevo producto</label>
                    <input
                      value={marcasPorItem[index] ?? ""}
                      onChange={(e) =>
                        setMarcasPorItem((prev) =>
                          prev.map((value, itemIndex) =>
                            itemIndex === index ? e.target.value : value
                          )
                        )
                      }
                      className={inputClass}
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium text-slate-500">
                      Subtotal
                    </p>
                    <p className="mt-1 text-base font-bold text-slate-900">
                      {formatMoney(item.subtotal)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium text-slate-500">
                      Cantidad base
                    </p>
                    <p className="mt-1 text-base font-bold text-slate-900">
                      {cantidadBaseCalculada.toFixed(2)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3">
                    <p className="text-xs font-medium text-purple-600">
                      Costo base
                    </p>
                    <p className="mt-1 text-base font-bold text-purple-800">
                      {formatMoney(costoUnitarioBase)}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <label className={labelClass}>IVA</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.iva}
                      onChange={(e) =>
                        updateItem(index, "iva", Number(e.target.value))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                    <p className="text-xs font-medium text-blue-600">Total</p>
                    <p className="mt-1 text-base font-bold text-blue-800">
                      {formatMoney(item.total)}
                    </p>
                  </div>

                  <div className="flex flex-col justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => createProductoFromItem(index)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <PackagePlus className="size-4" />
                      Crear
                    </button>

                    <button
                      type="button"
                      onClick={() => replaceMiProducto(index)}
                      disabled={!item.producto_id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCcw className="size-4" />
                      Reemplazar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
            <FileText className="size-4 text-slate-500" />
            Observaciones
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            placeholder="Notas sobre esta importación..."
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <BadgeDollarSign className="size-5 text-green-300" />
            <h3 className="text-sm font-bold">Resumen</h3>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-slate-400">Subtotal</p>
              <p className="mt-1 font-bold">{formatMoney(subtotalCalculado)}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-slate-400">IVA</p>
              <p className="mt-1 font-bold">{formatMoney(ivaCalculado)}</p>
            </div>

            <div className="rounded-2xl border border-green-400/30 bg-green-400/10 px-4 py-3">
              <p className="text-xs text-green-200">Total factura</p>
              <p className="mt-1 text-2xl font-black text-green-100">
                {formatMoney(totalCalculado)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {success}
        </div>
      ) : null}

      <div className="sticky bottom-4 z-10 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <>
              <RefreshCcw className="size-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="size-4" />
              Guardar factura importada
            </>
          )}
        </button>
      </div>
    </form>
  );
}