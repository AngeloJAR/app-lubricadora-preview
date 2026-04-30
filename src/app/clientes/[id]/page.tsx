import { UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ClienteDetalleView } from "@/features/clientes/cliente-detalle-view";
import {
  getClienteFidelizacionResumen,
  getClientePuntosMovimientos,
} from "@/features/clientes/fidelizacion-actions";
import { getClienteDetalle } from "@/features/busqueda/busqueda-actions";
import { getHistorialByCliente } from "@/features/ordenes/actions";
import { HistorialClienteView } from "@/features/ordenes/historial-cliente-view";

type ClienteDetallePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClienteDetallePage({
  params,
}: ClienteDetallePageProps) {
  const { id } = await params;

  const [cliente, historial, resumenFidelizacion, movimientosPuntos] =
    await Promise.all([
      getClienteDetalle(id),
      getHistorialByCliente(id),
      getClienteFidelizacionResumen(id),
      getClientePuntosMovimientos(id),
    ]);

  return (
    <AppShell title="Detalle del cliente">
      <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
            <UserRound className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-950">
              Información completa del cliente
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Consulta la información del cliente, sus vehículos, historial y fidelización.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5">
        <ClienteDetalleView
          cliente={cliente}
          resumenFidelizacion={resumenFidelizacion}
          movimientosPuntos={movimientosPuntos}
        />

        <HistorialClienteView ordenes={historial} />
      </div>
    </AppShell>
  );
}