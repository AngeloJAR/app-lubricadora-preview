import { Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ClientesView } from "@/features/clientes/clientes-view";

export default function ClientesPage() {
  return (
    <AppShell title="Clientes">
      <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
            <Users className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-950">
              Gestión de clientes
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Administra los clientes registrados, su información y relación con vehículos y órdenes.
            </p>
          </div>
        </div>
      </div>

      <ClientesView />
    </AppShell>
  );
}