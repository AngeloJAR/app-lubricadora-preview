import type { Producto, Servicio } from "@/types";

export function formatCurrency(value: number | string | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function uniqueServiciosById(items: Servicio[]) {
  const map = new Map<string, Servicio>();

  for (const item of items) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}

export function formatFechaCorta(fecha?: string | null) {
  if (!fecha) return "-";

  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return fecha;

  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

export function getProductoKeywordsByServicio(servicioNombre: string) {
  const nombre = normalizeText(servicioNombre);

  if (nombre.includes("cambio de aceite")) {
    return ["aceite", "filtro", "filtro aceite", "arandela", "empaque"];
  }

  if (nombre.includes("lavado")) {
    return ["shampoo", "silicona", "desengrasante", "ambiental", "cera"];
  }

  if (nombre.includes("alineacion") || nombre.includes("alineación")) {
    return [];
  }

  if (nombre.includes("balanceo")) {
    return ["plomo", "peso", "valvula", "válvula"];
  }

  if (nombre.includes("frenos")) {
    return [
      "pastilla",
      "zapatas",
      "liquido de frenos",
      "líquido de frenos",
      "disco",
    ];
  }

  if (nombre.includes("radiador") || nombre.includes("coolant")) {
    return ["refrigerante", "coolant", "anticongelante"];
  }

  return [];
}

export function getProductosSugeridosPorServicio(
  servicioNombre: string,
  productos: Producto[]
) {
  const keywords = getProductoKeywordsByServicio(servicioNombre);

  if (keywords.length === 0) {
    return [];
  }

  return productos
    .filter((producto) => {
      const texto = normalizeText(
        `${producto.nombre} ${producto.marca ?? ""}`
      );

      return keywords.some((keyword) => texto.includes(normalizeText(keyword)));
    })
    .slice(0, 6);
}