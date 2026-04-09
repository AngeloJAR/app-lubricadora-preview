"use client";

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
  return `$${Number(value ?? 0).toFixed(2)}`;
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

  if (nombre.includes("alineacion") || nombre.includes("alineación")) {
    return [];
  }

  if (nombre.includes("balanceo")) {
    return ["plomo", "peso", "valvula", "válvula"];
  }

  if (nombre.includes("frenos")) {
    return [
      "pastilla",
      "zapatas",
      "liquido de frenos",
      "líquido de frenos",
      "disco",
    ];
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
      const texto = normalizeText(
        `${producto.nombre} ${producto.marca ?? ""}`
      );

      return keywords.some((keyword) => texto.includes(normalizeText(keyword)));
    })
    .slice(0, 6);
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
    <div className="grid gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Items de la orden</h3>
          <p className="text-sm text-gray-500">
            Vista compacta para agregar servicios y productos más rápido.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddItem}
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
        >
          Agregar item
        </button>
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 bg-white xl:block">
        <table className="min-w-375 border-collapse">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="sticky left-0 z-20 bg-gray-50 px-3 py-3 shadow-[8px_0_12px_-10px_rgba(0,0,0,0.15)]">
                #
              </th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Buscar</th>
              <th className="px-3 py-3">Seleccionar</th>
              <th className="px-3 py-3">Nombre</th>
              <th className="px-3 py-3">Cant.</th>
              <th className="px-3 py-3">P. Unit.</th>
              <th className="px-3 py-3">Total</th>
              <th className="sticky right-0 z-20 bg-gray-50 px-3 py-3 shadow-[-8px_0_12px_-10px_rgba(0,0,0,0.25)]">
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
                        `${servicio.nombre} ${servicio.descripcion ?? ""} ${servicio.categoria ?? ""}`
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

              return (
                <tr key={index} className="border-t border-gray-200 align-top">
                  <td className="sticky left-0 z-10 bg-white px-3 py-3 text-sm font-semibold text-gray-700 shadow-[8px_0_12px_-10px_rgba(0,0,0,0.12)]">
                    {index + 1}
                  </td>

                  <td className="px-3 py-3">
                    <select
                      value={item.tipo_item}
                      onChange={(e) =>
                        onUpdateItem(index, "tipo_item", e.target.value)
                      }
                      className="w-30 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                    >
                      <option value="servicio">Servicio</option>
                      <option value="producto">Producto</option>
                    </select>
                  </td>

                  <td className="px-3 py-3">
                    {item.tipo_item === "servicio" ? (
                      <input
                        type="text"
                        value={servicioSearch}
                        onChange={(e) =>
                          onUpdateItemSearch(index, "servicio", e.target.value)
                        }
                        className="w-55 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                        placeholder="Buscar servicio..."
                      />
                    ) : (
                      <input
                        type="text"
                        value={productoSearch}
                        onChange={(e) =>
                          onUpdateItemSearch(index, "producto", e.target.value)
                        }
                        className="w-55 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                        placeholder="Buscar producto..."
                      />
                    )}
                  </td>

                  <td className="px-3 py-3">
                    {item.tipo_item === "servicio" ? (
                      <select
                        value={item.servicio_id}
                        onChange={(e) =>
                          onSelectServicioForItem(index, e.target.value)
                        }
                        className="w-65 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
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
                          className="w-70 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
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
                          <p className="text-xs text-gray-500">
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
                      className="w-55 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
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
                      className="w-22.5 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
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
                      className="w-30 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </td>

                  <td className="px-3 py-3">
                    <input
                      value={item.total}
                      readOnly
                      className="w-30 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium"
                    />
                  </td>

                  <td className="sticky right-0 z-10 bg-white px-3 py-3 shadow-[-8px_0_12px_-10px_rgba(0,0,0,0.18)]">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      disabled={items.length === 1}
                      className="w-full rounded-xl border border-red-300 bg-white px-3 py-2 text-sm text-red-600 disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </td>

                  {item.tipo_item === "servicio" && item.nombre_item.trim() ? (
                    (() => {
                      const productosSugeridos = getProductosSugeridosPorServicio(
                        item.nombre_item,
                        productos
                      );

                      if (productosSugeridos.length === 0) return null;

                      return (
                        <tr className="border-t border-gray-100 bg-amber-50/60">
                          <td className="sticky left-0 z-10 bg-amber-50/60 px-3 py-3 text-sm font-medium text-amber-900 shadow-[8px_0_12px_-10px_rgba(0,0,0,0.08)]">
                            +
                          </td>

                          <td colSpan={8} className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                                Productos sugeridos para {item.nombre_item}
                              </span>

                              {productosSugeridos.map((producto) => (
                                <button
                                  key={`${item.servicio_id}-${producto.id}`}
                                  type="button"
                                  onClick={() =>
                                    onAddProductoDesdeSugerencia(producto)
                                  }
                                  className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-900 transition hover:bg-amber-100"
                                >
                                  {producto.nombre} · Stock: {producto.stock} ·{" "}
                                  {formatCurrency(producto.precio_venta)}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })()
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 xl:hidden">
        {items.map((item, index) => {
          const servicioSearch = itemSearches[index]?.servicio ?? "";
          const productoSearch = itemSearches[index]?.producto ?? "";

          const serviciosFiltrados =
            item.tipo_item === "servicio"
              ? servicios.filter((servicio) => {
                  const query = normalizeText(servicioSearch);
                  if (!query) return true;

                  const searchable = normalizeText(
                    `${servicio.nombre} ${servicio.descripcion ?? ""} ${servicio.categoria ?? ""}`
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

          return (
            <div
              key={index}
              className="grid gap-4 rounded-2xl border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    Item #{index + 1}
                  </h4>
                  <p className="text-xs text-gray-500">Vista móvil</p>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveItem(index)}
                  disabled={items.length === 1}
                  className="rounded-xl border border-red-300 px-3 py-2 text-sm text-red-600 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Tipo</label>
                  <select
                    value={item.tipo_item}
                    onChange={(e) =>
                      onUpdateItem(index, "tipo_item", e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                  >
                    <option value="servicio">Servicio</option>
                    <option value="producto">Producto</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {item.tipo_item === "servicio"
                      ? "Buscar servicio"
                      : "Buscar producto"}
                  </label>

                  <input
                    type="text"
                    value={
                      item.tipo_item === "servicio"
                        ? servicioSearch
                        : productoSearch
                    }
                    onChange={(e) =>
                      onUpdateItemSearch(index, item.tipo_item, e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                    placeholder={
                      item.tipo_item === "servicio"
                        ? "Buscar servicio..."
                        : "Buscar producto..."
                    }
                  />
                </div>
              </div>

              {item.tipo_item === "servicio" ? (
                <div>
                  <label className="mb-1 block text-sm font-medium">Servicio</label>
                  <select
                    value={item.servicio_id}
                    onChange={(e) =>
                      onSelectServicioForItem(index, e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
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
                  <label className="mb-1 block text-sm font-medium">Producto</label>
                  <select
                    value={item.producto_id}
                    onChange={(e) =>
                      onSelectProductoForItem(index, e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
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
                    <p className="text-xs text-gray-500">
                      Stock:{" "}
                      {productos.find((p) => p.id === item.producto_id)?.stock ??
                        0}
                    </p>
                  ) : null}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">Nombre</label>
                <input
                  value={item.nombre_item}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                  placeholder="Se completa automáticamente"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Cantidad</label>
                  <input
                    type="number"
                    value={item.cantidad}
                    onChange={(e) =>
                      onUpdateItem(index, "cantidad", e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Precio unitario
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.precio_unitario}
                    onChange={(e) =>
                      onUpdateItem(index, "precio_unitario", e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Total</label>
                  <input
                    value={item.total}
                    readOnly
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 font-medium"
                  />
                </div>

                {item.tipo_item === "servicio" && item.nombre_item.trim() ? (
                  (() => {
                    const productosSugeridos = getProductosSugeridosPorServicio(
                      item.nombre_item,
                      productos
                    );

                    if (productosSugeridos.length === 0) return null;

                    return (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                          Productos sugeridos para {item.nombre_item}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {productosSugeridos.map((producto) => (
                            <button
                              key={`${item.servicio_id}-${producto.id}`}
                              type="button"
                              onClick={() =>
                                onAddProductoDesdeSugerencia(producto)
                              }
                              className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-900 transition hover:bg-amber-100"
                            >
                              {producto.nombre} · Stock: {producto.stock}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}