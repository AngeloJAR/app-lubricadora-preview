import {
  Gift,
  Repeat,
  Sparkles,
  Star,
  TicketPercent,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ClienteFidelizacionResumen } from "@/types";

type ClienteFidelizacionCardProps = {
  resumen: ClienteFidelizacionResumen;
};

function StatItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | null | undefined;
  icon: typeof Sparkles;
}) {
  return (
    <div className="min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
        {value ?? 0}
      </p>
    </div>
  );
}

export function ClienteFidelizacionCard({
  resumen,
}: ClienteFidelizacionCardProps) {
  return (
    <Card
      title="Fidelización del cliente"
      description="Resumen de puntos, visitas y beneficios."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatItem
          label="Disponibles"
          value={resumen.puntosDisponibles}
          icon={Sparkles}
        />

        <StatItem
          label="Ganados"
          value={resumen.puntosGanados}
          icon={Star}
        />

        <StatItem
          label="Canjeados"
          value={resumen.puntosCanjeados}
          icon={Gift}
        />

        <StatItem
          label="Visitas"
          value={resumen.totalVisitas}
          icon={Repeat}
        />

        <StatItem
          label="Promociones"
          value={resumen.promocionesDisponibles}
          icon={TicketPercent}
        />
      </div>
    </Card>
  );
}