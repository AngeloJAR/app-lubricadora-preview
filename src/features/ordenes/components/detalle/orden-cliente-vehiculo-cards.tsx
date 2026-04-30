"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { User, CarFront, Phone, Mail } from "lucide-react";
import type { OrdenDetalle } from "@/types";

type Props = {
  orden: OrdenDetalle;
  showLinks?: boolean;
};

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <div className="mt-0.5 text-gray-400">{icon}</div>
      <div className="flex flex-col text-sm">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        <span className="font-semibold text-gray-900">
          {value || "-"}
        </span>
      </div>
    </div>
  );
}

export function OrdenClienteVehiculoCards({
  orden,
  showLinks = false,
}: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* CLIENTE */}
      <Card title="Cliente">
        {orden.clientes ? (
          <div className="space-y-3">
            <InfoRow
              icon={<User className="h-4 w-4" />}
              label="Nombre"
              value={`${orden.clientes.nombres} ${orden.clientes.apellidos}`}
            />

            <InfoRow
              icon={<Phone className="h-4 w-4" />}
              label="Teléfono"
              value={orden.clientes.telefono}
            />

            <InfoRow
              icon={<Phone className="h-4 w-4" />}
              label="WhatsApp"
              value={orden.clientes.whatsapp}
            />

            <InfoRow
              icon={<Mail className="h-4 w-4" />}
              label="Correo"
              value={orden.clientes.email}
            />

            {showLinks && (
              <div className="pt-2">
                <Link
                  href={`/clientes/${orden.clientes.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                >
                  Ver cliente
                </Link>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No hay cliente relacionado.
          </p>
        )}
      </Card>

      {/* VEHICULO */}
      <Card title="Vehículo">
        {orden.vehiculos ? (
          <div className="space-y-3">
            <InfoRow
              icon={<CarFront className="h-4 w-4" />}
              label="Placa"
              value={orden.vehiculos.placa}
            />

            <InfoRow
              icon={<CarFront className="h-4 w-4" />}
              label="Marca / Modelo"
              value={`${orden.vehiculos.marca} ${orden.vehiculos.modelo}`}
            />

            <InfoRow
              icon={<CarFront className="h-4 w-4" />}
              label="Año"
              value={orden.vehiculos.anio}
            />

            <InfoRow
              icon={<CarFront className="h-4 w-4" />}
              label="Color"
              value={orden.vehiculos.color}
            />

            <InfoRow
              icon={<CarFront className="h-4 w-4" />}
              label="Transmisión"
              value={orden.vehiculos.transmision}
            />

            <InfoRow
              icon={<CarFront className="h-4 w-4" />}
              label="Combustible"
              value={orden.vehiculos.combustible}
            />

            <InfoRow
              icon={<CarFront className="h-4 w-4" />}
              label="Kilometraje"
              value={orden.vehiculos.kilometraje_actual}
            />

            {showLinks && (
              <div className="pt-2">
                <Link
                  href={`/vehiculos/${orden.vehiculos.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                >
                  Ver vehículo
                </Link>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No hay vehículo relacionado.
          </p>
        )}
      </Card>
    </div>
  );
}