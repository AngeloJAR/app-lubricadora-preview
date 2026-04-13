import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { getEstadoClasses, getEstadoLabel } from "@/utils/orden-status";
import type { OrdenDetalle } from "@/types";
import {
  formatFecha,
  formatFechaHora,
  formatMoney,
} from "./orden-detalle-formatters";

type Props = {
  orden: OrdenDetalle;
  rightContent?: ReactNode;
  showTotal?: boolean;
  showKilometrajeFinal?: boolean;
};

export function OrdenResumenCard({
  orden,
  rightContent,
  showTotal = false,
  showKilometrajeFinal = false,
}: Props) {
  const totalCalculado =
    orden.orden_items?.reduce(
      (acc, item) =>
        acc + Number(item.cantidad || 0) * Number(item.precio_unitario || 0),
      0
    ) ?? 0;

  const totalFinal =
    totalCalculado -
    Number(orden.descuento || 0) -
    Number(orden.descuento_puntos || 0);

  return (
    <Card right={rightContent}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Número de orden
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {orden.numero}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Estado
          </p>
          <span
            className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getEstadoClasses(
              orden.estado
            )}`}
          >
            {getEstadoLabel(orden.estado)}
          </span>
        </div>

        {showTotal ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Total
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {formatMoney(orden.total && orden.total > 0 ? orden.total : totalFinal)}
            </p>
          </div>
        ) : null}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Fecha
          </p>
          <p className="mt-1 text-sm text-gray-900">{formatFecha(orden.fecha)}</p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Kilometraje ingreso
          </p>
          <p className="mt-1 text-sm text-gray-900">{orden.kilometraje ?? "-"}</p>
        </div>

        {showKilometrajeFinal ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Kilometraje final
            </p>
            <p className="mt-1 text-sm text-gray-900">
              {orden.kilometraje_final ?? "-"}
            </p>
          </div>
        ) : null}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Hora inicio
          </p>
          <p className="mt-1 text-sm text-gray-900">
            {formatFechaHora(orden.hora_inicio)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Hora fin
          </p>
          <p className="mt-1 text-sm text-gray-900">
            {formatFechaHora(orden.hora_fin)}
          </p>
        </div>
      </div>

      {orden.notas ? (
        <div className="mt-5 rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Notas
          </p>
          <p className="mt-1 text-sm text-gray-800">{orden.notas}</p>
        </div>
      ) : null}

      {orden.observaciones_tecnicas ? (
        <div className="mt-4 rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Observaciones técnicas
          </p>
          <p className="mt-1 text-sm text-gray-800">
            {orden.observaciones_tecnicas}
          </p>
        </div>
      ) : null}
    </Card>
  );
}