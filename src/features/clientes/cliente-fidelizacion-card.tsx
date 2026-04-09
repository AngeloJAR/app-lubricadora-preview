import { Card } from "@/components/ui/card";
import type { ClienteFidelizacionResumen } from "@/types";

type ClienteFidelizacionCardProps = {
  resumen: ClienteFidelizacionResumen;
};

export function ClienteFidelizacionCard({
  resumen,
}: ClienteFidelizacionCardProps) {
  return (
    <Card title="Fidelización del cliente">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Puntos disponibles</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {resumen.puntosDisponibles}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Puntos ganados</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {resumen.puntosGanados}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Puntos canjeados</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {resumen.puntosCanjeados}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Visitas</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {resumen.totalVisitas}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Promociones activas</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {resumen.promocionesDisponibles}
          </p>
        </div>
      </div>
    </Card>
  );
}