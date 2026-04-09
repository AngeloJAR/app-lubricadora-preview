export function calcularDescuentoPorPuntos(puntos: number) {
  if (puntos <= 0) {
    return 0;
  }

  return Number((puntos * 0.1).toFixed(2));
}