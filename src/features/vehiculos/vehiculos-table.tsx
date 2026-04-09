"use client";

import Link from "next/link";
import type { VehiculoConCliente } from "@/types";

type VehiculosTableProps = {
  vehiculos: VehiculoConCliente[];
};

function formatKm(km?: number | null) {
  if (!km) return "-";
  return `${km.toLocaleString()} km`;
}

function clienteNombre(vehiculo: VehiculoConCliente) {
  if (!vehiculo.clientes) return "-";
  return `${vehiculo.clientes.nombres} ${vehiculo.clientes.apellidos}`;
}

export function VehiculosTable({ vehiculos }: VehiculosTableProps) {
  if (vehiculos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
        No hay vehículos registrados todavía.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {vehiculos.map((vehiculo) => (
        <article
          key={vehiculo.id}
          className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 grid flex-1 gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-gray-900 break-words">
                      {vehiculo.placa}
                    </h3>

                    <span className="inline-flex rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                      Año: {vehiculo.anio ?? "-"}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-gray-500 break-words">
                    {vehiculo.marca} {vehiculo.modelo}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Marca / modelo
                    </p>
                    <p className="mt-2 text-sm font-medium text-gray-900 break-words">
                      {vehiculo.marca} {vehiculo.modelo}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Kilometraje
                    </p>
                    <p className="mt-2 text-lg font-semibold text-gray-900">
                      {formatKm(vehiculo.kilometraje_actual)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Cliente
                    </p>
                    <p className="mt-2 text-sm font-medium text-gray-900 break-words">
                      {clienteNombre(vehiculo)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Teléfono
                    </p>
                    {vehiculo.clientes?.telefono ? (
                      <a
                        href={`tel:${vehiculo.clientes.telefono}`}
                        className="mt-2 inline-block text-sm font-medium text-gray-900 transition hover:text-yellow-700"
                      >
                        {vehiculo.clientes.telefono}
                      </a>
                    ) : (
                      <p className="mt-2 text-sm font-medium text-gray-400">-</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-2 xl:w-40">
                <Link
                  href={`/vehiculos/${vehiculo.id}`}
                  className="inline-flex items-center justify-center rounded-xl border border-yellow-300 bg-yellow-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-95"
                >
                  Ver detalle
                </Link>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}