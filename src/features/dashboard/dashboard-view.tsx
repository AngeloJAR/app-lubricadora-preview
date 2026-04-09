import { Card } from "@/components/ui/card";
import { DashboardFinanzasChart } from "./dashboard-finanzas-chart";
import { DashboardPeriodoFilter } from "./dashboard-periodo-filter";
import { DashboardAccesosRapidos } from "./dashboard-accesos-rapidos";
import { BackupButton } from "./backup-button";

import {
  getDashboardPeriodoLabel,
  type DashboardPeriodo,
} from "./dashboard-periodo";

import type {
  DashboardAccionSugerida,
  DashboardAlerta,
  DashboardMetricas,
  DashboardSerieFinanciera,
} from "@/types";

type DashboardTecnicoMetricas = {
  ordenesPendientes: number;
  ordenesEnProceso: number;
  ordenesTerminadasHoy: number;
};

type DashboardResumenDinero = {
  saldoCaja: number;
  saldoBanco: number;
  saldoDeuna: number;
  saldoBoveda: number;
  saldoTarjetaPorCobrar: number;
  saldoTotalLiquido: number;
  dineroPrestamoDisponible: number;
  dineroPrestamoIngresado: number;
  dineroPrestamoUsado: number;
  pagoPrestamo: number;
  utilidadRealPeriodo: number;
  utilidadRealMes: number;
};

type DashboardViewProps = {
  rol?: string;
  periodo?: DashboardPeriodo;
  metricas?: DashboardMetricas;
  resumenDinero?: DashboardResumenDinero;
  alertas?: DashboardAlerta[];
  metricasTecnico?: DashboardTecnicoMetricas | null;
  accionesSugeridas?: DashboardAccionSugerida[];
  serieFinanciera?: DashboardSerieFinanciera[];
};

function formatCurrency(value: number | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

function getAlertClasses(tipo: DashboardAlerta["tipo"]) {
  switch (tipo) {
    case "error":
      return "border-red-200 bg-red-50 text-red-700";
    case "warning":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function getActionClasses(tipo: DashboardAccionSugerida["tipo"]) {
  switch (tipo) {
    case "error":
      return "border-red-200 bg-red-50 text-red-700";
    case "warning":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    case "success":
      return "border-green-200 bg-green-50 text-green-700";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function DashboardTecnicoCards({
  metricas,
}: {
  metricas: DashboardTecnicoMetricas;
}) {
  return (
    <div className="grid gap-4">
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Panel técnico
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-900">
              Tu actividad de hoy
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Revisa tus órdenes pendientes, en proceso y las finalizadas hoy.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-3xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-yellow-700">
            Órdenes pendientes
          </p>
          <p className="mt-3 text-3xl font-bold text-yellow-900">
            {metricas.ordenesPendientes}
          </p>
          <p className="mt-2 text-sm text-yellow-700/80">
            Esperando inicio o atención.
          </p>
        </section>

        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-blue-700">
            Órdenes en proceso
          </p>
          <p className="mt-3 text-3xl font-bold text-blue-900">
            {metricas.ordenesEnProceso}
          </p>
          <p className="mt-2 text-sm text-blue-700/80">
            Actualmente trabajándose.
          </p>
        </section>

        <section className="rounded-3xl border border-green-200 bg-green-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-green-700">Terminadas hoy</p>
          <p className="mt-3 text-3xl font-bold text-green-900">
            {metricas.ordenesTerminadasHoy}
          </p>
          <p className="mt-2 text-sm text-green-700/80">
            Órdenes completadas en el día.
          </p>
        </section>
      </div>
    </div>
  );
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

export function DashboardView({
  rol,
  periodo = "7d",
  metricas,
  resumenDinero,
  alertas,
  serieFinanciera,
  metricasTecnico,
  accionesSugeridas,
}: DashboardViewProps) {
  const safeAlertas = alertas ?? [];
  const safeAcciones = accionesSugeridas ?? [];
  const safeSerieFinanciera = serieFinanciera ?? [];
  const periodoLabel = getDashboardPeriodoLabel(periodo);

  if (rol === "tecnico" && metricasTecnico) {
    return <DashboardTecnicoCards metricas={metricasTecnico} />;
  }

  const utilidadPeriodo = Number(metricas?.utilidad_hoy ?? 0);
  const utilidadMes = Number(metricas?.utilidad_mes ?? 0);
  const margenPeriodo = Number(metricas?.margen_hoy ?? 0);

  const saldoCaja = Number(resumenDinero?.saldoCaja ?? 0);
  const saldoBanco = Number(resumenDinero?.saldoBanco ?? 0);
  const saldoDeuna = Number(resumenDinero?.saldoDeuna ?? 0);
  const saldoTarjetaPorCobrar = Number(
    resumenDinero?.saldoTarjetaPorCobrar ?? 0
  );
  const saldoBoveda = Number(resumenDinero?.saldoBoveda ?? 0);
  const saldoTotalLiquido = Number(resumenDinero?.saldoTotalLiquido ?? 0);
  const dineroPrestamoDisponible = Number(
    resumenDinero?.dineroPrestamoDisponible ?? 0
  );
  const dineroPrestamoIngresado = Number(
    resumenDinero?.dineroPrestamoIngresado ?? 0
  );
  const dineroPrestamoUsado = Number(resumenDinero?.dineroPrestamoUsado ?? 0);
  const pagoPrestamo = Number(resumenDinero?.pagoPrestamo ?? 0);
  const utilidadRealPeriodo = Number(resumenDinero?.utilidadRealPeriodo ?? 0);
  const utilidadRealMes = Number(resumenDinero?.utilidadRealMes ?? 0);

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Vista general
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-900">
              Resumen del negocio
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Mira solo lo más importante y entra a cada sección desde los accesos rápidos.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-55">
              <DashboardPeriodoFilter periodo={periodo} />
            </div>

            <BackupButton />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Órdenes abiertas"
          value={String(metricas?.ordenes_abiertas ?? 0)}
          description="Pendientes y en proceso."
        />

        <MetricCard
          title={`Ventas · ${periodoLabel}`}
          value={formatCurrency(metricas?.ventas_hoy)}
          description="Total vendido en el período seleccionado."
        />

        <MetricCard
          title={`Utilidad operativa · ${periodoLabel}`}
          value={formatCurrency(metricas?.utilidad_hoy)}
          description="Ventas - costos - gastos operativos."
          valueClassName={
            utilidadPeriodo < 0 ? "text-red-600" : "text-green-700"
          }
        />

        <MetricCard
          title="Ventas del mes"
          value={formatCurrency(metricas?.ventas_mes)}
          description="Total vendido este mes."
        />

        <MetricCard
          title="Utilidad operativa del mes"
          value={formatCurrency(metricas?.utilidad_mes)}
          description="Resultado operativo acumulado del mes."
          valueClassName={utilidadMes < 0 ? "text-red-600" : "text-green-700"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Caja actual"
          value={formatCurrency(saldoCaja)}
          description="Saldo de movimientos en cuenta caja."
          valueClassName={saldoCaja < 0 ? "text-red-600" : "text-blue-700"}
        />

        <MetricCard
          title="Banco actual"
          value={formatCurrency(saldoBanco)}
          description="Saldo de movimientos en cuenta banco."
          valueClassName={saldoBanco < 0 ? "text-red-600" : "text-indigo-700"}
        />

        <MetricCard
          title="DeUna actual"
          value={formatCurrency(saldoDeuna)}
          description="Saldo de movimientos en cuenta DeUna."
          valueClassName={saldoDeuna < 0 ? "text-red-600" : "text-cyan-700"}
        />

        <MetricCard
          title="Bóveda actual"
          value={formatCurrency(saldoBoveda)}
          description="Efectivo guardado fuera de caja."
          valueClassName={
            saldoBoveda < 0 ? "text-red-600" : "text-purple-700"
          }
        />

        <MetricCard
          title="Total líquido"
          value={formatCurrency(saldoTotalLiquido)}
          description="Caja + banco + DeUna + Bóveda."
          valueClassName={
            saldoTotalLiquido < 0 ? "text-red-600" : "text-emerald-700"
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Préstamo disponible"
          value={formatCurrency(dineroPrestamoDisponible)}
          description="Prestado recibido - usado - pagado."
          valueClassName={
            dineroPrestamoDisponible < 0 ? "text-red-600" : "text-violet-700"
          }
        />

        <MetricCard
          title="Préstamo ingresado"
          value={formatCurrency(dineroPrestamoIngresado)}
          description="Total registrado como préstamo recibido."
        />

        <MetricCard
          title="Préstamo usado"
          value={formatCurrency(dineroPrestamoUsado)}
          description="Dinero del préstamo ya usado en egresos."
        />

        <MetricCard
          title="Pago de préstamo"
          value={formatCurrency(pagoPrestamo)}
          description="Total abonado o pagado al préstamo."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={`Utilidad real · ${periodoLabel}`}
          value={formatCurrency(utilidadRealPeriodo)}
          description="Utilidad sin contar préstamo ni movimientos internos."
          valueClassName={
            utilidadRealPeriodo < 0 ? "text-red-600" : "text-green-700"
          }
        />

        <MetricCard
          title="Utilidad real del mes"
          value={formatCurrency(utilidadRealMes)}
          description="Resultado real acumulado del mes."
          valueClassName={
            utilidadRealMes < 0 ? "text-red-600" : "text-green-700"
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
          title="Tarjeta por cobrar"
          value={formatCurrency(saldoTarjetaPorCobrar)}
          description="Pagos pendientes por acreditar."
          valueClassName={
            saldoTarjetaPorCobrar < 0 ? "text-red-600" : "text-orange-700"
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Gastos del mes"
          value={formatCurrency(metricas?.gastos_mes)}
          description="Egresos operativos acumulados del mes."
        />

        <MetricCard
          title="Ticket promedio"
          value={formatCurrency(metricas?.ticket_promedio)}
          description="Promedio vendido por cada orden cerrada."
        />

        <MetricCard
          title="Punto de equilibrio"
          value={formatCurrency(metricas?.punto_equilibrio)}
          description="Base de gastos fijos del mes."
        />
      </div>

      <Card title={`Tendencia financiera · ${periodoLabel}`}>
        {safeSerieFinanciera.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
            No hay datos suficientes para mostrar el gráfico.
          </div>
        ) : (
          <div className="min-w-0">
            <DashboardFinanzasChart data={safeSerieFinanciera} />
          </div>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Alertas inteligentes">
          {safeAlertas.length === 0 ? (
            <p className="text-gray-600">No hay alertas por ahora.</p>
          ) : (
            <div className="grid gap-3">
              {safeAlertas.slice(0, 4).map((alerta, index) => (
                <div
                  key={`${alerta.tipo}-${index}`}
                  className={`rounded-2xl border px-4 py-3 ${getAlertClasses(
                    alerta.tipo
                  )}`}
                >
                  <p className="font-semibold">{alerta.titulo}</p>
                  <p className="mt-1 text-sm text-gray-700">
                    {alerta.descripcion}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Acciones sugeridas">
          {safeAcciones.length === 0 ? (
            <p className="text-gray-600">
              No hay acciones sugeridas por ahora.
            </p>
          ) : (
            <div className="grid gap-3">
              {safeAcciones.slice(0, 4).map((accion, index) => (
                <div
                  key={`${accion.tipo}-${index}`}
                  className={`rounded-2xl border px-4 py-3 ${getActionClasses(
                    accion.tipo
                  )}`}
                >
                  <p className="font-semibold">{accion.titulo}</p>
                  <p className="mt-1 text-sm text-gray-700">
                    {accion.descripcion}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card
        title="Accesos rápidos"
        description="Entra directo a cada módulo del sistema."
      >
        <DashboardAccesosRapidos />
      </Card>
    </div>
  );
}