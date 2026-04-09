import { Card } from "@/components/ui/card";
import { DashboardFinanzasChart } from "./dashboard-finanzas-chart";
import { DashboardPeriodoFilter } from "./dashboard-periodo-filter";
import {
  getDashboardPeriodoLabel,
  type DashboardPeriodo,
} from "./dashboard-periodo";

import type {
  DashboardMetricas,
  DashboardProductoRentable,
  DashboardSerieFinanciera,
  DashboardServicioTop,
} from "@/types";

type DashboardFinanzasViewProps = {
  periodo: DashboardPeriodo;
  metricas: DashboardMetricas;
  serieFinanciera: DashboardSerieFinanciera[];
  productosRentables: DashboardProductoRentable[];
  serviciosTop: DashboardServicioTop[];
};

function formatCurrency(value: number | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

function MetricCard({
  title,
  value,
  description,
  valueClassName = "text-gray-900",
}: {
  title: string;
  value: string;
  description: string;
  valueClassName?: string;
}) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`mt-3 text-3xl font-bold ${valueClassName}`}>{value}</p>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </section>
  );
}

export function DashboardFinanzasView({
  periodo,
  metricas,
  serieFinanciera,
  productosRentables,
  serviciosTop,
}: DashboardFinanzasViewProps) {
  const periodoLabel = getDashboardPeriodoLabel(periodo);
  const utilidadPeriodo = Number(metricas?.utilidad_hoy ?? 0);
  const utilidadMes = Number(metricas?.utilidad_mes ?? 0);
  const margenPeriodo = Number(metricas?.margen_hoy ?? 0);
  const margenMes = Number(metricas?.margen_mes ?? 0);

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Finanzas
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-900">
              Resumen financiero
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Ventas, costos, gastos, utilidad y rentabilidad del taller.
            </p>
          </div>

          <div className="w-full xl:w-[320px]">
            <DashboardPeriodoFilter periodo={periodo} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title={`Ventas · ${periodoLabel}`}
          value={formatCurrency(metricas?.ventas_hoy)}
          description="Total vendido en el período seleccionado."
        />

        <MetricCard
          title={`Costos · ${periodoLabel}`}
          value={formatCurrency(metricas?.costos_hoy)}
          description="Costo de productos vendidos en el período."
        />

        <MetricCard
          title={`Utilidad · ${periodoLabel}`}
          value={formatCurrency(metricas?.utilidad_hoy)}
          description="Ventas - costos - gastos del período."
          valueClassName={
            utilidadPeriodo < 0 ? "text-red-600" : "text-green-700"
          }
        />

        <MetricCard
          title={`Margen · ${periodoLabel}`}
          value={formatPercent(metricas?.margen_hoy)}
          description="Porcentaje real de ganancia sobre las ventas."
          valueClassName={
            margenPeriodo < 0
              ? "text-red-600"
              : margenPeriodo < 20
                ? "text-yellow-600"
                : "text-green-700"
          }
        />

        <MetricCard
          title="Órdenes cerradas"
          value={String(metricas?.ordenes_cerradas_periodo ?? 0)}
          description={`Órdenes completadas o entregadas en ${periodoLabel.toLowerCase()}.`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          title="Ventas del mes"
          value={formatCurrency(metricas?.ventas_mes)}
          description="Total vendido este mes."
        />

        <MetricCard
          title="Costos del mes"
          value={formatCurrency(metricas?.costos_mes)}
          description="Costo acumulado del mes."
        />

        <MetricCard
          title="Gastos del mes"
          value={formatCurrency(metricas?.gastos_mes)}
          description="Egresos acumulados del mes."
        />

        <MetricCard
          title="Utilidad del mes"
          value={formatCurrency(metricas?.utilidad_mes)}
          description="Resultado acumulado del mes."
          valueClassName={utilidadMes < 0 ? "text-red-600" : "text-green-700"}
        />

        <MetricCard
          title="Ticket promedio"
          value={formatCurrency(metricas?.ticket_promedio)}
          description="Promedio vendido por cada orden cerrada."
        />

        <MetricCard
          title="Punto de equilibrio"
          value={formatCurrency(metricas?.punto_equilibrio)}
          description="Venta mínima para cubrir gastos del mes."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Órdenes abiertas"
          value={String(metricas?.ordenes_abiertas ?? 0)}
          description="Pendientes y en proceso."
        />

        <MetricCard
          title="Margen del mes"
          value={formatPercent(metricas?.margen_mes)}
          description="Porcentaje acumulado de ganancia del mes."
          valueClassName={
            margenMes < 0
              ? "text-red-600"
              : margenMes < 20
                ? "text-yellow-600"
                : "text-green-700"
          }
        />
      </div>

      <Card title={`Tendencia financiera · ${periodoLabel}`}>
        {serieFinanciera.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
            No hay datos suficientes para mostrar el gráfico.
          </div>
        ) : (
          <div className="min-w-0">
            <DashboardFinanzasChart data={serieFinanciera} />
          </div>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Servicios con más ingresos">
          {serviciosTop.length === 0 ? (
            <p className="text-gray-600">Todavía no hay datos suficientes.</p>
          ) : (
            <div className="grid gap-3">
              {serviciosTop.map((servicio) => (
                <div
                  key={servicio.nombre_item}
                  className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 wrap-break-word">
                      {servicio.nombre_item}
                    </p>
                    <p className="text-sm text-gray-500">
                      Veces vendido: {servicio.total_servicios}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-sm text-gray-500">Total generado</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(servicio.total_ingresos)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Productos más rentables">
          {productosRentables.length === 0 ? (
            <p className="text-gray-600">
              Todavía no hay ventas de productos suficientes.
            </p>
          ) : (
            <div className="grid gap-3">
              {productosRentables.map((producto) => (
                <div
                  key={producto.producto_id}
                  className="rounded-2xl border border-gray-200 p-4"
                >
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {producto.nombre}
                      </p>
                      <p className="text-sm text-gray-500">
                        Unidades vendidas: {producto.cantidad_vendida}
                      </p>
                    </div>

                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <p className="text-gray-700">
                        Ingresos:{" "}
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(producto.total_ingresos)}
                        </span>
                      </p>

                      <p className="text-gray-700">
                        Costos:{" "}
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(producto.total_costos)}
                        </span>
                      </p>

                      <p className="text-gray-700">
                        Ganancia:{" "}
                        <span
                          className={`font-semibold ${
                            Number(producto.total_ganancia) < 0
                              ? "text-red-600"
                              : "text-green-700"
                          }`}
                        >
                          {formatCurrency(producto.total_ganancia)}
                        </span>
                      </p>

                      <p className="text-gray-700">
                        Margen:{" "}
                        <span
                          className={`font-semibold ${
                            producto.margen_promedio < 20
                              ? "text-red-600"
                              : producto.margen_promedio < 40
                                ? "text-yellow-600"
                                : "text-green-700"
                          }`}
                        >
                          {producto.margen_promedio.toFixed(1)}%
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}