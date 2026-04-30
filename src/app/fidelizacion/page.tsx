import { AppShell } from "@/components/layout/app-shell";
import { OportunidadesFidelizacionView } from "@/features/fidelizacion/oportunidades-view";

export default function FidelizacionPage() {
  return (
    <AppShell title="Fidelización">
      <OportunidadesFidelizacionView />
    </AppShell>
  );
}