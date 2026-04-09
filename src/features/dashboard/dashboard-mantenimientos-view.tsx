import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { DashboardMantenimientoProximo } from "@/types";

type DashboardMantenimientosViewProps = {
  proximosMantenimientos: DashboardMantenimientoProximo[];
};

export function DashboardMantenimientosView({
  proximosMantenimientos,
}: DashboardMantenimientosViewProps) {
  return (
    <Card title="Próximos mantenimientos">
      {proximosMantenimientos.length === 0 ? (
        <p className="text-gray-600">
          No hay próximos mantenimientos registrados.
        </p>
      ) : (
        <div className="grid gap-3">
          {proximosMantenimientos.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-200 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 wrap-break-word">
                    {item.vehiculos
                      ? `${item.vehiculos.placa} · ${item.vehiculos.marca} ${item.vehiculos.modelo}`
                      : "Vehículo"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Cliente:{" "}
                    {item.clientes
                      ? `${item.clientes.nombres} ${item.clientes.apellidos}`
                      : "-"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Fecha sugerida: {item.proximo_mantenimiento_fecha ?? "-"}
                  </p>
                </div>

                {item.vehiculos?.id ? (
                  <Link
                    href={`/vehiculos/${item.vehiculos.id}`}
                    className="inline-flex rounded-xl border border-gray-300 px-3 py-2 text-sm transition hover:bg-gray-50"
                  >
                    Ver vehículo
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}