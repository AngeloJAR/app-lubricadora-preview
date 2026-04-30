"use client";

import { Card } from "@/components/ui/card";
import { DashboardFinanzasChart } from "./dashboard-finanzas-chart";
import { DashboardPeriodoFilter } from "./dashboard-periodo-filter";
import {
  getDashboardPeriodoLabel,
  type DashboardPeriodo,
} from "./dashboard-periodo";

import {
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

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
  variant = "neutral",
}: {
  title: string;
  value: string;
  description: string;
  variant?: "neutral" | "success" | "warning" | "danger";
}) {
  const styles = {
    neutral: "text-slate-900",
    success: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
  };

  const Icon =
    variant === "success"
      ? TrendingUp
      : variant === "danger"
        ? TrendingDown
        : ArrowUpRight;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </p>

        <Icon className={`h-4 w-4 ${styles[variant]}`} />
      </div>

      <p className={`mt-3 text-2xl font-bold ${styles[variant]}`}>
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">{description}</p>
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
  const margenPeriodo = Number(metricas?.margen_hoy ?? 0);
  const utilidadMes = Number(metricas?.utilidad_mes ?? 0);
  const margenMes = Number(metricas?.margen_mes ?? 0);

  return (
    <div className="grid gap-6">
      {/* HEADER */}
      <Card
        title="Resumen financiero"
        description="Control total de ingresos, costos y rentabilidad"
        right={<DashboardPeriodoFilter periodo={periodo} />}
      >
        <div className="hidden" />
      </Card>

      {/* KPIs PRINCIPALES */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title={`Ventas · ${periodoLabel}`}
          value={formatCurrency(metricas?.ventas_hoy)}
          description="Total vendido"
          variant="success"
        />

        <MetricCard
          title={`Costos · ${periodoLabel}`}
          value={formatCurrency(metricas?.costos_hoy)}
          description="Costo de productos"
          variant="warning"
        />

        <MetricCard
          title={`Utilidad · ${periodoLabel}`}
          value={formatCurrency(metricas?.utilidad_hoy)}
          description="Ganancia real"
          variant={utilidadPeriodo < 0 ? "danger" : "success"}
        />

        <MetricCard
          title={`Margen · ${periodoLabel}`}
          value={formatPercent(metricas?.margen_hoy)}
          description="Rentabilidad"
          variant={
            margenPeriodo < 0
              ? "danger"
              : margenPeriodo < 20
                ? "warning"
                : "success"
          }
        />

        <MetricCard
          title="Órdenes cerradas"
          value={String(metricas?.ordenes_cerradas_periodo ?? 0)}
          description="En el período"
        />
      </div>

      {/* KPIs MES */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          title="Ventas mes"
          value={formatCurrency(metricas?.ventas_mes)}
          description="Total mensual"
          variant="success"
        />

        <MetricCard
          title="Costos mes"
          value={formatCurrency(metricas?.costos_mes)}
          description="Costo mensual"
          variant="warning"
        />

        <MetricCard
          title="Gastos mes"
          value={formatCurrency(metricas?.gastos_mes)}
          description="Egresos"
          variant="danger"
        />

        <MetricCard
          title="Utilidad mes"
          value={formatCurrency(metricas?.utilidad_mes)}
          description="Resultado"
          variant={utilidadMes < 0 ? "danger" : "success"}
        />

        <MetricCard
          title="Ticket promedio"
          value={formatCurrency(metricas?.ticket_promedio)}
          description="Por orden"
        />

        <MetricCard
          title="Punto equilibrio"
          value={formatCurrency(metricas?.punto_equilibrio)}
          description="Mínimo necesario"
        />
      </div>

      {/* ESTADO GENERAL */}
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Órdenes abiertas"
          value={String(metricas?.ordenes_abiertas ?? 0)}
          description="Pendientes"
        />

        <MetricCard
          title="Margen del mes"
          value={formatPercent(metricas?.margen_mes)}
          description="Rentabilidad mensual"
          variant={
            margenMes < 0
              ? "danger"
              : margenMes < 20
                ? "warning"
                : "success"
          }
        />
      </div>

      {/* GRÁFICO */}
      <Card title={`Tendencia financiera · ${periodoLabel}`}>
        {serieFinanciera.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            No hay datos suficientes.
          </div>
        ) : (
          <DashboardFinanzasChart data={serieFinanciera} />
        )}
      </Card>

      {/* TOPS */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Servicios con más ingresos">
          {serviciosTop.length === 0 ? (
            <p className="text-slate-500">Sin datos aún.</p>
          ) : (
            <div className="grid gap-3">
              {serviciosTop.map((s) => (
                <div
                  key={s.nombre_item}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {s.nombre_item}
                    </p>
                    <p className="text-sm text-slate-500">
                      {s.total_servicios} ventas
                    </p>
                  </div>

                  <p className="font-semibold text-green-600">
                    {formatCurrency(s.total_ingresos)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Productos más rentables">
          {productosRentables.length === 0 ? (
            <p className="text-slate-500">Sin datos aún.</p>
          ) : (
            <div className="grid gap-3">
              {productosRentables.map((p) => (
                <div
                  key={p.producto_id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <p className="font-semibold text-slate-900">
                    {p.nombre}
                  </p>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <span>Ventas: {p.cantidad_vendida}</span>
                    <span
                      className={`font-semibold ${Number(p.total_ganancia) < 0
                          ? "text-red-600"
                          : "text-green-600"
                        }`}
                    >
                      {formatCurrency(p.total_ganancia)}
                    </span>
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