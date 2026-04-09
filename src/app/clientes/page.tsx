import { AppShell } from "@/components/layout/app-shell";
import { ClientesView } from "@/features/clientes/clientes-view";

export default function ClientesPage() {
  return (
    <AppShell title="Clientes">
      <div className="mb-4">
        <p className="text-gray-600">
          Gestiona los clientes registrados en el sistema.
        </p>
      </div>

      <ClientesView />
    </AppShell>
  );
}