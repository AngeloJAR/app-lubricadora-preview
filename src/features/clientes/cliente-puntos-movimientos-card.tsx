import {
  ArrowDownCircle,
  ArrowUpCircle,
  Settings2,
    History,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import type { ClientePuntosMovimiento } from "@/types";

type ClientePuntosMovimientosCardProps = {
  movimientos: ClientePuntosMovimiento[];
};

function formatFecha(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTipo(tipo: ClientePuntosMovimiento["tipo"]) {
  if (tipo === "acumulacion") return "Acumulación";
  if (tipo === "canje") return "Canje";
  return "Ajuste";
}

function getTipoConfig(tipo: ClientePuntosMovimiento["tipo"]) {
  if (tipo === "acumulacion") {
    return {
      icon: ArrowUpCircle,
      color: "text-green-600",
      bg: "bg-green-100",
    };
  }

  if (tipo === "canje") {
    return {
      icon: ArrowDownCircle,
      color: "text-red-600",
      bg: "bg-red-100",
    };
  }

  return {
    icon: Settings2,
    color: "text-blue-600",
    bg: "bg-blue-100",
  };
}

export function ClientePuntosMovimientosCard({
  movimientos,
}: ClientePuntosMovimientosCardProps) {
  return (
    <Card
      title="Historial de puntos"
      description="Movimientos de acumulación, canje y ajustes."
    >
      {movimientos.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
            <History className="h-6 w-6" />
          </div>

          <p className="mt-3 text-sm font-medium text-slate-500">
            Este cliente todavía no tiene movimientos de puntos.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {movimientos.map((movimiento) => {
            const config = getTipoConfig(movimiento.tipo);
            const Icon = config.icon;

            const esCanje = movimiento.tipo === "canje";
            const puntos = Number(movimiento.puntos);

            return (
              <article
                key={movimiento.id}
                className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${config.bg} ${config.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatTipo(movimiento.tipo)}
                    </p>

                    <p
                      className={`text-sm font-bold ${esCanje ? "text-red-600" : "text-green-600"
                        }`}
                    >
                      {esCanje
                        ? `- ${Math.abs(puntos)}`
                        : `+ ${puntos}`}
                    </p>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatFecha(movimiento.created_at)}
                  </p>

                  <p className="mt-2 text-sm text-slate-700">
                    {movimiento.motivo || "Sin descripción"}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}