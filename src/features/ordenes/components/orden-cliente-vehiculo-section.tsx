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
    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
            Cliente seleccionado
          </p>
          <p className="text-sm font-medium text-gray-900">
            {clienteSeleccionado
              ? `${clienteSeleccionado.nombres} ${clienteSeleccionado.apellidos}`
              : "-"}
          </p>
          <p className="text-sm text-gray-600">
            {clienteSeleccionado?.telefono ?? "-"}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
            Vehículo seleccionado
          </p>
          <p className="text-sm font-medium text-gray-900">
            {vehiculoSeleccionado
              ? `${vehiculoSeleccionado.placa} · ${vehiculoSeleccionado.marca} ${vehiculoSeleccionado.modelo}`
              : "Selecciona un vehículo"}
          </p>
          <p className="text-sm text-gray-600">
            Año: {vehiculoSeleccionado?.anio ?? "-"} · Km:{" "}
            {vehiculoSeleccionado?.kilometraje_actual ?? "-"}
          </p>
        </div>
      </div>
    </div>
  );
}