export function generarSugerenciasFidelizacion(puntos: number) {
  const sugerencias = [];

  if (puntos >= 50) {
    sugerencias.push({
      tipo: "promo",
      mensaje: "Cliente puede reclamar un servicio GRATIS",
    });
  }

  if (puntos >= 30) {
    sugerencias.push({
      tipo: "descuento",
      mensaje: "Puedes ofrecer un descuento por puntos",
    });
  }

  if (puntos >= 10) {
    sugerencias.push({
      tipo: "upsell",
      mensaje: "Cliente cercano a recompensa, incentiva otra compra",
    });
  }

  return sugerencias;
}