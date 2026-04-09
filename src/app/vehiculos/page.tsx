import { AppShell } from "@/components/layout/app-shell";
import { VehiculosView } from "@/features/vehiculos/vehiculos-view";

export default function VehiculosPage() {
  return (
    <AppShell title="Vehículos">
      <div className="mb-4">
        <p className="text-gray-600">
          Consulta y administra los vehículos registrados del taller.
        </p>
      </div>

      <VehiculosView />
    </AppShell>
  );
}