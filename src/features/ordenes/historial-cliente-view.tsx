import type { HistorialOrden } from "@/types";
import { getEstadoClasses, getEstadoLabel } from "@/utils/orden-status";
import { CarFront, Calendar, Wrench } from "lucide-react";

type HistorialClienteViewProps = {
  ordenes: HistorialOrden[];
};

export function HistorialClienteView({ ordenes }: HistorialClienteViewProps) {
  if (ordenes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
        <p className="text-sm">Este cliente todavía no tiene historial de servicios.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {ordenes.map((orden) => (
        <div
          key={orden.id}
          className="group rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* LEFT */}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-gray-900">
                  {orden.numero}
                </p>

                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getEstadoClasses(
                    orden.estado
                  )}`}
                >
                  {getEstadoLabel(orden.estado)}
                </span>
              </div>

              <div className="mt-2 grid gap-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CarFront className="h-4 w-4 text-gray-400" />
                  <span>
                    {orden.vehiculos
                      ? `${orden.vehiculos.placa} · ${orden.vehiculos.marca} ${orden.vehiculos.modelo}`
                      : "Vehículo no disponible"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>
                    {new Date(orden.fecha).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Total
              </p>
              <p className="text-2xl font-extrabold text-gray-900">
                ${Number(orden.total).toFixed(2)}
              </p>
            </div>
          </div>

          {/* ITEMS */}
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">
                Servicios realizados
              </p>
            </div>

            <div className="grid gap-2">
              {orden.orden_items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                >
                  <span className="text-gray-800">
                    {item.nombre_item}
                  </span>

                  <span className="text-gray-500">
                    x{item.cantidad} · $
                    {Number(item.total).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* NOTAS */}
          {orden.notas && (
            <div className="mt-4 rounded-2xl bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Notas
              </p>
              <p className="mt-1 text-sm text-gray-700">{orden.notas}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}