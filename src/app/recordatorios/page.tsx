import { AppShell } from "@/components/layout/app-shell";
import { RecordatoriosView } from "@/features/recordatorios/recordatorios-view";

export default function RecordatoriosPage() {
  return (
    <AppShell title="Recordatorios">
      <div className="mb-4">
        <p className="text-gray-600">
          Gestiona mantenimientos pendientes y seguimientos a clientes.
        </p>
      </div>

      <RecordatoriosView />
    </AppShell>
  );
}