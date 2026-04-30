import type { ReactNode } from "react";
import { CalendarDays, Clock, Gauge, Hash, StickyNote, Wrench } from "lucide-react";
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

function InfoBox({
  icon,
  label,
  value,
  strong = false,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white p-2 text-gray-500 shadow-sm">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {label}
          </p>
          <div
            className={`mt-1 break-words ${
              strong
                ? "text-lg font-bold text-gray-900"
                : "text-sm font-semibold text-gray-900"
            }`}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function TextBlock({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white p-2 text-gray-500 shadow-sm">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {title}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-800">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

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
        <InfoBox
          icon={<Hash className="h-4 w-4" />}
          label="Número de orden"
          value={orden.numero}
          strong
        />

        <InfoBox
          icon={<Wrench className="h-4 w-4" />}
          label="Estado"
          value={
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getEstadoClasses(
                orden.estado
              )}`}
            >
              {getEstadoLabel(orden.estado)}
            </span>
          }
        />

        {showTotal ? (
          <InfoBox
            icon={<Hash className="h-4 w-4" />}
            label="Total"
            value={formatMoney(
              orden.total && orden.total > 0 ? orden.total : totalFinal
            )}
            strong
          />
        ) : null}

        <InfoBox
          icon={<CalendarDays className="h-4 w-4" />}
          label="Fecha"
          value={formatFecha(orden.fecha)}
        />

        <InfoBox
          icon={<Gauge className="h-4 w-4" />}
          label="Kilometraje ingreso"
          value={orden.kilometraje ?? "-"}
        />

        {showKilometrajeFinal ? (
          <InfoBox
            icon={<Gauge className="h-4 w-4" />}
            label="Kilometraje final"
            value={orden.kilometraje_final ?? "-"}
          />
        ) : null}

        <InfoBox
          icon={<Clock className="h-4 w-4" />}
          label="Hora inicio"
          value={formatFechaHora(orden.hora_inicio)}
        />

        <InfoBox
          icon={<Clock className="h-4 w-4" />}
          label="Hora fin"
          value={formatFechaHora(orden.hora_fin)}
        />
      </div>

      {(orden.notas || orden.observaciones_tecnicas) && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {orden.notas ? (
            <TextBlock
              icon={<StickyNote className="h-4 w-4" />}
              title="Notas"
              value={orden.notas}
            />
          ) : null}

          {orden.observaciones_tecnicas ? (
            <TextBlock
              icon={<Wrench className="h-4 w-4" />}
              title="Observaciones técnicas"
              value={orden.observaciones_tecnicas}
            />
          ) : null}
        </div>
      )}
    </Card>
  );
}