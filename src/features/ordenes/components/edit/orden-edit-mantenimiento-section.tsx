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
    <div className="grid gap-4 md:grid-cols-3">
      <div>
        <label className="mb-1 block text-sm font-medium">Kilometraje</label>
        <input
          type="number"
          value={kilometraje}
          onChange={(e) => onKilometrajeChange(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Próxima fecha</label>
        <input
          type="date"
          value={proximoMantenimientoFecha}
          onChange={(e) => onProximoMantenimientoFechaChange(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Próximo km</label>
        <input
          type="number"
          value={proximoMantenimientoKm}
          onChange={(e) => onProximoMantenimientoKmChange(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
        />
      </div>
    </div>
  );
}