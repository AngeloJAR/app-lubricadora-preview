import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { OrdenDetalle } from "@/types";

type Props = {
  orden: OrdenDetalle;
  showLinks?: boolean;
};

export function OrdenClienteVehiculoCards({
  orden,
  showLinks = false,
}: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Cliente">
        {orden.clientes ? (
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-medium text-gray-900">Nombre:</span>{" "}
              {orden.clientes.nombres} {orden.clientes.apellidos}
            </p>
            <p>
              <span className="font-medium text-gray-900">Teléfono:</span>{" "}
              {orden.clientes.telefono}
            </p>
            <p>
              <span className="font-medium text-gray-900">WhatsApp:</span>{" "}
              {orden.clientes.whatsapp || "-"}
            </p>
            <p>
              <span className="font-medium text-gray-900">Correo:</span>{" "}
              {orden.clientes.email || "-"}
            </p>

            {showLinks ? (
              <div className="pt-2">
                <Link
                  href={`/clientes/${orden.clientes.id}`}
                  className="text-sm font-medium text-black underline"
                >
                  Ver cliente
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No hay cliente relacionado.</p>
        )}
      </Card>

      <Card title="Vehículo">
        {orden.vehiculos ? (
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-medium text-gray-900">Placa:</span>{" "}
              {orden.vehiculos.placa}
            </p>
            <p>
              <span className="font-medium text-gray-900">Marca / Modelo:</span>{" "}
              {orden.vehiculos.marca} {orden.vehiculos.modelo}
            </p>
            <p>
              <span className="font-medium text-gray-900">Año:</span>{" "}
              {orden.vehiculos.anio ?? "-"}
            </p>
            <p>
              <span className="font-medium text-gray-900">Color:</span>{" "}
              {orden.vehiculos.color ?? "-"}
            </p>
            <p>
              <span className="font-medium text-gray-900">Transmisión:</span>{" "}
              {orden.vehiculos.transmision ?? "-"}
            </p>
            <p>
              <span className="font-medium text-gray-900">Combustible:</span>{" "}
              {orden.vehiculos.combustible ?? "-"}
            </p>
            <p>
              <span className="font-medium text-gray-900">
                Kilometraje actual vehículo:
              </span>{" "}
              {orden.vehiculos.kilometraje_actual ?? "-"}
            </p>

            {showLinks ? (
              <div className="pt-2">
                <Link
                  href={`/vehiculos/${orden.vehiculos.id}`}
                  className="text-sm font-medium text-black underline"
                >
                  Ver vehículo
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No hay vehículo relacionado.</p>
        )}
      </Card>
    </div>
  );
}