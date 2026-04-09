"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
  if (match) {
    return Number(match[1]);
  }

  return 1;
}

function formatMoney(value?: number | string | null) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function calcularCostoUnitarioBase(
  subtotal: number,
  cantidadBase: number
) {
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
        item.ruc &&
        proveedorRuc &&
        item.ruc.trim() === proveedorRuc.trim()
    );

    if (proveedorMatch?.id && proveedorMatch.id !== proveedorId) {
      setProveedorId(proveedorMatch.id);
    }
  }, [proveedorRuc, proveedores, proveedorId]);


  const totalCalculado = useMemo(() => {
    return items.reduce((acc, item) => acc + Number(item.total || 0), 0);
  }, [items]);

  const subtotalCalculado = useMemo(() => {
    return items.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
  }, [items]);

  const ivaCalculado = useMemo(() => {
    return items.reduce((acc, item) => acc + Number(item.iva || 0), 0);
  }, [items]);

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
          err instanceof Error
            ? err.message
            : "No se pudo guardar la factura."
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Datos de la factura importada
          </h3>
          <p className="text-sm text-gray-500">
            Revisa proveedor, número, fecha e items antes de guardar.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Proveedor detectado</label>
            <input
              value={proveedorNombre}
              onChange={(e) => setProveedorNombre(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">RUC</label>
            <input
              value={proveedorRuc}
              onChange={(e) => setProveedorRuc(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Número factura</label>
            <input
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
              required
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-gray-900">Items detectados</h3>
          <p className="text-sm text-gray-500">
            Ajusta cantidades, unidad, factor y vínculo con tu producto.
          </p>
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
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Item #{index + 1}
                  </p>
                  <p className="text-xs text-gray-500">
                    Cantidad base: {cantidadBaseCalculada.toFixed(2)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-12">
                <div className="grid gap-2 lg:col-span-5">
                  <label className="text-sm font-medium">Descripción factura</label>
                  <input
                    value={item.descripcion_original}
                    onChange={(e) =>
                      updateItem(index, "descripcion_original", e.target.value)
                    }
                    className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                    required
                  />
                </div>

                <div className="grid gap-2 lg:col-span-4">
                  <label className="text-sm font-medium">Producto sistema</label>
                  <select
                    value={item.producto_id ?? ""}
                    onChange={(e) =>
                      updateItem(index, "producto_id", e.target.value || null)
                    }
                    className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
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
                  <label className="text-sm font-medium">Cant.</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.cantidad}
                    onChange={(e) =>
                      updateItem(index, "cantidad", Number(e.target.value))
                    }
                    className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                    required
                  />
                </div>

                <div className="grid gap-2 lg:col-span-2">
                  <label className="text-sm font-medium">Costo</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.costo_unitario}
                    onChange={(e) =>
                      updateItem(index, "costo_unitario", Number(e.target.value))
                    }
                    className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                    required
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Unidad</label>
                  <select
                    value={item.unidad_compra ?? "unidad"}
                    onChange={(e) =>
                      updateItem(index, "unidad_compra", e.target.value)
                    }
                    className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                  >
                    <option value="unidad">Unidad</option>
                    <option value="caja">Caja</option>
                    <option value="galon">Galón</option>
                    <option value="cuarto">Cuarto</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Factor</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.factor_conversion ?? 1}
                    onChange={(e) =>
                      updateItem(index, "factor_conversion", Number(e.target.value))
                    }
                    className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Categoría nuevo producto</label>
                  <select
                    value={categoriasPorItem[index] ?? "Otros"}
                    onChange={(e) =>
                      setCategoriasPorItem((prev) =>
                        prev.map((value, itemIndex) =>
                          itemIndex === index ? e.target.value : value
                        )
                      )
                    }
                    className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                  >
                    {PRODUCTO_CATEGORIAS.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Marca nuevo producto</label>
                  <input
                    value={marcasPorItem[index] ?? ""}
                    onChange={(e) =>
                      setMarcasPorItem((prev) =>
                        prev.map((value, itemIndex) =>
                          itemIndex === index ? e.target.value : value
                        )
                      )
                    }
                    className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">Subtotal</p>
                  <p className="mt-1 text-base font-semibold text-gray-900">
                    {formatMoney(item.subtotal)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">Cantidad base</p>
                  <p className="mt-1 text-base font-semibold text-gray-900">
                    {cantidadBaseCalculada.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3">
                  <p className="text-xs text-purple-600">Costo por unidad base</p>
                  <p className="mt-1 text-base font-semibold text-purple-800">
                    {formatMoney(costoUnitarioBase)}
                  </p>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">IVA</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.iva}
                    onChange={(e) =>
                      updateItem(index, "iva", Number(e.target.value))
                    }
                    className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                  />
                </div>

                <div className="rounded-xl border border-gray-200 bg-blue-50 px-4 py-3">
                  <p className="text-xs text-blue-600">Total</p>
                  <p className="mt-1 text-base font-semibold text-blue-800">
                    {formatMoney(item.total)}
                  </p>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <button
                    type="button"
                    onClick={() => createProductoFromItem(index)}
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
                  >
                    Crear producto
                  </button>

                  <button
                    type="button"
                    onClick={() => replaceMiProducto(index)}
                    disabled={!item.producto_id}
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Reemplazar
                  </button>
                </div>
              </div>
            </div>
          );
        })}

      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <label className="mb-2 block text-sm font-medium">Observaciones</label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className="min-h-28 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Notas sobre esta importación..."
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Resumen</h3>

          <div className="grid gap-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">Subtotal</p>
              <p className="mt-1 font-semibold text-gray-900">
                {formatMoney(subtotalCalculado)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">IVA</p>
              <p className="mt-1 font-semibold text-gray-900">
                {formatMoney(ivaCalculado)}
              </p>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-xs text-green-700">Total factura</p>
              <p className="mt-1 text-xl font-bold text-green-800">
                {formatMoney(totalCalculado)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar factura importada"}
        </button>
      </div>
    </form>
  );
}