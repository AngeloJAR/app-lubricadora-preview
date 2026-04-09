import { AppShell } from "@/components/layout/app-shell";
import { OportunidadesFidelizacionView } from "@/features/fidelizacion/oportunidades-view";

export default function FidelizacionPage() {
  return (
    <AppShell title="Fidelización">
      <div className="grid gap-6">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Fidelización</h1>
            <p className="text-sm text-gray-500">
              Revisa clientes con promociones disponibles, puntos acumulados y
              oportunidades de reactivación para aumentar la frecuencia de visita.
            </p>
          </div>
        </section>

        <OportunidadesFidelizacionView />
      </div>
    </AppShell>
  );
}