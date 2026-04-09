import Link from "next/link";
import { Card } from "@/components/ui/card";
import type {
  ClienteCampaniaReactivacion,
  DashboardClienteInactivo,
  DashboardClienteReciente,
} from "@/types";

type DashboardClientesViewProps = {
  clientesRecientes: DashboardClienteReciente[];
  clientesInactivos: DashboardClienteInactivo[];
  clientesCampaniaReactivacion: ClienteCampaniaReactivacion[];
};

export function DashboardClientesView({
  clientesRecientes,
  clientesInactivos,
  clientesCampaniaReactivacion,
}: DashboardClientesViewProps) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Clientes recientes">
          {clientesRecientes.length === 0 ? (
            <p className="text-gray-600">No hay clientes recientes.</p>
          ) : (
            <div className="grid gap-3">
              {clientesRecientes.map((cliente) => (
                <div
                  key={cliente.id}
                  className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 break-words">
                      {cliente.nombres} {cliente.apellidos}
                    </p>
                    <p className="text-sm text-gray-500">
                      {cliente.telefono}
                    </p>
                    <p className="text-sm text-gray-500">
                      Registro: {new Date(cliente.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <Link
                    href={`/clientes/${cliente.id}`}
                    className="inline-flex rounded-xl border border-yellow-300 bg-yellow-500 px-3 py-2 text-sm text-white transition hover:opacity-90"
                  >
                    Ver cliente
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Clientes inactivos (últimos 30 días)">
          {clientesInactivos.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay clientes inactivos 🎉
            </p>
          ) : (
            <div className="grid gap-2">
              {clientesInactivos.map((cliente) => (
                <div
                  key={cliente.id}
                  className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm"
                >
                  <span>
                    {cliente.nombres} {cliente.apellidos}
                  </span>

                  <a
                    href={`/ordenes/nueva?cliente_id=${cliente.id}`}
                    className="text-red-600 text-xs underline"
                  >
                    Crear orden
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Campaña de reactivación por WhatsApp">
        {clientesCampaniaReactivacion.length === 0 ? (
          <p className="text-gray-600">
            No hay clientes para campaña de reactivación.
          </p>
        ) : (
          <div className="grid gap-3">
            {clientesCampaniaReactivacion.map((cliente) => {
              const telefonoLimpio = (cliente.whatsapp || cliente.telefono || "")
                .replace(/\D/g, "");
              const whatsappUrl = `https://wa.me/593${
                telefonoLimpio.startsWith("0")
                  ? telefonoLimpio.slice(1)
                  : telefonoLimpio
              }?text=${encodeURIComponent(cliente.mensajeWhatsapp)}`;

              return (
                <div
                  key={cliente.id}
                  className="rounded-2xl border border-green-200 bg-green-50 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">
                        {cliente.nombres} {cliente.apellidos}
                      </p>
                      <p className="text-sm text-gray-600">
                        {cliente.diasInactivo} días sin volver
                      </p>
                      <p className="mt-2 text-sm text-gray-700">
                        {cliente.mensajeWhatsapp}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="inline-flex rounded-xl border border-gray-300 px-3 py-2 text-sm transition hover:bg-white"
                      >
                        Ver cliente
                      </Link>

                      {cliente.puedeEnviarWhatsapp ? (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-xl border border-green-300 bg-green-600 px-3 py-2 text-sm text-white transition hover:opacity-90"
                        >
                          Enviar WhatsApp
                        </a>
                      ) : (
                        <span className="inline-flex rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-500">
                          Sin WhatsApp o sin permiso
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}