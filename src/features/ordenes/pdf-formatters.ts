export function formatMoney(value: number | string | null | undefined) {
  return Number(value || 0).toFixed(2);
}

export function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Guayaquil",
  }).format(new Date(value));
}