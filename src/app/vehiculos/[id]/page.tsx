import { AppShell } from "@/components/layout/app-shell";
import {
  getHistorialVehiculo,
  getVehiculoDetalle,
} from "@/features/vehiculos/actions";
import { VehiculoDetalleView } from "@/features/vehiculos/vehiculo-detalle-view";
import { VehiculoHistorialView } from "@/features/vehiculos/vehiculo-historial-view";

type VehiculoDetallePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function VehiculoDetallePage({
  params,
}: VehiculoDetallePageProps) {
  const { id } = await params;

  const [vehiculo, historial] = await Promise.all([
    getVehiculoDetalle(id),
    getHistorialVehiculo(id),
  ]);

  return (
    <AppShell title="Detalle del vehículo">
      <div className="mb-4">
        <p className="text-gray-600">
          Consulta el vehículo, su propietario y el historial completo de servicios.
        </p>
      </div>

      <div className="grid gap-4">
        <VehiculoDetalleView vehiculo={vehiculo} />
        <VehiculoHistorialView historial={historial} />
      </div>
    </AppShell>
  );
}