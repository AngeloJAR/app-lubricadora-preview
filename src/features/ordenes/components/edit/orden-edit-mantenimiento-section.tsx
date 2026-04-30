import { CalendarDays, Gauge, Wrench } from "lucide-react";

type Props = {
  kilometraje: string;
  proximoMantenimientoFecha: string;
  proximoMantenimientoKm: string;
  onKilometrajeChange: (value: string) => void;
  onProximoMantenimientoFechaChange: (value: string) => void;
  onProximoMantenimientoKmChange: (value: string) => void;
};

export function OrdenEditMantenimientoSection({
  kilometraje,
  proximoMantenimientoFecha,
  proximoMantenimientoKm,
  onKilometrajeChange,
  onProximoMantenimientoFechaChange,
  onProximoMantenimientoKmChange,
}: Props) {
  return (
    <div className="grid gap-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Wrench className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700">
          Mantenimiento
        </h3>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* KILOMETRAJE */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-gray-400" />
            <label className="text-xs font-semibold text-gray-500">
              Kilometraje
            </label>
          </div>

          <input
            type="number"
            value={kilometraje}
            onChange={(e) => onKilometrajeChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none transition focus:border-gray-400"
          />
        </div>

        {/* FECHA */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <label className="text-xs font-semibold text-gray-500">
              Próxima fecha
            </label>
          </div>

          <input
            type="date"
            value={proximoMantenimientoFecha}
            onChange={(e) =>
              onProximoMantenimientoFechaChange(e.target.value)
            }
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none transition focus:border-gray-400"
          />
        </div>

        {/* KM FUTURO */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-gray-400" />
            <label className="text-xs font-semibold text-gray-500">
              Próximo km
            </label>
          </div>

          <input
            type="number"
            value={proximoMantenimientoKm}
            onChange={(e) =>
              onProximoMantenimientoKmChange(e.target.value)
            }
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none transition focus:border-gray-400"
          />
        </div>
      </div>
    </div>
  );
}