import type { Cliente, Vehiculo } from "@/types";
import { User, CarFront } from "lucide-react";

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
      {/* CLIENTE */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-gray-500" />
          <label className="text-sm font-semibold text-gray-700">
            Cliente
          </label>
        </div>

        <select
          value={clienteId}
          onChange={(e) => onClienteChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 outline-none transition focus:border-gray-400 focus:bg-white"
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

      {/* VEHICULO */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <CarFront className="h-4 w-4 text-gray-500" />
          <label className="text-sm font-semibold text-gray-700">
            Vehículo
          </label>
        </div>

        <select
          value={vehiculoId}
          onChange={(e) => onVehiculoChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 outline-none transition focus:border-gray-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!clienteId || loadingData}
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