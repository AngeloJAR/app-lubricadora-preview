type SugerenciaFidelizacion = {
  tipo: "promo" | "descuento" | "upsell";
  mensaje: string;
  puntosRequeridos?: number;
};

export function generarSugerenciasFidelizacion(
  puntos: number
): SugerenciaFidelizacion[] {
  const sugerencias: SugerenciaFidelizacion[] = [];

  const pts = Math.floor(puntos);

  if (pts >= 60) {
    sugerencias.push({
      tipo: "promo",
      mensaje: "Cliente puede canjear descuento en cambio de aceite",
      puntosRequeridos: 60,
    });
  } else if (pts >= 40) {
    sugerencias.push({
      tipo: "promo",
      mensaje: "Cliente puede canjear lavado express",
      puntosRequeridos: 40,
    });
  } else if (pts >= 20) {
    sugerencias.push({
      tipo: "descuento",
      mensaje: "Cliente puede canjear descuento de $2",
      puntosRequeridos: 20,
    });
  }

  if (pts >= 10 && pts < 20) {
    sugerencias.push({
      tipo: "upsell",
      mensaje: "Está cerca de un beneficio, incentiva otra compra",
      puntosRequeridos: 20,
    });
  }

  if (pts >= 30 && pts < 40) {
    sugerencias.push({
      tipo: "upsell",
      mensaje: "Le faltan pocos puntos para lavado express",
      puntosRequeridos: 40,
    });
  }

  if (pts >= 50 && pts < 60) {
    sugerencias.push({
      tipo: "upsell",
      mensaje: "Está muy cerca del mejor beneficio (aceite)",
      puntosRequeridos: 60,
    });
  }

  return sugerencias;
}