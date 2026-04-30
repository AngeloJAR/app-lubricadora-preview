import { CarFront, Phone, User } from "lucide-react";
import type { Cliente, Vehiculo } from "@/types";

type Props = {
  clienteSeleccionado: Cliente | null;
  vehiculoSeleccionado: Vehiculo | null;
};

export function OrdenClienteVehiculoSection({
  clienteSeleccionado,
  vehiculoSeleccionado,
}: Props) {
  if (!clienteSeleccionado && !vehiculoSeleccionado) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-yellow-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-yellow-700" />
            <p className="text-xs font-bold uppercase tracking-wide text-yellow-700">
              Cliente seleccionado
            </p>
          </div>

          <p className="text-sm font-bold text-gray-900">
            {clienteSeleccionado
              ? `${clienteSeleccionado.nombres} ${clienteSeleccionado.apellidos}`
              : "-"}
          </p>

          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-gray-600">
            <Phone className="h-4 w-4 text-gray-400" />
            {clienteSeleccionado?.telefono ?? "-"}
          </div>
        </div>

        <div className="rounded-2xl border border-yellow-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <CarFront className="h-4 w-4 text-yellow-700" />
            <p className="text-xs font-bold uppercase tracking-wide text-yellow-700">
              Vehículo seleccionado
            </p>
          </div>

          <p className="text-sm font-bold text-gray-900">
            {vehiculoSeleccionado
              ? `${vehiculoSeleccionado.placa} · ${vehiculoSeleccionado.marca} ${vehiculoSeleccionado.modelo}`
              : "Selecciona un vehículo"}
          </p>

          <p className="mt-2 text-sm font-medium text-gray-600">
            Año: {vehiculoSeleccionado?.anio ?? "-"} · Km:{" "}
            {vehiculoSeleccionado?.kilometraje_actual ?? "-"}
          </p>
        </div>
      </div>
    </div>
  );
}