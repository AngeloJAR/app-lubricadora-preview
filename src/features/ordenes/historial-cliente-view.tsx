import type { HistorialOrden } from "@/types";
import { getEstadoClasses, getEstadoLabel } from "@/utils/orden-status";

type HistorialClienteViewProps = {
  ordenes: HistorialOrden[];
};

export function HistorialClienteView({ ordenes }: HistorialClienteViewProps) {
  if (ordenes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
        Este cliente todavía no tiene historial de servicios.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {ordenes.map((orden) => (
        <div key={orden.id} className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold">{orden.numero}</p>
              <div className="mt-1">
                <span
                  className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${getEstadoClasses(orden.estado)}`}
                >
                  {getEstadoLabel(orden.estado)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {orden.vehiculos
                  ? `${orden.vehiculos.placa} · ${orden.vehiculos.marca} ${orden.vehiculos.modelo}`
                  : "Vehículo no disponible"}
              </p>
              <p className="text-sm text-gray-600">
                Fecha: {new Date(orden.fecha).toLocaleDateString()}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-bold">${Number(orden.total).toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-gray-700">Servicios</p>
            <ul className="grid gap-2">
              {orden.orden_items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                >
                  {item.nombre_item} · Cantidad: {item.cantidad} · $
                  {Number(item.total).toFixed(2)}
                </li>
              ))}
            </ul>
          </div>

          {orden.notas ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700">Notas</p>
              <p className="text-sm text-gray-600">{orden.notas}</p>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}