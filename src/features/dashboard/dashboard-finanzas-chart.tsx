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
    month: "2-digit",
  });
}

function formatMoneda(value: number) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

export const DashboardFinanzasChart = memo(function DashboardFinanzasChart({
  data,
}: DashboardFinanzasChartProps) {
  // 🔥 memo para evitar recalcular en cada render
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      fechaLabel: formatFecha(item.fecha),
    }));
  }, [data]);

  return (
    <div className="w-full min-w-0">
      <div className="h-85 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={280}>
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="fechaLabel"
              tick={{ fontSize: 12 }}
              minTickGap={24}
            />

            <YAxis
              width={84}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatMoneda(Number(value))}
            />

            <Tooltip
              formatter={(value) => formatMoneda(Number(value ?? 0))}
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload;
                return item?.fechaLabel ? `Fecha: ${item.fechaLabel}` : "";
              }}
            />

            <Legend />

            <Line
              type="monotone"
              dataKey="ventas"
              name="Ventas"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />

            <Line
              type="monotone"
              dataKey="costos"
              name="Costos"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />

            <Line
              type="monotone"
              dataKey="gastos"
              name="Gastos"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />

            <Line
              type="monotone"
              dataKey="utilidad"
              name="Utilidad"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});