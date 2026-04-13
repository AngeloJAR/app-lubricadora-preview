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
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Items de la orden</h3>
        <button
          type="button"
          onClick={onAddItem}
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
        >
          Agregar item
        </button>
      </div>

      {items.map((item, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-2xl border border-gray-200 p-4"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Tipo</label>
              <select
                value={item.tipo_item}
                onChange={(e) => onUpdateItem(index, "tipo_item", e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
              >
                <option value="servicio">Servicio</option>
                <option value="producto">Producto</option>
              </select>
            </div>

            {item.tipo_item === "servicio" ? (
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Servicio</label>
                <select
                  value={item.servicio_id}
                  onChange={(e) =>
                    onUpdateItem(index, "servicio_id", e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
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
                <label className="mb-1 block text-sm font-medium">Producto</label>
                <select
                  value={item.producto_id}
                  onChange={(e) =>
                    onUpdateItem(index, "producto_id", e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
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

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Nombre del item
              </label>
              <input
                value={item.nombre_item}
                readOnly
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                placeholder="Se completa automáticamente"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Cantidad</label>
              <input
                type="number"
                value={item.cantidad}
                onChange={(e) => onUpdateItem(index, "cantidad", e.target.value)}
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
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => onRemoveItem(index)}
                disabled={items.length === 1}
                className="w-full rounded-xl border border-red-300 px-3 py-2 text-sm text-red-600 disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}