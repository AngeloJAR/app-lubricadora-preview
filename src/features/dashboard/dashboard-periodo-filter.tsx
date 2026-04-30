"use client";

import Link from "next/link";
import {
  getDashboardPeriodoLabel,
  type DashboardPeriodo,
} from "./dashboard-periodo";

type DashboardPeriodoFilterProps = {
  periodo: DashboardPeriodo;
};

const periodos: DashboardPeriodo[] = ["hoy", "7d", "15d", "30d", "mes"];

export function DashboardPeriodoFilter({
  periodo,
}: DashboardPeriodoFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      {periodos.map((item) => {
        const active = item === periodo;

        return (
          <Link
            key={item}
            href={`/dashboard?periodo=${item}`}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-yellow-500 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {getDashboardPeriodoLabel(item)}
          </Link>
        );
      })}
    </div>
  );
}