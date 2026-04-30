import Link from "next/link";
import { ArrowRight, MessageCircle, Plus, UserRound } from "lucide-react";
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
            <p className="text-sm text-slate-500">No hay clientes recientes.</p>
          ) : (
            <div className="grid gap-3">
              {clientesRecientes.map((cliente) => (
                <div
                  key={cliente.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                      <UserRound className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900">
                        {cliente.nombres} {cliente.apellidos}
                      </p>
                      <p className="text-sm text-slate-500">
                        {cliente.telefono || "Sin teléfono"}
                      </p>
                      <p className="text-xs text-slate-400">
                        Registro:{" "}
                        {new Date(cliente.created_at).toLocaleDateString(
                          "es-EC",
                        )}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/clientes/${cliente.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver cliente
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Clientes inactivos (últimos 30 días)">
          {clientesInactivos.length === 0 ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-medium text-green-700">
                No hay clientes inactivos 🎉
              </p>
              <p className="mt-1 text-sm text-green-600">
                Buena señal: tus clientes están regresando.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {clientesInactivos.map((cliente) => (
                <div
                  key={cliente.id}
                  className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {cliente.nombres} {cliente.apellidos}
                    </p>
                    <p className="text-sm text-red-600">
                      Cliente sin actividad reciente
                    </p>
                  </div>

                  <Link
                    href={`/ordenes/nueva?cliente_id=${cliente.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" />
                    Crear orden
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Campaña de reactivación por WhatsApp">
        {clientesCampaniaReactivacion.length === 0 ? (
          <p className="text-sm text-slate-500">
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
                  className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                          <MessageCircle className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {cliente.nombres} {cliente.apellidos}
                          </p>
                          <p className="text-sm text-green-700">
                            {cliente.diasInactivo} días sin volver
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 rounded-2xl bg-white p-3 text-sm leading-6 text-slate-600">
                        {cliente.mensajeWhatsapp}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Ver cliente
                      </Link>

                      {cliente.puedeEnviarWhatsapp ? (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Enviar WhatsApp
                        </a>
                      ) : (
                        <span className="inline-flex justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                          Sin WhatsApp o permiso
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