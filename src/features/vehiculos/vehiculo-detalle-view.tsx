import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { VehiculoDetalle } from "@/types";

type VehiculoDetalleViewProps = {
  vehiculo: VehiculoDetalle;
};

export function VehiculoDetalleView({ vehiculo }: VehiculoDetalleViewProps) {
  return (
    <div className="grid gap-4">
      <Card title="Información del vehículo">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Placa</p>
            <p className="font-medium">{vehiculo.placa}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Marca / Modelo</p>
            <p className="font-medium">
              {vehiculo.marca} {vehiculo.modelo}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Año</p>
            <p className="font-medium">{vehiculo.anio ?? "-"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Color</p>
            <p className="font-medium">{vehiculo.color ?? "-"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Combustible</p>
            <p className="font-medium">{vehiculo.combustible ?? "-"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Transmisión</p>
            <p className="font-medium">{vehiculo.transmision ?? "-"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Kilometraje actual</p>
            <p className="font-medium">{vehiculo.kilometraje_actual ?? "-"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">VIN / Chasis</p>
            <p className="font-medium">{vehiculo.vin_chasis ?? "-"}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-gray-500">Notas</p>
          <p className="font-medium">{vehiculo.notas || "-"}</p>
        </div>
      </Card>

      <Card title="Propietario">
        {vehiculo.clientes ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Cliente</p>
              <p className="font-medium">
                {vehiculo.clientes.nombres} {vehiculo.clientes.apellidos}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Teléfono</p>
              <p className="font-medium">{vehiculo.clientes.telefono}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">WhatsApp</p>
              <p className="font-medium">{vehiculo.clientes.whatsapp || "-"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Correo</p>
              <p className="font-medium">{vehiculo.clientes.email || "-"}</p>
            </div>

            <div className="md:col-span-2">
              <Link
                href={`/clientes/${vehiculo.clientes.id}`}
                className="inline-flex rounded-xl bg-yellow-500 border border-yellow-300 text-white px-4 py-2 text-sm text-white transition hover:opacity-90"
              >
                Ver cliente
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">No hay propietario relacionado.</p>
        )}
      </Card>
    </div>
  );
}