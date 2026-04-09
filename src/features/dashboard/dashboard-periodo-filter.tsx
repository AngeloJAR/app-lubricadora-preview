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
    <div className="flex flex-wrap gap-2">
      {periodos.map((item) => {
        const active = item === periodo;

        return (
          <Link
            key={item}
            href={`/dashboard?periodo=${item}`}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-yellow-500 border border-yellow-300 text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {getDashboardPeriodoLabel(item)}
          </Link>
        );
      })}
    </div>
  );
}