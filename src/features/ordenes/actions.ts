"use server";

import { validarTransicionEstadoOrden } from "@/features/ordenes/domain/orden.service";
import { construirTotalesOrdenDesdePayload } from "@/features/ordenes/domain/orden-payload";
import {
  procesarSalidaStockPorOrden,
  procesarEntradaStockPorCancelacion,
} from "@/features/ordenes/domain/orden-stock.service";
import { puedeEliminarOrdenCancelada } from "@/lib/core/ordenes/estados";


import { createClient } from "@/lib/supabase/server";
import { getTareasSugeridasPorServicio } from "./constants";
import { calcularPuntosOrden } from "@/features/clientes/fidelizacion-utils";
import { registrarPuntosCliente } from "@/features/clientes/fidelizacion-actions";
import { canjearPuntosCliente } from "@/features/clientes/fidelizacion-actions";
import { calcularDescuentoPorPuntos } from "@/features/clientes/fidelizacion-reglas";

import { registrarAuditoriaLog } from "@/lib/core/auditoria/logs";

import { updateOrdenEstado as updateOrdenEstadoAction } from "./actions/estado-actions";

import {
  deleteOrdenCancelada as deleteOrdenCanceladaAction,
  createOrden as createOrdenAction,
} from "./actions/mutations";

export async function updateOrdenEstado(
  ordenId: string,
  estado: OrdenTrabajo["estado"]
) {
  return updateOrdenEstadoAction(ordenId, estado);
}

export async function deleteOrdenCancelada(ordenId: string) {
  return deleteOrdenCanceladaAction(ordenId);
}

export async function createOrden(payload: OrdenFormData) {
  return createOrdenAction(payload);
}


import { updateOrden as updateOrdenAction } from "./actions/mutations";

export async function updateOrden(
  ordenId: string,
  payload: OrdenFormData
) {
  return updateOrdenAction(ordenId, payload);
}
import type {
  Cliente,
  HistorialOrden,
  OrdenConRelaciones,
  OrdenDetalle,
  OrdenEditable,
  OrdenFormData,
  OrdenItem,
  OrdenTrabajo,
  Producto,
  Servicio,
  Vehiculo,
  PromocionAutomatica,
  SugerenciaFidelizacionOrden,
} from "@/types";

import type {
  OrdenTareaTecnico,
  OrdenTareaTecnicoFormData,
} from "@/types";

type EstadoOrdenTecnico =
  | "pendiente"
  | "en_proceso"
  | "completada"
  | "entregada"
  | "cancelada";

type OrdenTecnicoItem = {
  id: string;
  estado: EstadoOrdenTecnico;
  cliente: {
    nombre: string | null;
    telefono?: string | null;
  } | null;
  vehiculo: {
    placa: string | null;
    marca: string | null;
    modelo: string | null;
  } | null;
};

type TareaEstado = "pendiente" | "en_proceso" | "completada";

type RecalcularEstadoOrdenResult = {
  estado: OrdenTrabajo["estado"];
  totalTareas: number;
  completadas: number;
};

type OrdenBaseRow = {
  id: string;
  estado: EstadoOrdenTecnico;
  cliente_id: string | null;
  vehiculo_id: string | null;
};

type ClienteRow = {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
};

type VehiculoRow = {
  id: string;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
};

type GuardarAsignacionTecnicoInput = {
  ordenId: string;
  tecnicoPrincipalId: string | null;
  tecnicosIds: string[];
};

type DashboardTecnicoMetricas = {
  ordenesPendientes: number;
  ordenesEnProceso: number;
  ordenesTerminadasHoy: number;
};

type OrdenTecnicoAsignacionRow = {
  orden_id: string;
};

type OrdenDashboardRow = {
  id: string;
  estado: string;
  hora_fin: string | null;
};

type ResumenFidelizacionClienteOrden = {
  cliente_id: string;
  puntos_disponibles: number;
  puntos_ganados: number;
  puntos_canjeados: number;
  total_visitas: number;
  ultima_visita: string | null;
};

type ClientePuntosMovimientoRow = {
  id: string;
  cliente_id: string;
  orden_id: string | null;
  tipo: "acumulacion" | "canje" | "ajuste";
  puntos: number;
  motivo: string | null;
  created_at: string;
};

type ProductoUltimaOrdenVehiculo = {
  producto_id: string;
  nombre_item: string;
  cantidad: number;
  precio_unitario: number;
  orden_id: string;
  orden_numero: string;
  fecha: string;
};

export async function getDashboardTecnicoMetricas(
  tecnicoId: string
): Promise<DashboardTecnicoMetricas> {
  const supabase = await createClient();
  const hoy = new Date();

  const inicioDia = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate(),
    0,
    0,
    0
  ).toISOString();

  const finDia = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate(),
    23,
    59,
    59
  ).toISOString();

  const { data: asignacionesData, error: asignacionesError } = await supabase
    .from("ordenes_tecnicos")
    .select("orden_id")
    .eq("tecnico_id", tecnicoId);

  if (asignacionesError) {
    console.error(
      "Error obteniendo asignaciones del dashboard técnico:",
      asignacionesError.message
    );
    throw new Error("No se pudieron obtener las métricas del técnico");
  }

  const ordenIds = Array.from(
    new Set(
      ((asignacionesData ?? []) as OrdenTecnicoAsignacionRow[]).map(
        (item: OrdenTecnicoAsignacionRow) => item.orden_id
      )
    )
  );

  if (ordenIds.length === 0) {
    return {
      ordenesPendientes: 0,
      ordenesEnProceso: 0,
      ordenesTerminadasHoy: 0,
    };
  }

  const { data: ordenesData, error: ordenesError } = await supabase
    .from("ordenes_trabajo")
    .select("id, estado, hora_fin")
    .in("id", ordenIds);

  if (ordenesError) {
    console.error(
      "Error obteniendo órdenes del dashboard técnico:",
      ordenesError.message
    );
    throw new Error("No se pudieron obtener las métricas del técnico");
  }

  const ordenes = (ordenesData ?? []) as OrdenDashboardRow[];

  const ordenesPendientes = ordenes.filter(
    (orden) => orden.estado === "pendiente"
  ).length;

  const ordenesEnProceso = ordenes.filter(
    (orden) => orden.estado === "en_proceso"
  ).length;

  const ordenesTerminadasHoy = ordenes.filter((orden) => {
    if (orden.estado !== "completada" || !orden.hora_fin) {
      return false;
    }

    return orden.hora_fin >= inicioDia && orden.hora_fin <= finDia;
  }).length;

  return {
    ordenesPendientes,
    ordenesEnProceso,
    ordenesTerminadasHoy,
  };
}

const PROMOCIONES_AUTOMATICAS_ORDEN: PromocionAutomatica[] = [
  {
    id: "promo-20-descuento",
    nombre: "Descuento de $2",
    descripcion: "El cliente puede usar 20 puntos para obtener $2 de descuento.",
    tipo: "descuento",
    puntos_requeridos: 20,
    valor_descuento: 2,
    activa: true,
    prioridad: 1,
  },
  {
    id: "promo-40-lavado-express",
    nombre: "Lavado express gratis",
    descripcion: "El cliente ya puede reclamar un lavado express gratis.",
    tipo: "servicio_gratis",
    puntos_requeridos: 40,
    servicio_codigo: "lavado_express",
    activa: true,
    prioridad: 2,
  },
  {
    id: "promo-60-cambio-aceite",
    nombre: "10% en cambio de aceite",
    descripcion: "El cliente puede recibir 10% de descuento en cambio de aceite.",
    tipo: "descuento",
    puntos_requeridos: 60,
    porcentaje_descuento: 10,
    servicio_codigo: "cambio_aceite",
    activa: true,
    prioridad: 3,
  },
];

function calcularDiasDesde(fechaIso: string | null) {
  if (!fechaIso) return null;

  const hoy = new Date();
  const fecha = new Date(fechaIso);

  const diferencia = hoy.getTime() - fecha.getTime();

  return Math.floor(diferencia / (1000 * 60 * 60 * 24));
}

function getPromocionesDisponiblesOrden(
  resumen: ResumenFidelizacionClienteOrden
): PromocionAutomatica[] {
  return PROMOCIONES_AUTOMATICAS_ORDEN
    .filter(
      (promo) =>
        promo.activa && resumen.puntos_disponibles >= promo.puntos_requeridos
    )
    .sort((a, b) => a.prioridad - b.prioridad);
}

function getPromocionesCercanasOrden(
  resumen: ResumenFidelizacionClienteOrden,
  margen = 10
): PromocionAutomatica[] {
  return PROMOCIONES_AUTOMATICAS_ORDEN
    .filter((promo) => {
      if (!promo.activa) return false;

      const faltan = promo.puntos_requeridos - resumen.puntos_disponibles;
      return faltan > 0 && faltan <= margen;
    })
    .sort((a, b) => a.puntos_requeridos - b.puntos_requeridos);
}

function generarSugerenciasFidelizacionOrden(
  resumen: ResumenFidelizacionClienteOrden
): SugerenciaFidelizacionOrden[] {
  const sugerencias: SugerenciaFidelizacionOrden[] = [];

  const promocionesDisponibles = getPromocionesDisponiblesOrden(resumen);
  const promocionesCercanas = getPromocionesCercanasOrden(resumen);
  const diasSinVolver = calcularDiasDesde(resumen.ultima_visita);

  for (const promo of promocionesDisponibles) {
    sugerencias.push({
      id: `promo-disponible-${promo.id}`,
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
      id: `promo-cercana-${promo.id}`,
      tipo: "cerca_recompensa",
      titulo: "Cliente cerca de recompensa",
      mensaje: `Le faltan ${faltan} puntos para reclamar "${promo.nombre}".`,
      prioridad: 2,
      promocion: promo,
    });
  }

  if (resumen.puntos_disponibles >= 20 && resumen.puntos_disponibles < 40) {
    sugerencias.push({
      id: "upsell-fidelizacion",
      tipo: "upsell",
      titulo: "Sugerencia de venta",
      mensaje:
        "Cliente con puntos disponibles. Puedes ofrecer un producto o servicio adicional para acercarlo a una recompensa mejor.",
      prioridad: 3,
    });
  }

  if (
    diasSinVolver !== null &&
    diasSinVolver >= 30 &&
    resumen.puntos_disponibles > 0
  ) {
    sugerencias.push({
      id: "reactivacion-fidelizacion",
      tipo: "reactivacion",
      titulo: "Cliente para reactivar",
      mensaje: `El cliente no ha vuelto en ${diasSinVolver} días y todavía tiene puntos disponibles.`,
      prioridad: 4,
    });
  }

  return sugerencias.sort((a, b) => a.prioridad - b.prioridad);
}

function generateOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const time = Date.now().toString().slice(-6);

  return `OT-${year}-${time}`;
}
async function requireAdminOrRecepcion() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autorizado");
  }

  const { data: perfil, error } = await supabase
    .from("usuarios_app")
    .select("rol, activo")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();

  if (
    error ||
    !perfil ||
    (perfil.rol !== "admin" && perfil.rol !== "recepcion")
  ) {
    throw new Error("No autorizado");
  }

  return supabase;
}

async function getPerfilActual() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autorizado");
  }

  const { data: perfil, error } = await supabase
    .from("usuarios_app")
    .select("id, rol, activo")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();

  if (error || !perfil) {
    throw new Error("No autorizado");
  }

  return {
    supabase,
    perfil: perfil as {
      id: string;
      rol: "admin" | "recepcion" | "tecnico";
      activo: boolean;
    },
    user,
  };
}

async function requirePerfilActivo(
  rolesPermitidos: Array<"admin" | "recepcion" | "tecnico">
) {
  const { supabase, perfil, user } = await getPerfilActual();

  if (!rolesPermitidos.includes(perfil.rol)) {
    throw new Error("No autorizado");
  }

  return { supabase, perfil, user };
}

type TecnicoOption = {
  id: string;
  nombre: string;
};

export async function getTecnicosActivos(): Promise<TecnicoOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("usuarios_app")
    .select("id, nombre")
    .eq("rol", "tecnico")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error obteniendo técnicos:", error.message);
    throw new Error("No se pudieron cargar los técnicos");
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    nombre: item.nombre ?? "Técnico",
  }));
}

export async function getSugerenciasFidelizacionOrden(clienteId: string): Promise<{
  resumen: ResumenFidelizacionClienteOrden | null;
  sugerencias: SugerenciaFidelizacionOrden[];
}> {
  if (!clienteId) {
    return {
      resumen: null,
      sugerencias: [],
    };
  }

  const supabase = await createClient();

  const [movimientosResponse, ordenesResponse] = await Promise.all([
    supabase
      .from("cliente_puntos_movimientos")
      .select("id, cliente_id, orden_id, tipo, puntos, motivo, created_at")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false }),

    supabase
      .from("ordenes_trabajo")
      .select("id, created_at, estado")
      .eq("cliente_id", clienteId)
      .in("estado", ["completada", "entregada"])
      .order("created_at", { ascending: false }),
  ]);

  if (movimientosResponse.error) {
    console.error(
      "Error obteniendo movimientos de puntos para sugerencias:",
      movimientosResponse.error.message
    );
    throw new Error("No se pudieron obtener los movimientos de puntos");
  }

  if (ordenesResponse.error) {
    console.error(
      "Error obteniendo órdenes para sugerencias:",
      ordenesResponse.error.message
    );
    throw new Error("No se pudieron obtener las órdenes del cliente");
  }

  const movimientos = (movimientosResponse.data ??
    []) as ClientePuntosMovimientoRow[];

  const ordenes = (ordenesResponse.data ?? []) as {
    id: string;
    created_at: string;
    estado: string;
  }[];

  let puntosGanados = 0;
  let puntosCanjeados = 0;
  let puntosDisponibles = 0;

  for (const movimiento of movimientos) {
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

  const resumen: ResumenFidelizacionClienteOrden = {
    cliente_id: clienteId,
    puntos_disponibles: puntosDisponibles,
    puntos_ganados: puntosGanados,
    puntos_canjeados: puntosCanjeados,
    total_visitas: ordenes.length,
    ultima_visita: ordenes[0]?.created_at ?? null,
  };

  return {
    resumen,
    sugerencias: generarSugerenciasFidelizacionOrden(resumen),
  };
}

export async function getVehiculosByCliente(clienteId: string): Promise<Vehiculo[]> {
  if (!clienteId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehiculos")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("placa", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar los vehículos");
  }

  return data ?? [];
}

export async function getServiciosActivos(): Promise<Servicio[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("servicios")
    .select("*")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar los servicios");
  }

  return data ?? [];
}

export async function getProductosActivos(): Promise<Producto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar los productos");
  }

  return data ?? [];
}

export async function getProductosUltimaOrdenVehiculo(
  vehiculoId: string
): Promise<{
  aceite: ProductoUltimaOrdenVehiculo | null;
  filtro: ProductoUltimaOrdenVehiculo | null;
}> {
  if (!vehiculoId) {
    return {
      aceite: null,
      filtro: null,
    };
  }

  const supabase = await createClient();

  const { data: ordenes, error: ordenesError } = await supabase
    .from("ordenes_trabajo")
    .select("id, numero, fecha, estado")
    .eq("vehiculo_id", vehiculoId)
    .in("estado", ["completada", "entregada", "en_proceso", "pendiente"])
    .order("fecha", { ascending: false })
    .limit(10);

  if (ordenesError) {
    console.error(
      "Error obteniendo órdenes del vehículo para sugerencias:",
      ordenesError.message
    );
    throw new Error("No se pudo obtener el historial del vehículo");
  }

  const ordenesLista =
    (ordenes ?? []) as Array<{
      id: string;
      numero: string;
      fecha: string;
      estado: string;
    }>;

  if (ordenesLista.length === 0) {
    return {
      aceite: null,
      filtro: null,
    };
  }

  const ordenIds = ordenesLista.map((orden) => orden.id);

  const { data: items, error: itemsError } = await supabase
    .from("orden_items")
    .select(`
      orden_id,
      producto_id,
      tipo_item,
      nombre_item,
      cantidad,
      precio_unitario,
      productos (
        id,
        categoria
      )
    `)
    .in("orden_id", ordenIds)
    .eq("tipo_item", "producto");

  if (itemsError) {
    console.error(
      "Error obteniendo items del historial del vehículo:",
      itemsError.message
    );
    throw new Error("No se pudo obtener el historial del vehículo");
  }

  type ItemHistorial = {
    orden_id: string;
    producto_id: string | null;
    tipo_item: string;
    nombre_item: string;
    cantidad: number | null;
    precio_unitario: number | null;
    productos:
    | {
      id: string;
      categoria: string | null;
    }
    | {
      id: string;
      categoria: string | null;
    }[]
    | null;
  };

  const itemsPorOrden = new Map<string, ItemHistorial[]>();

  for (const item of (items ?? []) as ItemHistorial[]) {
    const actuales = itemsPorOrden.get(item.orden_id) ?? [];
    actuales.push(item);
    itemsPorOrden.set(item.orden_id, actuales);
  }

  for (const orden of ordenesLista) {
    const itemsOrden = itemsPorOrden.get(orden.id) ?? [];

    let aceite: ProductoUltimaOrdenVehiculo | null = null;
    let filtro: ProductoUltimaOrdenVehiculo | null = null;

    for (const item of itemsOrden) {
      const productoRelacion = Array.isArray(item.productos)
        ? item.productos[0] ?? null
        : item.productos ?? null;

      const categoria = String(productoRelacion?.categoria ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

      const producto: ProductoUltimaOrdenVehiculo = {
        producto_id: item.producto_id ?? "",
        nombre_item: item.nombre_item,
        cantidad: Number(item.cantidad ?? 0),
        precio_unitario: Number(item.precio_unitario ?? 0),
        orden_id: item.orden_id,
        orden_numero: orden.numero,
        fecha: orden.fecha,
      };

      if (!aceite && categoria === "aceite_motor") {
        aceite = producto;
      }

      if (!filtro && categoria === "filtro_aceite") {
        filtro = producto;
      }

      if (aceite && filtro) {
        return { aceite, filtro };
      }
    }

    if (aceite || filtro) {
      return { aceite, filtro };
    }
  }

  return {
    aceite: null,
    filtro: null,
  };
}
async function recalcularEstadoOrdenPorTareas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ordenId: string
): Promise<RecalcularEstadoOrdenResult> {
  const { data: ordenActual, error: ordenActualError } = await supabase
    .from("ordenes_trabajo")
    .select("id, estado, hora_inicio, hora_fin")
    .eq("id", ordenId)
    .single();

  if (ordenActualError || !ordenActual) {
    throw new Error("No se pudo recalcular el estado de la orden");
  }

  if (ordenActual.estado === "entregada" || ordenActual.estado === "cancelada") {
    return {
      estado: ordenActual.estado,
      totalTareas: 0,
      completadas: 0,
    };
  }

  const { data: tareasData, error: tareasError } = await supabase
    .from("ordenes_tareas_tecnicos")
    .select("id, estado")
    .eq("orden_id", ordenId);

  if (tareasError) {
    console.error("Error recalculando tareas de la orden:", tareasError.message);
    throw new Error("No se pudo recalcular el estado de la orden");
  }

  const tareas = (tareasData ?? []) as { id: string; estado: TareaEstado }[];

  if (tareas.length === 0) {
    return {
      estado: ordenActual.estado,
      totalTareas: 0,
      completadas: 0,
    };
  }

  const totalTareas = tareas.length;
  const completadas = tareas.filter((tarea) => tarea.estado === "completada").length;
  const todasCompletadas = completadas === totalTareas;
  const algunaIniciada = tareas.some(
    (tarea) => tarea.estado === "en_proceso" || tarea.estado === "completada"
  );

  let nuevoEstado: OrdenTrabajo["estado"] = "pendiente";
  const payload: Partial<OrdenTrabajo> & {
    hora_inicio?: string | null;
    hora_fin?: string | null;
  } = {};

  if (todasCompletadas) {
    nuevoEstado = "completada";
    payload.estado = "completada";
    payload.hora_fin = ordenActual.hora_fin ?? new Date().toISOString();

    if (!ordenActual.hora_inicio) {
      payload.hora_inicio = new Date().toISOString();
    }
  } else if (algunaIniciada) {
    nuevoEstado = "en_proceso";
    payload.estado = "en_proceso";

    if (!ordenActual.hora_inicio) {
      payload.hora_inicio = new Date().toISOString();
    }

    if (ordenActual.hora_fin) {
      payload.hora_fin = null;
    }
  } else {
    nuevoEstado = "pendiente";
    payload.estado = "pendiente";

    if (ordenActual.hora_fin) {
      payload.hora_fin = null;
    }
  }

  const { error: updateError } = await supabase
    .from("ordenes_trabajo")
    .update(payload)
    .eq("id", ordenId);

  if (updateError) {
    console.error("Error actualizando estado de orden por tareas:", updateError.message);
    throw new Error("No se pudo recalcular el estado de la orden");
  }

  return {
    estado: nuevoEstado,
    totalTareas,
    completadas,
  };
}

export async function updateTareaOrdenEstado(
  tareaId: string,
  estado: OrdenTareaTecnico["estado"]
) {
  const { supabase, perfil } = await getPerfilActual();

  const { data: tareaActual, error: tareaActualError } = await supabase
    .from("ordenes_tareas_tecnicos")
    .select("id, orden_id, tecnico_id, estado, hora_inicio, hora_fin")
    .eq("id", tareaId)
    .single();

  if (tareaActualError || !tareaActual) {
    throw new Error("No se encontró la tarea");
  }

  if (perfil.rol === "tecnico" && tareaActual.tecnico_id !== perfil.id) {
    throw new Error("No autorizado para actualizar esta tarea");
  }

  const payload: {
    estado: OrdenTareaTecnico["estado"];
    hora_inicio?: string;
    hora_fin?: string | null;
  } = {
    estado,
  };

  if (estado === "en_proceso" && !tareaActual.hora_inicio) {
    payload.hora_inicio = new Date().toISOString();
  }

  if (estado === "completada") {
    if (!tareaActual.hora_inicio) {
      payload.hora_inicio = new Date().toISOString();
    }

    payload.hora_fin = new Date().toISOString();
  }

  if (estado === "pendiente") {
    payload.hora_fin = null;
  }

  const { data, error } = await supabase
    .from("ordenes_tareas_tecnicos")
    .update(payload)
    .eq("id", tareaId)
    .select()
    .single();

  if (error) {
    console.error("Error actualizando tarea:", error.message);
    throw new Error("No se pudo actualizar la tarea");
  }

  await recalcularEstadoOrdenPorTareas(supabase, tareaActual.orden_id);

  return data;
}

export async function createTareasSugeridasOrden(ordenId: string) {
  const { supabase, perfil } = await getPerfilActual();

  if (perfil.rol !== "admin" && perfil.rol !== "recepcion") {
    throw new Error("No autorizado para crear tareas");
  }

  const { data: tecnicosAsignadosData, error: tecnicosAsignadosError } =
    await supabase
      .from("ordenes_tecnicos")
      .select("tecnico_id, es_principal")
      .eq("orden_id", ordenId)
      .order("created_at", { ascending: true });

  if (tecnicosAsignadosError) {
    console.error(
      "Error obteniendo técnicos asignados:",
      tecnicosAsignadosError.message
    );
    throw new Error("No se pudieron obtener los técnicos asignados");
  }

  const tecnicosAsignados = (tecnicosAsignadosData ?? []) as {
    tecnico_id: string;
    es_principal: boolean;
  }[];

  if (tecnicosAsignados.length === 0) {
    throw new Error("La orden no tiene técnicos asignados");
  }

  const tecnicoIds = tecnicosAsignados.map((item) => item.tecnico_id);

  const { data: itemsData, error: itemsError } = await supabase
    .from("orden_items")
    .select("id, tipo_item, nombre_item")
    .eq("orden_id", ordenId)
    .eq("tipo_item", "servicio");

  if (itemsError) {
    console.error("Error obteniendo items de la orden:", itemsError.message);
    throw new Error("No se pudieron obtener los servicios de la orden");
  }

  const items = (itemsData ?? []) as {
    id: string;
    tipo_item: string;
    nombre_item: string;
  }[];

  if (items.length === 0) {
    throw new Error("La orden no tiene servicios para generar tareas");
  }

  const { data: tareasActualesData, error: tareasActualesError } = await supabase
    .from("ordenes_tareas_tecnicos")
    .select("tipo_tarea, descripcion")
    .eq("orden_id", ordenId);

  if (tareasActualesError) {
    console.error("Error obteniendo tareas actuales:", tareasActualesError.message);
    throw new Error("No se pudieron validar las tareas existentes");
  }

  const existentes = new Set(
    ((tareasActualesData ?? []) as {
      tipo_tarea: string;
      descripcion: string | null;
    }[]).map(
      (tarea) => `${tarea.tipo_tarea}::${(tarea.descripcion ?? "").trim()}`
    )
  );

  const tareasBase = items.flatMap((item) =>
    getTareasSugeridasPorServicio(item.nombre_item).map((tipo) => ({
      tipo_tarea: tipo,
      descripcion: item.nombre_item.trim(),
    }))
  );

  if (tareasBase.length === 0) {
    return [];
  }

  const tareasUnicas = tareasBase.filter((tarea) => {
    const key = `${tarea.tipo_tarea}::${tarea.descripcion}`;
    if (existentes.has(key)) {
      return false;
    }

    existentes.add(key);
    return true;
  });

  if (tareasUnicas.length === 0) {
    return [];
  }

  const rows: {
    orden_id: string;
    tecnico_id: string;
    tipo_tarea: string;
    descripcion: string;
    estado: "pendiente";
  }[] = [];

  for (let index = 0; index < tareasUnicas.length; index++) {
    const tarea = tareasUnicas[index];
    const tecnicoId = tecnicoIds[index % tecnicoIds.length];

    rows.push({
      orden_id: ordenId,
      tecnico_id: tecnicoId,
      tipo_tarea: tarea.tipo_tarea,
      descripcion: tarea.descripcion,
      estado: "pendiente",
    });
  }

  const { data, error } = await supabase
    .from("ordenes_tareas_tecnicos")
    .insert(rows)
    .select();

  if (error) {
    console.error("Error creando tareas sugeridas:", error.message);
    throw new Error("No se pudieron crear las tareas sugeridas");
  }

  await recalcularEstadoOrdenPorTareas(supabase, ordenId);

  return data ?? [];
}


export async function getOrdenes(): Promise<OrdenConRelaciones[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .select(`
    id,
    numero,
    cliente_id,
    vehiculo_id,
    tecnico_id,
    fecha,
    estado,
    kilometraje,
    kilometraje_final,
    subtotal,
    descuento,
    descuento_puntos,
    puntos_usados,
    total,
    notas,
    observaciones_tecnicas,
    proximo_mantenimiento_fecha,
    proximo_mantenimiento_km,
    hora_inicio,
    hora_fin,
    created_at,
    updated_at,
    clientes (
      id,
      nombres,
      apellidos,
      telefono
    ),
    vehiculos (
      id,
      placa,
      marca,
      modelo
    ),
    ordenes_tecnicos (
      tecnico_id,
      es_principal,
      usuarios_app (
        id,
        nombre
      )
    )
  `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error obteniendo órdenes:", error.message);
    throw new Error("No se pudieron obtener las órdenes");
  }

  const rows = (data ?? []) as Array<{
    id: string;
    numero: string;
    cliente_id: string;
    vehiculo_id: string;
    tecnico_id: string | null;
    fecha: string;
    estado: OrdenConRelaciones["estado"];
    kilometraje: number | null;
    kilometraje_final: number | null;
    subtotal: number;
    descuento: number;
    descuento_puntos: number;
    puntos_usados: number;
    total: number;
    notas: string | null;
    observaciones_tecnicas: string | null;
    proximo_mantenimiento_fecha: string | null;
    proximo_mantenimiento_km: number | null;
    hora_inicio: string | null;
    hora_fin: string | null;
    created_at: string;
    updated_at: string;
    clientes:
    | {
      id: string;
      nombres: string;
      apellidos: string;
      telefono: string;
    }
    | {
      id: string;
      nombres: string;
      apellidos: string;
      telefono: string;
    }[]
    | null;
    vehiculos:
    | {
      id: string;
      placa: string;
      marca: string;
      modelo: string;
    }
    | {
      id: string;
      placa: string;
      marca: string;
      modelo: string;
    }[]
    | null;
    ordenes_tecnicos:
    | Array<{
      tecnico_id: string;
      es_principal: boolean;
      usuarios_app:
      | {
        id: string;
        nombre: string | null;
      }
      | {
        id: string;
        nombre: string | null;
      }[]
      | null;
    }>
    | null;
  }>;

  return rows.map((row): OrdenConRelaciones => ({
    id: row.id,
    numero: row.numero,
    cliente_id: row.cliente_id,
    vehiculo_id: row.vehiculo_id,
    tecnico_id: row.tecnico_id,
    fecha: row.fecha,
    estado: row.estado,
    kilometraje: row.kilometraje,
    kilometraje_final: row.kilometraje_final,
    subtotal: row.subtotal,
    descuento: row.descuento,
    descuento_puntos: row.descuento_puntos ?? 0,
    puntos_usados: row.puntos_usados ?? 0,
    total: row.total,
    notas: row.notas,
    observaciones_tecnicas: row.observaciones_tecnicas,
    proximo_mantenimiento_fecha: row.proximo_mantenimiento_fecha,
    proximo_mantenimiento_km: row.proximo_mantenimiento_km,
    hora_inicio: row.hora_inicio,
    hora_fin: row.hora_fin,
    created_at: row.created_at,
    updated_at: row.updated_at,
    clientes: Array.isArray(row.clientes) ? row.clientes[0] ?? null : row.clientes,
    vehiculos: Array.isArray(row.vehiculos) ? row.vehiculos[0] ?? null : row.vehiculos,
    tecnico: null,
    tecnicos: (row.ordenes_tecnicos ?? []).map((item) => {
      const usuario = Array.isArray(item.usuarios_app)
        ? item.usuarios_app[0] ?? null
        : item.usuarios_app;

      return {
        id: usuario?.id ?? item.tecnico_id,
        nombre: usuario?.nombre?.trim() || "Técnico",
        es_principal: Boolean(item.es_principal),
      };
    }),
  }));
}


export async function createPreOrdenTecnico(payload: OrdenFormData) {
  const { supabase, perfil } = await requirePerfilActivo(["tecnico"]);

  if (!payload.items.length) {
    throw new Error("Debes agregar al menos un item.");
  }

  const {
    itemsConTotal,
    totales,
    descuentoManual,
    descuentoPuntos,
    puntosCanjear,
  } = construirTotalesOrdenDesdePayload({
    payload,
    calcularDescuentoPorPuntos,
  });

  const subtotal = totales.subtotal;
  const total = totales.total;

  const numero = `PRE-${generateOrderNumber()}`;

  const notasTecnico = payload.notas.trim();
  const notasFinal = ["[PRE-ORDEN CREADA POR TÉCNICO]", notasTecnico || null]
    .filter(Boolean)
    .join("\n");

  const { data: orden, error: ordenError } = await supabase
    .from("ordenes_trabajo")
    .insert([
      {
        numero,
        cliente_id: payload.cliente_id,
        vehiculo_id: payload.vehiculo_id,
        tecnico_id: null,
        estado: "pendiente",
        kilometraje: payload.kilometraje.trim()
          ? Number(payload.kilometraje)
          : null,
        subtotal,
        descuento: descuentoManual,
        descuento_puntos: descuentoPuntos,
        puntos_usados: puntosCanjear,
        total,
        notas: notasFinal || null,
        observaciones_tecnicas: `Pre-orden registrada por técnico ${perfil.id}`,
        proximo_mantenimiento_fecha:
          payload.proximo_mantenimiento_fecha.trim() || null,
        proximo_mantenimiento_km: payload.proximo_mantenimiento_km.trim()
          ? Number(payload.proximo_mantenimiento_km)
          : null,
      },
    ])
    .select()
    .single();

  if (ordenError || !orden) {
    throw new Error(ordenError?.message || "No se pudo crear la pre-orden");
  }

  const itemsToInsert = itemsConTotal.map((item) => ({
    orden_id: orden.id,
    ...item,
  }));

  const { error: itemsError } = await supabase
    .from("orden_items")
    .insert(itemsToInsert);

  if (itemsError) {
    throw new Error(itemsError.message || "No se pudieron guardar los items");
  }

  const ordenCompleta = await getOrdenes();
  const creada = ordenCompleta.find((item) => item.id === orden.id);

  return creada ?? orden;
}

type HistorialRow = HistorialOrden & {
  vehiculos:
  | {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
  }
  | {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
  }[]
  | null;
  orden_items: HistorialOrden["orden_items"] | null;
};

export async function getHistorialByCliente(
  clienteId: string
): Promise<HistorialOrden[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .select(
      `
      *,
      vehiculos (
        id,
        placa,
        marca,
        modelo
      ),
      orden_items (
        *
      )
    `
    )
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("No se pudo cargar el historial del cliente");
  }

  const rows = (data ?? []) as HistorialRow[];

  return rows.map((row) => ({
    ...row,
    vehiculos: Array.isArray(row.vehiculos) ? row.vehiculos[0] ?? null : row.vehiculos,
    orden_items: row.orden_items ?? [],
  }));
}

export async function getHistorialByVehiculo(
  vehiculoId: string
): Promise<HistorialOrden[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .select(
      `
      *,
      vehiculos (
        id,
        placa,
        marca,
        modelo
      ),
      orden_items (
        *
      )
    `
    )
    .eq("vehiculo_id", vehiculoId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("No se pudo cargar el historial del vehículo");
  }

  const rows = (data ?? []) as HistorialRow[];

  return rows.map((row) => ({
    ...row,
    vehiculos: Array.isArray(row.vehiculos) ? row.vehiculos[0] ?? null : row.vehiculos,
    orden_items: row.orden_items ?? [],
  }));
}

type OrdenDetalleRow = {
  id: string;
  numero: string;
  cliente_id: string;
  vehiculo_id: string;
  tecnico_id: string | null;
  fecha: string;
  estado: "pendiente" | "en_proceso" | "completada" | "entregada" | "cancelada";
  kilometraje: number | null;
  kilometraje_final: number | null;
  subtotal: number;
  descuento: number;
  descuento_puntos: number;
  puntos_usados: number;
  total: number;
  notas: string | null;
  observaciones_tecnicas: string | null;
  proximo_mantenimiento_fecha: string | null;
  proximo_mantenimiento_km: number | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  created_at: string;
  updated_at: string;
  pdf_url: string | null;
  pdf_storage_path: string | null;
  pdf_generated_at: string | null;
  clientes:
  | {
    id: string;
    nombres: string;
    apellidos: string;
    telefono: string;
    whatsapp: string | null;
    email: string | null;
  }
  | {
    id: string;
    nombres: string;
    apellidos: string;
    telefono: string;
    whatsapp: string | null;
    email: string | null;
  }[]
  | null;
  vehiculos:
  | {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
    anio: number | null;
    color: string | null;
    combustible: string | null;
    transmision: string | null;
    kilometraje_actual: number | null;
  }
  | {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
    anio: number | null;
    color: string | null;
    combustible: string | null;
    transmision: string | null;
    kilometraje_actual: number | null;
  }[]
  | null;
  tecnico:
  | {
    id: string;
    rol: string;
  }
  | {
    id: string;
    rol: string;
  }[]
  | null;
  orden_items: OrdenItem[] | null;
};

export async function getOrdenDetalle(ordenId: string): Promise<OrdenDetalle> {
  const { supabase, perfil } = await getPerfilActual();

  if (perfil.rol === "tecnico") {
    const { data: asignacion, error: asignacionError } = await supabase
      .from("ordenes_tecnicos")
      .select("orden_id")
      .eq("orden_id", ordenId)
      .eq("tecnico_id", perfil.id)
      .maybeSingle();

    if (asignacionError || !asignacion) {
      throw new Error("No autorizado para ver esta orden");
    }
  }

  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .select(`
      *,
      clientes (
        id,
        nombres,
        apellidos,
        telefono,
        whatsapp,
        email
      ),
      vehiculos (
        id,
        placa,
        marca,
        modelo,
        anio,
        color,
        combustible,
        transmision,
        kilometraje_actual
      ),
      orden_items (
        *
      )
    `)
    .eq("id", ordenId)
    .single();

  if (error || !data) {
    console.error("Error al obtener detalle de la orden:", error?.message);
    throw new Error("No se pudo obtener el detalle de la orden");
  }

  const row = data as OrdenDetalleRow;

  return {
    ...row,
    descuento_puntos: row.descuento_puntos ?? 0,
    puntos_usados: row.puntos_usados ?? 0,
    pdf_url: row.pdf_url ?? null,
    pdf_storage_path: row.pdf_storage_path ?? null,
    pdf_generated_at: row.pdf_generated_at ?? null,
    clientes: Array.isArray(row.clientes) ? row.clientes[0] ?? null : row.clientes,
    vehiculos: Array.isArray(row.vehiculos) ? row.vehiculos[0] ?? null : row.vehiculos,
    tecnico: null,
    orden_items: row.orden_items ?? [],
  };
}


export async function getOrdenEditable(ordenId: string): Promise<OrdenEditable> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .select(
      `
      id,
      cliente_id,
      vehiculo_id,
      tecnico_id,
      kilometraje,
      kilometraje_final,
      descuento,
      notas,
      observaciones_tecnicas,
      proximo_mantenimiento_fecha,
      proximo_mantenimiento_km,
      hora_inicio,
      hora_fin,
      orden_items (
        id,
        servicio_id,
        producto_id,
        tipo_item,
        nombre_item,
        cantidad,
        precio_unitario,
        total
      )
    `
    )
    .eq("id", ordenId)
    .single();

  if (error || !data) {
    console.error("Error al obtener orden editable:", error?.message);
    throw new Error("No se pudo cargar la orden para editar");
  }

  const row = data as OrdenEditableRow;

  return {
    id: row.id,
    cliente_id: row.cliente_id,
    vehiculo_id: row.vehiculo_id,
    tecnico_id: row.tecnico_id,
    kilometraje: row.kilometraje,
    kilometraje_final: row.kilometraje_final,
    descuento: row.descuento,
    notas: row.notas,
    observaciones_tecnicas: row.observaciones_tecnicas,
    proximo_mantenimiento_fecha: row.proximo_mantenimiento_fecha,
    proximo_mantenimiento_km: row.proximo_mantenimiento_km,
    hora_inicio: row.hora_inicio,
    hora_fin: row.hora_fin,
    items: (row.orden_items ?? []).map((item) => ({
      id: item.id,
      tipo_item: item.tipo_item,
      servicio_id: item.servicio_id,
      producto_id: item.producto_id,
      nombre_item: item.nombre_item,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      total: item.total,
    })),
  };
}

type OrdenRepetirItemRow = {
  servicio_id: string | null;
  producto_id: string | null;
  tipo_item: "servicio" | "producto";
  nombre_item: string;
  cantidad: number;
  precio_unitario: number;
};

export async function repetirOrden(ordenId: string): Promise<OrdenTrabajo> {
  const supabase = await requireAdminOrRecepcion();

  const { data: ordenOriginal, error: ordenError } = await supabase
    .from("ordenes_trabajo")
    .select(`
      id,
      cliente_id,
      vehiculo_id,
      tecnico_id,
      kilometraje,
      descuento,
      notas,
      proximo_mantenimiento_fecha,
      proximo_mantenimiento_km
    `)
    .eq("id", ordenId)
    .single();

  if (ordenError || !ordenOriginal) {
    console.error("Error obteniendo orden original para repetir:", ordenError?.message);
    throw new Error("No se pudo obtener la orden original");
  }

  const { data: itemsOriginales, error: itemsError } = await supabase
    .from("orden_items")
    .select(`
      servicio_id,
      producto_id,
      tipo_item,
      nombre_item,
      cantidad,
      precio_unitario
    `)
    .eq("orden_id", ordenId)
    .order("created_at", { ascending: true });

  if (itemsError) {
    console.error("Error obteniendo items de la orden original:", itemsError.message);
    throw new Error("No se pudieron obtener los items de la orden");
  }

  if (!itemsOriginales || itemsOriginales.length === 0) {
    throw new Error("La orden original no tiene items para repetir");
  }

  const { data: tecnicosAsignados, error: tecnicosError } = await supabase
    .from("ordenes_tecnicos")
    .select("tecnico_id, es_principal")
    .eq("orden_id", ordenId)
    .order("es_principal", { ascending: false });

  if (tecnicosError) {
    console.error("Error obteniendo técnicos asignados para repetir:", tecnicosError.message);
    throw new Error("No se pudieron obtener los técnicos de la orden");
  }

  const tecnicoPrincipalId =
    tecnicosAsignados?.find((item) => item.es_principal)?.tecnico_id ||
    ordenOriginal.tecnico_id ||
    "";

  const tecnicosIds = (tecnicosAsignados ?? []).map((item) => item.tecnico_id);

  const items = (itemsOriginales ?? []) as OrdenRepetirItemRow[];

  const payload: OrdenFormData = {
    cliente_id: ordenOriginal.cliente_id,
    vehiculo_id: ordenOriginal.vehiculo_id,
    tecnico_id: tecnicoPrincipalId,
    tecnicos_ids: tecnicosIds,
    kilometraje: ordenOriginal.kilometraje?.toString() ?? "",
    descuento: "",
    notas: ordenOriginal.notas ?? "",
    proximo_mantenimiento_fecha: "",
    proximo_mantenimiento_km: "",
    puntos_canjear: "",
    descuento_puntos: "",
    items: items.map((item) => {
      const cantidad = Number(item.cantidad);
      const precioUnitario = Number(item.precio_unitario);

      return {
        tipo_item: item.tipo_item,
        servicio_id: item.tipo_item === "servicio" ? item.servicio_id ?? "" : "",
        producto_id: item.tipo_item === "producto" ? item.producto_id ?? "" : "",
        nombre_item: item.nombre_item,
        cantidad: cantidad.toString(),
        precio_unitario: precioUnitario.toString(),
        total: (cantidad * precioUnitario).toString(),
      };
    }),
  };

  const nuevaOrden = await createOrden(payload);

  return nuevaOrden as OrdenTrabajo;
}

export async function iniciarTrabajoOrden(ordenId: string) {
  const { supabase, perfil } = await getPerfilActual();

  if (perfil.rol !== "tecnico") {
    throw new Error("No autorizado");
  }

  const { data: asignacion, error: asignacionError } = await supabase
    .from("ordenes_tecnicos")
    .select("orden_id")
    .eq("orden_id", ordenId)
    .eq("tecnico_id", perfil.id)
    .maybeSingle();

  if (asignacionError || !asignacion) {
    throw new Error("No se encontró la orden asignada");
  }

  const { data: tareasTecnico, error: tareasTecnicoError } = await supabase
    .from("ordenes_tareas_tecnicos")
    .select("id, estado, hora_inicio")
    .eq("orden_id", ordenId)
    .eq("tecnico_id", perfil.id);

  if (tareasTecnicoError) {
    console.error("Error obteniendo tareas del técnico:", tareasTecnicoError.message);
    throw new Error("No se pudieron validar las tareas del técnico");
  }

  const tareas = (tareasTecnico ?? []) as {
    id: string;
    estado: TareaEstado;
    hora_inicio: string | null;
  }[];

  if (tareas.length === 0) {
    throw new Error("No tienes tareas asignadas en esta orden");
  }

  const primeraPendiente = tareas.find((tarea) => tarea.estado === "pendiente");

  if (primeraPendiente) {
    await updateTareaOrdenEstado(primeraPendiente.id, "en_proceso");
  } else {
    await recalcularEstadoOrdenPorTareas(supabase, ordenId);
  }

  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .select("*")
    .eq("id", ordenId)
    .single();

  if (error) {
    console.error("Error al obtener orden luego de iniciar:", error.message);
    throw new Error("No se pudo iniciar el trabajo");
  }

  return data;
}

export async function finalizarTrabajoOrden(
  ordenId: string,
  payload: {
    observaciones_tecnicas: string;
    kilometraje_final: string;
    proximo_mantenimiento_fecha: string;
    proximo_mantenimiento_km: string;
  }
) {
  const { supabase, perfil } = await getPerfilActual();

  if (perfil.rol !== "tecnico") {
    throw new Error("No autorizado");
  }

  const { data: asignacion, error: asignacionError } = await supabase
    .from("ordenes_tecnicos")
    .select("orden_id")
    .eq("orden_id", ordenId)
    .eq("tecnico_id", perfil.id)
    .maybeSingle();

  if (asignacionError || !asignacion) {
    throw new Error("No se encontró la orden asignada");
  }

  const { data: tareasData, error: tareasError } = await supabase
    .from("ordenes_tareas_tecnicos")
    .select("id, estado")
    .eq("orden_id", ordenId);

  if (tareasError) {
    console.error("Error validando tareas antes de finalizar:", tareasError.message);
    throw new Error("No se pudieron validar las tareas de la orden");
  }

  const tareas = (tareasData ?? []) as { id: string; estado: TareaEstado }[];

  if (tareas.length > 0 && tareas.some((tarea) => tarea.estado !== "completada")) {
    throw new Error("Primero debes completar todas las tareas de la orden");
  }

  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .update({
      estado: "completada",
      observaciones_tecnicas: payload.observaciones_tecnicas.trim() || null,
      kilometraje_final: payload.kilometraje_final.trim()
        ? Number(payload.kilometraje_final)
        : null,
      proximo_mantenimiento_fecha:
        payload.proximo_mantenimiento_fecha.trim() || null,
      proximo_mantenimiento_km: payload.proximo_mantenimiento_km.trim()
        ? Number(payload.proximo_mantenimiento_km)
        : null,
      hora_fin: new Date().toISOString(),
    })
    .eq("id", ordenId)
    .select()
    .single();

  if (error) {
    console.error("Error al finalizar trabajo:", error.message);
    throw new Error("No se pudo finalizar el trabajo");
  }

  const { data: itemsOrden } = await supabase
    .from("orden_items")
    .select("*")
    .eq("orden_id", ordenId);

  const { data: ordenInfo } = await supabase
    .from("ordenes_trabajo")
    .select("cliente_id, vehiculo_id")
    .eq("id", ordenId)
    .single();

  if (itemsOrden && ordenInfo) {
    const puntos = calcularPuntosOrden(itemsOrden);

    if (puntos > 0) {
      await registrarPuntosCliente({
        clienteId: ordenInfo.cliente_id,
        vehiculoId: ordenInfo.vehiculo_id,
        ordenId,
        puntos,
        motivo: "Puntos por servicios realizados",
      });
    }
  }

  return data;
}

type OrdenEditableRow = {
  id: string;
  cliente_id: string;
  vehiculo_id: string;
  tecnico_id: string | null;
  kilometraje: number | null;
  kilometraje_final: number | null;
  descuento: number;
  notas: string | null;
  observaciones_tecnicas: string | null;
  proximo_mantenimiento_fecha: string | null;
  proximo_mantenimiento_km: number | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  orden_items:
  | {
    id: string;
    servicio_id: string | null;
    producto_id: string | null;
    tipo_item: "servicio" | "producto";
    nombre_item: string;
    cantidad: number;
    precio_unitario: number;
    total: number;
  }[]
  | null;
};


export async function getMiRolOrdenes() {
  const { perfil } = await getPerfilActual();
  return perfil.rol;
}

export async function getClientesForOrden(): Promise<Cliente[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al obtener clientes para orden:", error.message);
    throw new Error("No se pudieron cargar los clientes");
  }

  return (data ?? []) as Cliente[];
}

export async function getOrdenesTecnico(): Promise<OrdenTecnicoItem[]> {
  const { perfil } = await getPerfilActual();
  const userId = perfil.id;
  const supabase = await createClient();

  const { data: asignacionesData, error: asignacionesError } = await supabase
    .from("ordenes_tecnicos")
    .select("orden_id")
    .eq("tecnico_id", userId);

  if (asignacionesError) {
    console.error(
      "Error obteniendo asignaciones del técnico:",
      asignacionesError.message
    );
    throw new Error("No se pudieron obtener las asignaciones del técnico");
  }

  const ordenIds = Array.from(
    new Set(
      ((asignacionesData ?? []) as OrdenTecnicoAsignacionRow[]).map(
        (item: OrdenTecnicoAsignacionRow) => item.orden_id
      )
    )
  );

  if (ordenIds.length === 0) {
    return [];
  }

  const { data: ordenesData, error: ordenesError } = await supabase
    .from("ordenes_trabajo")
    .select("id, estado, cliente_id, vehiculo_id")
    .in("id", ordenIds);

  if (ordenesError) {
    console.error("Error obteniendo órdenes del técnico:", ordenesError.message);
    throw new Error("No se pudieron obtener las órdenes");
  }

  const ordenesBase = (ordenesData ?? []) as OrdenBaseRow[];

  const clienteIds = Array.from(
    new Set(
      ordenesBase
        .map((orden) => orden.cliente_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const vehiculoIds = Array.from(
    new Set(
      ordenesBase
        .map((orden) => orden.vehiculo_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [
    { data: clientesData, error: clientesError },
    { data: vehiculosData, error: vehiculosError },
  ] = await Promise.all([
    clienteIds.length > 0
      ? supabase
        .from("clientes")
        .select("id, nombres, apellidos, telefono")
        .in("id", clienteIds)
      : Promise.resolve({ data: [], error: null }),
    vehiculoIds.length > 0
      ? supabase
        .from("vehiculos")
        .select("id, placa, marca, modelo")
        .in("id", vehiculoIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (clientesError) {
    console.error("Error obteniendo clientes de órdenes:", clientesError.message);
    throw new Error("No se pudieron obtener los clientes");
  }

  if (vehiculosError) {
    console.error(
      "Error obteniendo vehículos de órdenes:",
      vehiculosError.message
    );
    throw new Error("No se pudieron obtener los vehículos");
  }

  const clientes = new Map(
    ((clientesData ?? []) as ClienteRow[]).map((cliente) => [cliente.id, cliente])
  );

  const vehiculos = new Map(
    ((vehiculosData ?? []) as VehiculoRow[]).map((vehiculo) => [vehiculo.id, vehiculo])
  );

  const prioridad: Record<EstadoOrdenTecnico, number> = {
    en_proceso: 1,
    pendiente: 2,
    completada: 3,
    entregada: 4,
    cancelada: 5,
  };

  const ordenes: OrdenTecnicoItem[] = ordenesBase.map((orden) => {
    const cliente = orden.cliente_id ? clientes.get(orden.cliente_id) ?? null : null;
    const vehiculo = orden.vehiculo_id ? vehiculos.get(orden.vehiculo_id) ?? null : null;

    return {
      id: orden.id,
      estado: orden.estado,
      cliente: cliente
        ? {
          nombre: `${cliente.nombres ?? ""} ${cliente.apellidos ?? ""}`.trim(),
          telefono: cliente.telefono,
        }
        : null,
      vehiculo: vehiculo
        ? {
          placa: vehiculo.placa,
          marca: vehiculo.marca,
          modelo: vehiculo.modelo,
        }
        : null,
    };
  });

  return ordenes.sort((a, b) => prioridad[a.estado] - prioridad[b.estado]);
}

export async function guardarAsignacionesTecnicosOrden({
  ordenId,
  tecnicoPrincipalId,
  tecnicosIds,
}: GuardarAsignacionTecnicoInput) {
  const supabase = await createClient();

  const idsUnicos = Array.from(
    new Set(
      [tecnicoPrincipalId, ...tecnicosIds].filter(
        (id): id is string => Boolean(id)
      )
    )
  );

  const { error: deleteError } = await supabase
    .from("ordenes_tecnicos")
    .delete()
    .eq("orden_id", ordenId);

  if (deleteError) {
    console.error(
      "Error eliminando asignaciones anteriores:",
      deleteError.message
    );
    throw new Error("No se pudieron actualizar los técnicos de la orden");
  }

  if (idsUnicos.length === 0) {
    return { success: true };
  }

  const rows = idsUnicos.map((tecnicoId) => ({
    orden_id: ordenId,
    tecnico_id: tecnicoId,
    es_principal: tecnicoPrincipalId === tecnicoId,
  }));

  const { error: insertError } = await supabase
    .from("ordenes_tecnicos")
    .insert(rows);

  if (insertError) {
    console.error("Error guardando técnicos de la orden:", insertError.message);
    throw new Error("No se pudieron guardar los técnicos de la orden");
  }

  return { success: true };
}

type TecnicoOrdenRow = {
  id: string;
  orden_id: string;
  tecnico_id: string;
  es_principal: boolean;
  tecnico:
  | {
    id: string;
    nombre: string;
  }
  | {
    id: string;
    nombre: string;
  }[]
  | null;
};

export async function getTecnicosAsignadosOrden(ordenId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ordenes_tecnicos")
    .select(`
      id,
      orden_id,
      tecnico_id,
      es_principal,
      tecnico:usuarios_app!ordenes_tecnicos_tecnico_id_fkey (
        id,
        nombre
      )
    `)
    .eq("orden_id", ordenId)
    .order("es_principal", { ascending: false });

  if (error) {
    console.error(
      "Error obteniendo técnicos asignados de la orden:",
      error.message
    );
    throw new Error("No se pudieron obtener los técnicos asignados");
  }

  return (data ?? []) as TecnicoOrdenRow[];
}

export async function getTareasByOrden(
  ordenId: string
): Promise<
  (OrdenTareaTecnico & {
    tecnico: {
      id: string;
      nombre: string;
    } | null;
  })[]
> {
  const { supabase, perfil } = await getPerfilActual();

  if (perfil.rol === "tecnico") {
    const { data: asignacion, error: asignacionError } = await supabase
      .from("ordenes_tecnicos")
      .select("orden_id")
      .eq("orden_id", ordenId)
      .eq("tecnico_id", perfil.id)
      .maybeSingle();

    if (asignacionError || !asignacion) {
      throw new Error("No autorizado para ver las tareas de esta orden");
    }
  }

  const { data, error } = await supabase
    .from("ordenes_tareas_tecnicos")
    .select(`
      *,
      usuarios_app (
        id,
        nombre
      )
    `)
    .eq("orden_id", ordenId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error al obtener tareas de la orden:", error.message);
    throw new Error("No se pudieron obtener las tareas de la orden");
  }

  const rows = (data ?? []) as (
    OrdenTareaTecnico & {
      usuarios_app:
      | {
        id: string;
        nombre: string;
      }
      | {
        id: string;
        nombre: string;
      }[]
      | null;
    }
  )[];

  return rows.map((row) => {
    const usuario = Array.isArray(row.usuarios_app)
      ? row.usuarios_app[0] ?? null
      : row.usuarios_app;

    return {
      ...row,
      tecnico: usuario
        ? {
          id: usuario.id,
          nombre: usuario.nombre,
        }
        : null,
    };
  });
}

export async function createTareaOrden(

  ordenId: string,
  payload: OrdenTareaTecnicoFormData
) {

  const { supabase, perfil } = await getPerfilActual();

  if (perfil.rol !== "admin" && perfil.rol !== "recepcion") {
    throw new Error("No autorizado para crear tareas");
  }

  const tecnicoId = payload.tecnico_id.trim();
  const tipoTarea = payload.tipo_tarea.trim();
  const descripcion = payload.descripcion.trim();

  await recalcularEstadoOrdenPorTareas(supabase, ordenId);

  if (!tecnicoId) {
    throw new Error("Debes seleccionar un técnico");
  }

  if (!tipoTarea) {
    throw new Error("Debes seleccionar un tipo de tarea");
  }

  const { data: tecnicoAsignado, error: tecnicoAsignadoError } = await supabase
    .from("ordenes_tecnicos")
    .select("orden_id")
    .eq("orden_id", ordenId)
    .eq("tecnico_id", tecnicoId)
    .maybeSingle();

  if (tecnicoAsignadoError || !tecnicoAsignado) {
    throw new Error("El técnico debe estar asignado a la orden");
  }

  const { data, error } = await supabase
    .from("ordenes_tareas_tecnicos")
    .insert({
      orden_id: ordenId,
      tecnico_id: tecnicoId,
      tipo_tarea: tipoTarea,
      descripcion: descripcion || null,
      estado: payload.estado,
    })
    .select()
    .single();

  if (error) {
    console.error("Error al crear tarea de la orden:", error.message);
    throw new Error("No se pudo crear la tarea");
  }

  return data;
}

export async function getServiciosSugeridosPorHistorial(clienteId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orden_items")
    .select(`
      servicio_id,
      nombre_item,
      ordenes_trabajo!inner (
        cliente_id,
        created_at
      )
    `)
    .eq("ordenes_trabajo.cliente_id", clienteId)
    .not("servicio_id", "is", null);

  if (error) {
    console.error("Error historial servicios:", error);
    return [];
  }

  const conteo: Record<string, { nombre: string; cantidad: number }> = {};

  for (const item of data ?? []) {
    if (!item.servicio_id) continue;

    if (!conteo[item.servicio_id]) {
      conteo[item.servicio_id] = {
        nombre: item.nombre_item,
        cantidad: 0,
      };
    }

    conteo[item.servicio_id].cantidad += 1;
  }

  return Object.entries(conteo)
    .sort((a, b) => b[1].cantidad - a[1].cantidad)
    .slice(0, 3)
    .map(([id, value]) => ({
      servicio_id: id,
      nombre: value.nombre,
      veces: value.cantidad,
    }));
}

export async function cancelarYEliminarOrden(ordenId: string) {
  const supabase = await requireAdminOrRecepcion();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autorizado");
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("usuarios_app")
    .select("rol, activo")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();

  if (perfilError || !perfil) {
    throw new Error("No autorizado");
  }

  const { data: ordenAntes, error: ordenAntesError } = await supabase
    .from("ordenes_trabajo")
    .select("id, estado")
    .eq("id", ordenId)
    .single();

  if (ordenAntesError || !ordenAntes) {
    throw new Error("No se encontró la orden.");
  }

  const validacionTransicion = validarTransicionEstadoOrden({
    rol: perfil.rol as "admin" | "recepcion" | "tecnico",
    estadoActual: ordenAntes.estado,
    nuevoEstado: "cancelada",
  });

  if (!validacionTransicion.ok) {
    throw new Error(validacionTransicion.errores.join(" | "));
  }

  const { error: updateError } = await supabase
    .from("ordenes_trabajo")
    .update({
      estado: "cancelada",
      hora_fin:
        ordenAntes.estado === "pendiente" || ordenAntes.estado === "en_proceso"
          ? null
          : new Date().toISOString(),
    })
    .eq("id", ordenId);

  if (updateError) {
    throw new Error("No se pudo marcar la orden como cancelada.");
  }

  await deleteOrdenCancelada(ordenId);

  return { success: true };
}

function resolveCuentaPorMetodoPago(
  metodoPago: "efectivo" | "transferencia" | "tarjeta" | "mixto"
): "caja" | "banco" | "tarjeta_por_cobrar" {
  switch (metodoPago) {
    case "efectivo":
      return "caja";
    case "transferencia":
      return "banco";
    case "tarjeta":
      return "tarjeta_por_cobrar";
    case "mixto":
      throw new Error(
        "El pago mixto debe dividirse en pagos separados para registrar bien caja y banco"
      );
  }
}

export async function registrarPagoOrden({
  ordenId,
  monto,
  metodo_pago,
}: {
  ordenId: string;
  monto: number;
  metodo_pago: "efectivo" | "transferencia" | "tarjeta" | "mixto";
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuario no autenticado");

  const { data: perfil } = await supabase
    .from("usuarios_app")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!perfil || (perfil.rol !== "admin" && perfil.rol !== "recepcion")) {
    throw new Error("No autorizado para cobrar");
  }

  const cuenta = resolveCuentaPorMetodoPago(metodo_pago);

  const { data: caja, error: cajaError } = await supabase
    .from("cajas")
    .select("*")
    .eq("estado", "abierta")
    .single();

  if (cajaError || !caja) {
    throw new Error("No hay caja abierta");
  }

  const { data: orden, error: ordenError } = await supabase
    .from("ordenes_trabajo")
    .select("id, numero, total, estado")
    .eq("id", ordenId)
    .single();

  if (ordenError || !orden) {
    throw new Error("Orden no encontrada");
  }

  if (orden.estado !== "completada") {
    throw new Error("Solo se pueden cobrar órdenes completadas");
  }

  const { data: pagosPrevios, error: pagosPreviosError } = await supabase
    .from("orden_pagos")
    .select("monto")
    .eq("orden_id", ordenId);

  if (pagosPreviosError) {
    throw new Error("No se pudieron validar los pagos previos");
  }

  const totalPagado =
    (pagosPrevios ?? []).reduce((acc, p) => acc + Number(p.monto), 0) || 0;

  const saldoPendiente = Number(orden.total) - totalPagado;

  if (monto <= 0) {
    throw new Error("El monto debe ser mayor a 0");
  }

  if (monto > saldoPendiente) {
    throw new Error("No puedes cobrar más del saldo pendiente");
  }

  const esAbono = monto < saldoPendiente;
  const categoriaMovimiento = esAbono ? "abono_orden" : "orden";

  const { error: pagoError } = await supabase
    .from("orden_pagos")
    .insert({
      orden_id: ordenId,
      caja_id: caja.id,
      monto,
      metodo_pago,
      creado_por: user.id,
      cuenta,
      origen_fondo: "negocio",
      naturaleza: "ingreso_operativo",
      observacion: `Cobro de orden ${orden.numero}`,
    });

  if (pagoError) {
    console.error("ERROR PAGO:", pagoError);
    throw new Error(pagoError.message);
  }

  const { error: movError } = await supabase
    .from("caja_movimientos")
    .insert({
      caja_id: caja.id,
      tipo: "ingreso",
      categoria: categoriaMovimiento,
      monto,
      descripcion: `Pago orden ${orden.numero}`,
      referencia_tipo: "orden",
      referencia_id: ordenId,
      metodo_pago,
      cuenta,
      origen_fondo: "negocio",
      naturaleza: "ingreso_operativo",
      creado_por: user.id,
    });

  if (movError) {
    console.error("ERROR MOVIMIENTO CAJA:", movError);
    throw new Error("Error registrando en caja");
  }

  const nuevoTotalPagado = totalPagado + monto;

  if (nuevoTotalPagado >= Number(orden.total)) {
    const { error: updateOrdenError } = await supabase
      .from("ordenes_trabajo")
      .update({ estado: "entregada" })
      .eq("id", ordenId);

    if (updateOrdenError) {
      throw new Error("Se registró el pago, pero no se pudo actualizar la orden");
    }
  }

  return {
    ok: true,
    saldo_restante: Number(orden.total) - nuevoTotalPagado,
  };
}