"use client";

import { Fragment } from "react";
import { Package, Plus, Search, Trash2, Wrench } from "lucide-react";
import type { OrdenFormData, Producto, Servicio } from "@/types";

type Item = OrdenFormData["items"][number];
type ItemTipo = "servicio" | "producto";

type ItemSearchState = {
  servicio: string;
  producto: string;
};

type Props = {
  items: Item[];
  servicios: Servicio[];
  productos: Producto[];
  itemSearches: ItemSearchState[];
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, field: string, value: string) => void;
  onUpdateItemSearch: (index: number, tipo: ItemTipo, value: string) => void;
  onSelectServicioForItem: (index: number, servicioId: string) => void;
  onSelectProductoForItem: (index: number, productoId: string) => void;
  onAddProductoDesdeSugerencia: (producto: Producto) => void;
};

function formatCurrency(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return `$${Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00"}`;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getProductoKeywordsByServicio(servicioNombre: string) {
  const nombre = normalizeText(servicioNombre);

  if (nombre.includes("cambio de aceite")) {
    return ["aceite", "filtro", "filtro aceite", "arandela", "empaque"];
  }

  if (nombre.includes("lavado")) {
    return ["shampoo", "silicona", "desengrasante", "ambiental", "cera"];
  }

  if (nombre.includes("alineacion")) {
    return [];
  }

  if (nombre.includes("balanceo")) {
    return ["plomo", "peso", "valvula"];
  }

  if (nombre.includes("frenos")) {
    return ["pastilla", "zapatas", "liquido de frenos", "disco"];
  }

  if (nombre.includes("radiador") || nombre.includes("coolant")) {
    return ["refrigerante", "coolant", "anticongelante"];
  }

  return [];
}

function getProductosSugeridosPorServicio(
  servicioNombre: string,
  productos: Producto[]
) {
  const keywords = getProductoKeywordsByServicio(servicioNombre);

  if (keywords.length === 0) {
    return [];
  }

  return productos
    .filter((producto) => {
      const texto = normalizeText(`${producto.nombre} ${producto.marca ?? ""}`);

      return keywords.some((keyword) => texto.includes(normalizeText(keyword)));
    })
    .slice(0, 6);
}

function getTipoClasses(tipo: ItemTipo) {
  if (tipo === "servicio") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function OrdenItemsSection({
  items,
  servicios,
  productos,
  itemSearches,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onUpdateItemSearch,
  onSelectServicioForItem,
  onSelectProductoForItem,
  onAddProductoDesdeSugerencia,
}: Props) {
  return (
    <div className="grid gap-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Items de la orden</h3>
          <p className="text-sm text-gray-500">
            Agrega servicios, productos y sugerencias relacionadas.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddItem}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
        >
          <Plus className="h-4 w-4" />
          Agregar item
        </button>
      </div>

      <div className="hidden overflow-x-auto rounded-3xl border border-gray-200 xl:block">
        <table className="min-w-[1500px] border-collapse bg-white">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-bold uppercase tracking-wide text-gray-500">
              <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3">#</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Buscar</th>
              <th className="px-3 py-3">Seleccionar</th>
              <th className="px-3 py-3">Nombre</th>
              <th className="px-3 py-3">Cant.</th>
              <th className="px-3 py-3">P. Unit.</th>
              <th className="px-3 py-3">Total</th>
              <th className="sticky right-0 z-20 bg-gray-50 px-4 py-3">
                Acción
              </th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => {
              const servicioSearch = itemSearches[index]?.servicio ?? "";
              const productoSearch = itemSearches[index]?.producto ?? "";

              const serviciosFiltrados =
                item.tipo_item === "servicio"
                  ? servicios.filter((servicio) => {
                    const query = normalizeText(servicioSearch);
                    if (!query) return true;

                    const searchable = normalizeText(
                      `${servicio.nombre} ${servicio.descripcion ?? ""} ${servicio.categoria ?? ""
                      }`
                    );

                    return searchable.includes(query);
                  })
                  : [];

              const productosFiltrados =
                item.tipo_item === "producto"
                  ? productos.filter((producto) => {
                    const query = normalizeText(productoSearch);
                    if (!query) return true;

                    const searchable = normalizeText(
                      `${producto.nombre} ${producto.marca ?? ""}`
                    );

                    return searchable.includes(query);
                  })
                  : [];

              const productosSugeridos =
                item.tipo_item === "servicio" && item.nombre_item.trim()
                  ? getProductosSugeridosPorServicio(item.nombre_item, productos)
                  : [];

              return (
                <Fragment key={`item-group-${index}`}>
                  <tr
                    className="border-t border-gray-100 align-top transition hover:bg-gray-50/60"
                  >
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 font-bold text-gray-700">
                      {index + 1}
                    </td>

                    <td className="px-3 py-3">
                      <select
                        value={item.tipo_item}
                        onChange={(e) =>
                          onUpdateItem(index, "tipo_item", e.target.value)
                        }
                        className={`w-[140px] rounded-2xl border px-3 py-2 text-sm font-semibold outline-none ${getTipoClasses(
                          item.tipo_item
                        )}`}
                      >
                        <option value="servicio">Servicio</option>
                        <option value="producto">Producto</option>
                      </select>
                    </td>

                    <td className="px-3 py-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={
                            item.tipo_item === "servicio"
                              ? servicioSearch
                              : productoSearch
                          }
                          onChange={(e) =>
                            onUpdateItemSearch(
                              index,
                              item.tipo_item,
                              e.target.value
                            )
                          }
                          className="w-[240px] rounded-2xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-gray-400 focus:bg-white"
                          placeholder={
                            item.tipo_item === "servicio"
                              ? "Buscar servicio..."
                              : "Buscar producto..."
                          }
                        />
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      {item.tipo_item === "servicio" ? (
                        <select
                          value={item.servicio_id}
                          onChange={(e) =>
                            onSelectServicioForItem(index, e.target.value)
                          }
                          className="w-[300px] rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-gray-400"
                        >
                          <option value="">
                            {serviciosFiltrados.length
                              ? "Selecciona un servicio"
                              : "No hay resultados"}
                          </option>

                          {serviciosFiltrados.map((servicio) => (
                            <option key={servicio.id} value={servicio.id}>
                              {servicio.nombre}
                              {typeof servicio.precio_base !== "undefined"
                                ? ` · ${formatCurrency(servicio.precio_base)}`
                                : ""}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="grid gap-1">
                          <select
                            value={item.producto_id}
                            onChange={(e) =>
                              onSelectProductoForItem(index, e.target.value)
                            }
                            className="w-[340px] rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-gray-400"
                          >
                            <option value="">
                              {productosFiltrados.length
                                ? "Selecciona un producto"
                                : "No hay resultados"}
                            </option>

                            {productosFiltrados.map((producto) => (
                              <option key={producto.id} value={producto.id}>
                                {producto.nombre} · Stock: {producto.stock} ·{" "}
                                {formatCurrency(producto.precio_venta)}
                              </option>
                            ))}
                          </select>

                          {item.producto_id ? (
                            <p className="text-xs font-medium text-gray-500">
                              Stock:{" "}
                              {productos.find((p) => p.id === item.producto_id)
                                ?.stock ?? 0}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <input
                        value={item.nombre_item}
                        readOnly
                        className="w-[240px] rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700"
                        placeholder="Auto"
                      />
                    </td>

                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={item.cantidad}
                        onChange={(e) =>
                          onUpdateItem(index, "cantidad", e.target.value)
                        }
                        className="w-[90px] rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-gray-400"
                      />
                    </td>

                    <td className="px-3 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={item.precio_unitario}
                        onChange={(e) =>
                          onUpdateItem(index, "precio_unitario", e.target.value)
                        }
                        className="w-[130px] rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-gray-400"
                      />
                    </td>

                    <td className="px-3 py-3">
                      <input
                        value={item.total}
                        readOnly
                        className="w-[130px] rounded-2xl border border-gray-900 bg-gray-900 px-3 py-2 text-sm font-bold text-white"
                      />
                    </td>

                    <td className="sticky right-0 z-10 bg-white px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(index)}
                        disabled={items.length === 1}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    </td>
                  </tr>

                  {productosSugeridos.length > 0 ? (
                    <tr
                      key={`sugerencias-${index}`}
                      className="border-t border-amber-100 bg-amber-50/70"
                    >
                      <td className="sticky left-0 z-10 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                        +
                      </td>

                      <td colSpan={8} className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-amber-800">
                            Productos sugeridos para {item.nombre_item}
                          </span>

                          {productosSugeridos.map((producto) => (
                            <button
                              key={`${item.servicio_id}-${producto.id}`}
                              type="button"
                              onClick={() =>
                                onAddProductoDesdeSugerencia(producto)
                              }
                              className="rounded-2xl border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100"
                            >
                              {producto.nombre} · Stock: {producto.stock} ·{" "}
                              {formatCurrency(producto.precio_venta)}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 xl:hidden">
        {items.map((item, index) => {
          const servicioSearch = itemSearches[index]?.servicio ?? "";
          const productoSearch = itemSearches[index]?.producto ?? "";
          const isServicio = item.tipo_item === "servicio";

          const serviciosFiltrados = isServicio
            ? servicios.filter((servicio) => {
              const query = normalizeText(servicioSearch);
              if (!query) return true;

              const searchable = normalizeText(
                `${servicio.nombre} ${servicio.descripcion ?? ""} ${servicio.categoria ?? ""
                }`
              );

              return searchable.includes(query);
            })
            : [];

          const productosFiltrados = !isServicio
            ? productos.filter((producto) => {
              const query = normalizeText(productoSearch);
              if (!query) return true;

              const searchable = normalizeText(
                `${producto.nombre} ${producto.marca ?? ""}`
              );

              return searchable.includes(query);
            })
            : [];

          const productosSugeridos =
            isServicio && item.nombre_item.trim()
              ? getProductosSugeridosPorServicio(item.nombre_item, productos)
              : [];

          return (
            <div
              key={index}
              className="grid gap-4 rounded-3xl border border-gray-200 bg-gray-50 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-3 text-gray-600 shadow-sm">
                    {isServicio ? (
                      <Wrench className="h-5 w-5" />
                    ) : (
                      <Package className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900">
                      Item #{index + 1}
                    </h4>
                    <p className="text-xs font-medium text-gray-500">
                      {isServicio ? "Servicio" : "Producto"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveItem(index)}
                  disabled={items.length === 1}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Tipo
                  </label>
                  <select
                    value={item.tipo_item}
                    onChange={(e) =>
                      onUpdateItem(index, "tipo_item", e.target.value)
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-gray-400"
                  >
                    <option value="servicio">Servicio</option>
                    <option value="producto">Producto</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    {isServicio ? "Buscar servicio" : "Buscar producto"}
                  </label>

                  <input
                    type="text"
                    value={isServicio ? servicioSearch : productoSearch}
                    onChange={(e) =>
                      onUpdateItemSearch(index, item.tipo_item, e.target.value)
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                    placeholder={
                      isServicio ? "Buscar servicio..." : "Buscar producto..."
                    }
                  />
                </div>
              </div>

              {isServicio ? (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Servicio
                  </label>
                  <select
                    value={item.servicio_id}
                    onChange={(e) =>
                      onSelectServicioForItem(index, e.target.value)
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  >
                    <option value="">
                      {serviciosFiltrados.length
                        ? "Selecciona un servicio"
                        : "No hay resultados"}
                    </option>

                    {serviciosFiltrados.map((servicio) => (
                      <option key={servicio.id} value={servicio.id}>
                        {servicio.nombre}
                        {typeof servicio.precio_base !== "undefined"
                          ? ` · ${formatCurrency(servicio.precio_base)}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid gap-1">
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Producto
                  </label>
                  <select
                    value={item.producto_id}
                    onChange={(e) =>
                      onSelectProductoForItem(index, e.target.value)
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  >
                    <option value="">
                      {productosFiltrados.length
                        ? "Selecciona un producto"
                        : "No hay resultados"}
                    </option>

                    {productosFiltrados.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre} · Stock: {producto.stock} ·{" "}
                        {formatCurrency(producto.precio_venta)}
                      </option>
                    ))}
                  </select>

                  {item.producto_id ? (
                    <p className="text-xs font-semibold text-gray-500">
                      Stock:{" "}
                      {productos.find((p) => p.id === item.producto_id)
                        ?.stock ?? 0}
                    </p>
                  ) : null}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Nombre
                </label>
                <input
                  value={item.nombre_item}
                  readOnly
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700"
                  placeholder="Se completa automáticamente"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    value={item.cantidad}
                    onChange={(e) =>
                      onUpdateItem(index, "cantidad", e.target.value)
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Precio unitario
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.precio_unitario}
                    onChange={(e) =>
                      onUpdateItem(index, "precio_unitario", e.target.value)
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Total
                  </label>
                  <input
                    value={item.total}
                    readOnly
                    className="w-full rounded-2xl border border-gray-900 bg-gray-900 px-3 py-2.5 text-sm font-bold text-white"
                  />
                </div>
              </div>

              {productosSugeridos.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-800">
                    Productos sugeridos para {item.nombre_item}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {productosSugeridos.map((producto) => (
                      <button
                        key={`${item.servicio_id}-${producto.id}`}
                        type="button"
                        onClick={() => onAddProductoDesdeSugerencia(producto)}
                        className="rounded-2xl border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold text-amber-900"
                      >
                        {producto.nombre} · Stock: {producto.stock}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}