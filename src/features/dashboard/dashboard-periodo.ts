export type DashboardPeriodo = "hoy" | "7d" | "15d" | "30d" | "mes";

export function normalizeDashboardPeriodo(
  value?: string | null
): DashboardPeriodo {
  if (value === "hoy") return "hoy";
  if (value === "15d") return "15d";
  if (value === "30d") return "30d";
  if (value === "mes") return "mes";
  return "7d";
}

export function getDashboardPeriodoLabel(periodo: DashboardPeriodo): string {
  switch (periodo) {
    case "hoy":
      return "Hoy";
    case "7d":
      return "Últimos 7 días";
    case "15d":
      return "Últimos 15 días";
    case "30d":
      return "Últimos 30 días";
    case "mes":
      return "Mes actual";
    default:
      return "Últimos 7 días";
  }
}

export function getDashboardRange(periodo: DashboardPeriodo) {
  const now = new Date();

  const start = new Date(now);
  const end = new Date(now);

  end.setHours(23, 59, 59, 999);

  if (periodo === "hoy") {
    start.setHours(0, 0, 0, 0);
  }

  if (periodo === "7d") {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  }

  if (periodo === "15d") {
    start.setDate(now.getDate() - 14);
    start.setHours(0, 0, 0, 0);
  }

  if (periodo === "30d") {
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  }

  if (periodo === "mes") {
    start.setFullYear(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

export function getMonthRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}