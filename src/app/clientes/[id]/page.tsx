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
      <div className="mb-4">
        <p className="text-gray-600">
          Consulta la información del cliente, sus vehículos, historial y
          fidelización.
        </p>
      </div>

      <div className="grid gap-4">
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