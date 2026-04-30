export function calcularDescuentoPorPuntos(puntos: number) {
  if (!puntos || puntos <= 0) return 0;

  const puntosEnteros = Math.floor(puntos);
  const descuento = puntosEnteros * 0.1;

  return Math.round(descuento * 100) / 100;
}