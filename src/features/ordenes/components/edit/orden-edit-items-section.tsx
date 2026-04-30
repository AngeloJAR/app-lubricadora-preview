import { Package, Plus, Trash2, Wrench } from "lucide-react";
import type { Producto, Servicio, OrdenFormData } from "@/types";

type Props = {
  items: OrdenFormData["items"];
  servicios: Servicio[];
  productos: Producto[];
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, field: string, value: string) => void;
};

export function OrdenEditItemsSection({
  items,
  servicios,
  productos,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: Props) {
  return (
    <div className="grid gap-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Items de la orden</h3>
          <p className="text-sm text-gray-500">
            Agrega servicios o productos que se realizarán en esta orden.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddItem}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
        >
          <Plus className="h-4 w-4" />
          Agregar item
        </button>
      </div>

      <div className="grid gap-4">
        {items.map((item, index) => {
          const isServicio = item.tipo_item === "servicio";

          return (
            <div
              key={index}
              className="rounded-3xl border border-gray-200 bg-gray-50 p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-3 text-gray-600 shadow-sm">
                    {isServicio ? (
                      <Wrench className="h-5 w-5" />
                    ) : (
                      <Package className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <p className="font-bold text-gray-900">Item #{index + 1}</p>
                    <p className="text-xs font-medium text-gray-500">
                      {isServicio ? "Servicio" : "Producto"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveItem(index)}
                  disabled={items.length === 1}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Tipo
                  </label>
                  <select
                    value={item.tipo_item}
                    onChange={(e) =>
                      onUpdateItem(index, "tipo_item", e.target.value)
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 outline-none transition focus:border-gray-400"
                  >
                    <option value="servicio">Servicio</option>
                    <option value="producto">Producto</option>
                  </select>
                </div>

                {isServicio ? (
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Servicio
                    </label>
                    <select
                      value={item.servicio_id}
                      onChange={(e) =>
                        onUpdateItem(index, "servicio_id", e.target.value)
                      }
                      className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 outline-none transition focus:border-gray-400"
                    >
                      <option value="">Selecciona un servicio</option>
                      {servicios.map((servicio) => (
                        <option key={servicio.id} value={servicio.id}>
                          {servicio.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Producto
                    </label>
                    <select
                      value={item.producto_id}
                      onChange={(e) =>
                        onUpdateItem(index, "producto_id", e.target.value)
                      }
                      className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 outline-none transition focus:border-gray-400"
                    >
                      <option value="">Selecciona un producto</option>
                      {productos.map((producto) => (
                        <option key={producto.id} value={producto.id}>
                          {producto.nombre} · Stock: {producto.stock}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Nombre del item
                </label>
                <input
                  value={item.nombre_item}
                  readOnly
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none"
                  placeholder="Se completa automáticamente"
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
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
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 outline-none transition focus:border-gray-400"
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
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 outline-none transition focus:border-gray-400"
                  />
                </div>

                <div className="xl:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Total
                  </label>
                  <input
                    value={item.total}
                    readOnly
                    className="w-full rounded-2xl border border-gray-200 bg-gray-900 px-3 py-2.5 text-sm font-bold text-white outline-none"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}