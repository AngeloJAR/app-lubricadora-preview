import type { Cliente, Vehiculo } from "@/types";

type Props = {
  clienteId: string;
  vehiculoId: string;
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  loadingData?: boolean;
  onClienteChange: (clienteId: string) => void;
  onVehiculoChange: (vehiculoId: string) => void;
};

export function OrdenEditClienteVehiculoSection({
  clienteId,
  vehiculoId,
  clientes,
  vehiculos,
  loadingData = false,
  onClienteChange,
  onVehiculoChange,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium">Cliente</label>
        <select
          value={clienteId}
          onChange={(e) => onClienteChange(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          disabled={loadingData}
        >
          <option value="">Selecciona un cliente</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nombres} {cliente.apellidos} - {cliente.telefono}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Vehículo</label>
        <select
          value={vehiculoId}
          onChange={(e) => onVehiculoChange(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          disabled={!clienteId}
        >
          <option value="">Selecciona un vehículo</option>
          {vehiculos.map((vehiculo) => (
            <option key={vehiculo.id} value={vehiculo.id}>
              {vehiculo.placa} - {vehiculo.marca} {vehiculo.modelo}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}