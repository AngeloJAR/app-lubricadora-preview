import { Card } from "@/components/ui/card";
import { ConfiguracionForm } from "./configuracion-form";

export function ConfiguracionView() {
  return (
    <div className="grid gap-4">
      <Card title="Configuración del taller">
        <ConfiguracionForm />
      </Card>
    </div>
  );
}