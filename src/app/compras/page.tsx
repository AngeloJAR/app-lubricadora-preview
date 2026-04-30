import { AppShell } from "@/components/layout/app-shell";
import { ComprasView } from "@/features/compras/compras-view";

export default function ComprasPage() {
  return (
    <AppShell title="Compras">
      <ComprasView />
    </AppShell>
  );
}