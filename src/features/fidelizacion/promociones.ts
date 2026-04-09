import type {
  PromocionAutomatica,
  ResumenFidelizacionCliente,
  SugerenciaFidelizacionOrden,
} from "@/types";

export const PROMOCIONES_AUTOMATICAS: PromocionAutomatica[] = [
  {
    id: "promo-20-descuento",
    nombre: "Descuento de $2",
    descripcion: "El cliente puede canjear 20 puntos por $2 de descuento.",
    tipo: "descuento",
    puntos_requeridos: 20,
    valor_descuento: 2,
    activa: true,
    prioridad: 1,
  },
  {
    id: "promo-40-lavado-express",
    nombre: "Lavado express gratis",
    descripcion: "El cliente puede reclamar un lavado express gratis con 40 puntos.",
    tipo: "servicio_gratis",
    puntos_requeridos: 40,
    servicio_codigo: "lavado_express",
    activa: true,
    prioridad: 2,
  },
  {
    id: "promo-60-cambio-aceite",
    nombre: "10% en cambio de aceite",
    descripcion: "El cliente puede obtener 10% de descuento en cambio de aceite con 60 puntos.",
    tipo: "descuento",
    puntos_requeridos: 60,
    porcentaje_descuento: 10,
    servicio_codigo: "cambio_aceite",
    activa: true,
    prioridad: 3,
  },
];

function daysBetween(dateIso: string | null) {
  if (!dateIso) return null;

  const now = new Date();
  const date = new Date(dateIso);

  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getPromocionesDisponibles(
  resumen: ResumenFidelizacionCliente
): PromocionAutomatica[] {
  return PROMOCIONES_AUTOMATICAS
    .filter((promo) => promo.activa && resumen.puntos_disponibles >= promo.puntos_requeridos)
    .sort((a, b) => a.prioridad - b.prioridad);
}

export function getPromocionesCercanas(
  resumen: ResumenFidelizacionCliente,
  margen = 10
): PromocionAutomatica[] {
  return PROMOCIONES_AUTOMATICAS
    .filter((promo) => {
      const faltan = promo.puntos_requeridos - resumen.puntos_disponibles;
      return promo.activa && faltan > 0 && faltan <= margen;
    })
    .sort((a, b) => a.puntos_requeridos - b.puntos_requeridos);
}

export function generarSugerenciasFidelizacionOrden(
  resumen: ResumenFidelizacionCliente
): SugerenciaFidelizacionOrden[] {
  const sugerencias: SugerenciaFidelizacionOrden[] = [];

  const promocionesDisponibles = getPromocionesDisponibles(resumen);
  const promocionesCercanas = getPromocionesCercanas(resumen);
  const diasSinVolver = daysBetween(resumen.ultima_visita);

  for (const promo of promocionesDisponibles) {
    sugerencias.push({
      id: `sugerencia-disponible-${promo.id}`,
      tipo: "promo_disponible",
      titulo: `Promo disponible: ${promo.nombre}`,
      mensaje: promo.descripcion,
      prioridad: 1,
      promocion: promo,
    });
  }

  for (const promo of promocionesCercanas) {
    const faltan = promo.puntos_requeridos - resumen.puntos_disponibles;

    sugerencias.push({
      id: `sugerencia-cerca-${promo.id}`,
      tipo: "cerca_recompensa",
      titulo: `Cliente cerca de recompensa`,
      mensaje: `Le faltan ${faltan} puntos para reclamar "${promo.nombre}". Puedes sugerir un servicio o producto extra.`,
      prioridad: 2,
      promocion: promo,
    });
  }

  if (resumen.puntos_disponibles >= 20 && resumen.puntos_disponibles < 40) {
    sugerencias.push({
      id: "sugerencia-upsell-descuento",
      tipo: "upsell",
      titulo: "Sugerencia de venta",
      mensaje:
        "Cliente con puntos disponibles. Puedes ofrecer aplicar descuento o agregar un producto complementario.",
      prioridad: 3,
    });
  }

  if (diasSinVolver !== null && diasSinVolver >= 30 && resumen.puntos_disponibles > 0) {
    sugerencias.push({
      id: "sugerencia-reactivacion",
      tipo: "reactivacion",
      titulo: "Cliente para reactivar",
      mensaje: `El cliente no ha vuelto en ${diasSinVolver} días y todavía tiene puntos disponibles.`,
      prioridad: 4,
    });
  }

  return sugerencias.sort((a, b) => a.prioridad - b.prioridad);
}