"use client";

import { memo, useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardSerieFinanciera } from "@/types";

type DashboardFinanzasChartProps = {
  data: DashboardSerieFinanciera[];
};

function formatFecha(fecha: string) {
  const date = new Date(`${fecha}T00:00:00`);

  return date.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
  });
}

function formatMoneda(value: number) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

export const DashboardFinanzasChart = memo(function DashboardFinanzasChart({
  data,
}: DashboardFinanzasChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      fechaLabel: formatFecha(item.fecha),
    }));
  }, [data]);

  return (
    <div className="w-full min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Movimiento financiero
          </p>
          <p className="text-xs text-slate-500">
            Ingresos, costos, egresos y utilidad por día
          </p>
        </div>
      </div>

      <div className="h-85 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={280}>
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

            <XAxis
              dataKey="fechaLabel"
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />

            <YAxis
              width={84}
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatMoneda(Number(value))}
            />

            <Tooltip
              formatter={(value) => formatMoneda(Number(value ?? 0))}
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload;
                return item?.fechaLabel ? `Fecha: ${item.fechaLabel}` : "";
              }}
              contentStyle={{
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
              }}
            />

            <Legend />

            <Line
              type="monotone"
              dataKey="ventas"
              name="Ingresos"
              stroke="#16a34a"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5 }}
            />

            <Line
              type="monotone"
              dataKey="costos"
              name="Costos"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5 }}
            />

            <Line
              type="monotone"
              dataKey="gastos"
              name="Egresos"
              stroke="#ef4444"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5 }}
            />

            <Line
              type="monotone"
              dataKey="utilidad"
              name="Utilidad"
              stroke="#2563eb"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});