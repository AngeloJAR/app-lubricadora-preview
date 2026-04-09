import { Card } from "@/components/ui/card";
import type { ClientePuntosMovimiento } from "@/types";

type ClientePuntosMovimientosCardProps = {
  movimientos: ClientePuntosMovimiento[];
};

function formatFecha(value: string) {
  return new Date(value).toLocaleString("es-EC");
}

function formatTipo(tipo: ClientePuntosMovimiento["tipo"]) {
  if (tipo === "acumulacion") return "Acumulación";
  if (tipo === "canje") return "Canje";
  return "Ajuste";
}

export function ClientePuntosMovimientosCard({
  movimientos,
}: ClientePuntosMovimientosCardProps) {
  return (
    <Card title="Historial de puntos">
      {movimientos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
          Este cliente todavía no tiene movimientos de puntos.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm text-gray-600">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Puntos</th>
                <th className="px-4 py-3">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((movimiento) => (
                <tr
                  key={movimiento.id}
                  className="border-t border-gray-200 text-sm"
                >
                  <td className="px-4 py-3 text-gray-700">
                    {formatFecha(movimiento.created_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatTipo(movimiento.tipo)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {movimiento.tipo === "canje"
                      ? `- ${Math.abs(Number(movimiento.puntos))}`
                      : Number(movimiento.puntos)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {movimiento.motivo || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}