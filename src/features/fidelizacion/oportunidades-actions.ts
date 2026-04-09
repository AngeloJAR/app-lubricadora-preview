"use server";

import { createClient } from "@/lib/supabase/server";
import type { ClienteOportunidadFidelizacion, ClientePuntosMovimiento } from "@/types";

type ClienteRow = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  acepta_promociones: boolean;
};

type OrdenClienteRow = {
  id: string;
  cliente_id: string;
  estado: string;
  created_at: string;
};

function calcularDiasDesde(fechaIso: string | null) {
  if (!fechaIso) return null;

  const hoy = new Date();
  const fecha = new Date(fechaIso);
  const diferencia = hoy.getTime() - fecha.getTime();

  return Math.floor(diferencia / (1000 * 60 * 60 * 24));
}

function construirDescripcionOportunidad(params: {
  tipo: ClienteOportunidadFidelizacion["tipo_oportunidad"];
  puntosDisponibles: number;
  diasSinVolver: number | null;
}) {
  const { tipo, puntosDisponibles, diasSinVolver } = params;

  if (tipo === "promo_disponible") {
    if (puntosDisponibles >= 60) {
      return "Puede reclamar 10% de descuento en cambio de aceite.";
    }

    if (puntosDisponibles >= 40) {
      return "Puede reclamar un lavado express gratis.";
    }

    return "Puede reclamar $2 de descuento.";
  }

  if (tipo === "cerca_recompensa") {
    if (puntosDisponibles < 20) {
      return `Le faltan ${20 - puntosDisponibles} puntos para reclamar $2 de descuento.`;
    }

    if (puntosDisponibles < 40) {
      return `Le faltan ${40 - puntosDisponibles} puntos para reclamar un lavado express gratis.`;
    }

    return `Le faltan ${60 - puntosDisponibles} puntos para reclamar 10% en cambio de aceite.`;
  }

  if (tipo === "por_volver") {
    return `No ha vuelto en ${diasSinVolver ?? 0} días y todavía tiene puntos disponibles.`;
  }

  return "Tiene puntos disponibles que conviene ofrecer en la siguiente visita.";
}

function calcularPrioridadOportunidad(params: {
  tipo: ClienteOportunidadFidelizacion["tipo_oportunidad"];
  puntosDisponibles: number;
  diasSinVolver: number | null;
}) {
  const { tipo, puntosDisponibles, diasSinVolver } = params;

  if (tipo === "promo_disponible") {
    if (puntosDisponibles >= 60) return 1;
    if (puntosDisponibles >= 40) return 2;
    return 3;
  }

  if (tipo === "cerca_recompensa") {
    if (puntosDisponibles >= 50) return 4;
    if (puntosDisponibles >= 35) return 5;
    return 6;
  }

  if (tipo === "por_volver") {
    if ((diasSinVolver ?? 0) >= 60) return 7;
    return 8;
  }

  return 9;
}

export async function getOportunidadesFidelizacion(): Promise<
  ClienteOportunidadFidelizacion[]
> {
  const supabase = await createClient();

  const [clientesResponse, movimientosResponse, ordenesResponse] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nombres, apellidos, telefono, acepta_promociones")
      .order("created_at", { ascending: false }),

    supabase
      .from("cliente_puntos_movimientos")
      .select("id, cliente_id, vehiculo_id, orden_id, tipo, puntos, motivo, created_at")
      .order("created_at", { ascending: false }),

    supabase
      .from("ordenes_trabajo")
      .select("id, cliente_id, estado, created_at")
      .in("estado", ["completada", "entregada"])
      .order("created_at", { ascending: false }),
  ]);

  if (clientesResponse.error) {
    console.error(
      "Error obteniendo clientes para oportunidades de fidelización:",
      clientesResponse.error.message
    );
    throw new Error("No se pudieron obtener los clientes");
  }

  if (movimientosResponse.error) {
    console.error(
      "Error obteniendo movimientos de puntos para oportunidades:",
      movimientosResponse.error.message
    );
    throw new Error("No se pudieron obtener los movimientos de puntos");
  }

  if (ordenesResponse.error) {
    console.error(
      "Error obteniendo órdenes para oportunidades de fidelización:",
      ordenesResponse.error.message
    );
    throw new Error("No se pudieron obtener las órdenes");
  }

  const clientes = (clientesResponse.data ?? []) as ClienteRow[];
  const movimientos = (movimientosResponse.data ?? []) as ClientePuntosMovimiento[];
  const ordenes = (ordenesResponse.data ?? []) as OrdenClienteRow[];

  const movimientosPorCliente = new Map<string, ClientePuntosMovimiento[]>();
  const ordenesPorCliente = new Map<string, OrdenClienteRow[]>();

  for (const movimiento of movimientos) {
    if (!movimientosPorCliente.has(movimiento.cliente_id)) {
      movimientosPorCliente.set(movimiento.cliente_id, []);
    }

    movimientosPorCliente.get(movimiento.cliente_id)?.push(movimiento);
  }

  for (const orden of ordenes) {
    if (!orden.cliente_id) continue;

    if (!ordenesPorCliente.has(orden.cliente_id)) {
      ordenesPorCliente.set(orden.cliente_id, []);
    }

    ordenesPorCliente.get(orden.cliente_id)?.push(orden);
  }

  const oportunidades: ClienteOportunidadFidelizacion[] = [];

  for (const cliente of clientes) {
    const movimientosCliente = movimientosPorCliente.get(cliente.id) ?? [];
    const ordenesCliente = ordenesPorCliente.get(cliente.id) ?? [];

    let puntosGanados = 0;
    let puntosCanjeados = 0;
    let puntosDisponibles = 0;

    for (const movimiento of movimientosCliente) {
      if (movimiento.tipo === "acumulacion") {
        puntosGanados += Number(movimiento.puntos);
        puntosDisponibles += Number(movimiento.puntos);
        continue;
      }

      if (movimiento.tipo === "canje") {
        const puntosCanje = Math.abs(Number(movimiento.puntos));
        puntosCanjeados += puntosCanje;
        puntosDisponibles -= puntosCanje;
        continue;
      }

      if (movimiento.tipo === "ajuste") {
        puntosDisponibles += Number(movimiento.puntos);
      }
    }

    if (puntosDisponibles < 0) {
      puntosDisponibles = 0;
    }

    const ultimaVisita = ordenesCliente[0]?.created_at ?? null;
    const totalVisitas = ordenesCliente.length;
    const diasSinVolver = calcularDiasDesde(ultimaVisita);

    if (puntosDisponibles >= 20) {
      const tipo: ClienteOportunidadFidelizacion["tipo_oportunidad"] =
        "promo_disponible";

      oportunidades.push({
        cliente_id: cliente.id,
        nombres: cliente.nombres,
        apellidos: cliente.apellidos,
        telefono: cliente.telefono,
        puntos_disponibles: puntosDisponibles,
        puntos_ganados: puntosGanados,
        puntos_canjeados: puntosCanjeados,
        total_visitas: totalVisitas,
        ultima_visita: ultimaVisita,
        tipo_oportunidad: tipo,
        descripcion: construirDescripcionOportunidad({
          tipo,
          puntosDisponibles,
          diasSinVolver,
        }),
        prioridad: calcularPrioridadOportunidad({
          tipo,
          puntosDisponibles,
          diasSinVolver,
        }),
      });

      continue;
    }

    if (puntosDisponibles >= 10) {
      const tipo: ClienteOportunidadFidelizacion["tipo_oportunidad"] =
        "cerca_recompensa";

      oportunidades.push({
        cliente_id: cliente.id,
        nombres: cliente.nombres,
        apellidos: cliente.apellidos,
        telefono: cliente.telefono,
        puntos_disponibles: puntosDisponibles,
        puntos_ganados: puntosGanados,
        puntos_canjeados: puntosCanjeados,
        total_visitas: totalVisitas,
        ultima_visita: ultimaVisita,
        tipo_oportunidad: tipo,
        descripcion: construirDescripcionOportunidad({
          tipo,
          puntosDisponibles,
          diasSinVolver,
        }),
        prioridad: calcularPrioridadOportunidad({
          tipo,
          puntosDisponibles,
          diasSinVolver,
        }),
      });

      continue;
    }

    if (
      cliente.acepta_promociones &&
      puntosDisponibles > 0 &&
      diasSinVolver !== null &&
      diasSinVolver >= 30
    ) {
      const tipo: ClienteOportunidadFidelizacion["tipo_oportunidad"] =
        "por_volver";

      oportunidades.push({
        cliente_id: cliente.id,
        nombres: cliente.nombres,
        apellidos: cliente.apellidos,
        telefono: cliente.telefono,
        puntos_disponibles: puntosDisponibles,
        puntos_ganados: puntosGanados,
        puntos_canjeados: puntosCanjeados,
        total_visitas: totalVisitas,
        ultima_visita: ultimaVisita,
        tipo_oportunidad: tipo,
        descripcion: construirDescripcionOportunidad({
          tipo,
          puntosDisponibles,
          diasSinVolver,
        }),
        prioridad: calcularPrioridadOportunidad({
          tipo,
          puntosDisponibles,
          diasSinVolver,
        }),
      });

      continue;
    }

    if (puntosDisponibles > 0) {
      const tipo: ClienteOportunidadFidelizacion["tipo_oportunidad"] =
        "con_puntos";

      oportunidades.push({
        cliente_id: cliente.id,
        nombres: cliente.nombres,
        apellidos: cliente.apellidos,
        telefono: cliente.telefono,
        puntos_disponibles: puntosDisponibles,
        puntos_ganados: puntosGanados,
        puntos_canjeados: puntosCanjeados,
        total_visitas: totalVisitas,
        ultima_visita: ultimaVisita,
        tipo_oportunidad: tipo,
        descripcion: construirDescripcionOportunidad({
          tipo,
          puntosDisponibles,
          diasSinVolver,
        }),
        prioridad: calcularPrioridadOportunidad({
          tipo,
          puntosDisponibles,
          diasSinVolver,
        }),
      });
    }
  }

  return oportunidades.sort((a, b) => {
    if (a.prioridad !== b.prioridad) {
      return a.prioridad - b.prioridad;
    }

    if (b.puntos_disponibles !== a.puntos_disponibles) {
      return b.puntos_disponibles - a.puntos_disponibles;
    }

    return `${a.nombres} ${a.apellidos}`.localeCompare(
      `${b.nombres} ${b.apellidos}`
    );
  });
}