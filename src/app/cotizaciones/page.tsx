import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { getCotizaciones } from "@/features/cotizaciones/actions";

import {
  getCotizacionEstadoClasses,
  getCotizacionEstadoLabel,
} from "@/utils/cotizacion-status";

export default async function CotizacionesPage() {
  const cotizaciones = await getCotizaciones();

  return (
    <AppShell title="Cotizaciones">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-600">Gestiona tus cotizaciones del taller.</p>

        <Link
          href="/cotizaciones/nueva"
          className="rounded-xl bg-yellow-500 border border-yellow-300 text-white px-4 py-2 text-sm"
        >
          Nueva cotización
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm text-gray-600">
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Vehículo</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cotizaciones.map((cotizacion) => (
              <tr key={cotizacion.id} className="border-t border-gray-200 text-sm">
                <td className="px-4 py-3 font-medium">{cotizacion.numero}</td>
                <td className="px-4 py-3">
                  {Array.isArray(cotizacion.clientes) && cotizacion.clientes[0]
                    ? `${cotizacion.clientes[0].nombres} ${cotizacion.clientes[0].apellidos}`
                    : "-"}
                </td>
                <td className="px-4 py-3">
                  {Array.isArray(cotizacion.vehiculos) && cotizacion.vehiculos[0]
                    ? `${cotizacion.vehiculos[0].placa} - ${cotizacion.vehiculos[0].marca} ${cotizacion.vehiculos[0].modelo}`
                    : "-"}
                </td>
                <td className="px-4 py-3">
                  {new Date(cotizacion.fecha).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${getCotizacionEstadoClasses(
                      cotizacion.estado
                    )}`}
                  >
                    {getCotizacionEstadoLabel(cotizacion.estado)}
                  </span>
                </td>
                <td className="px-4 py-3">${Number(cotizacion.total).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/cotizaciones/${cotizacion.id}`}
                    className="rounded-lg bg-yellow-500 border border-yellow-300 text-white px-3 py-2 text-xs"
                  >
                    Ver detalle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}