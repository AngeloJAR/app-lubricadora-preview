import { AppShell } from "@/components/layout/app-shell";
import { ConfiguracionView } from "@/features/configuracion/configuracion-view";

export default function ConfiguracionPage() {
  return (
    <AppShell title="Configuración">
      <div className="mb-4">
        <p className="text-gray-600">
          Administra los datos generales del taller para comprobantes, mensajes y branding.
        </p>
      </div>

      <ConfiguracionView />
    </AppShell>
  );
}