"use client";

import Link from "next/link";
import { CarFront, ArrowRight, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DashboardMantenimientoProximo } from "@/types";

type DashboardMantenimientosViewProps = {
  proximosMantenimientos: DashboardMantenimientoProximo[];
};

export function DashboardMantenimientosView({
  proximosMantenimientos,
}: DashboardMantenimientosViewProps) {
  return (
    <Card
      title="Próximos mantenimientos"
      description="Clientes que deberían regresar pronto"
    >
      {proximosMantenimientos.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          No hay próximos mantenimientos registrados.
        </div>
      ) : (
        <div className="grid gap-3">
          {proximosMantenimientos.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex min-w-0 gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-600">
                  <CarFront className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 break-words">
                    {item.vehiculos
                      ? `${item.vehiculos.placa} · ${item.vehiculos.marca} ${item.vehiculos.modelo}`
                      : "Vehículo"}
                  </p>

                  <p className="text-sm text-slate-500">
                    Cliente:{" "}
                    {item.clientes
                      ? `${item.clientes.nombres} ${item.clientes.apellidos}`
                      : "-"}
                  </p>

                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="h-4 w-4" />
                    {item.proximo_mantenimiento_fecha ?? "Sin fecha"}
                  </div>
                </div>
              </div>

              {item.vehiculos?.id && (
                <Link
                  href={`/vehiculos/${item.vehiculos.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Ver vehículo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}