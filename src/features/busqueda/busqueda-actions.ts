"use server";

import { createClient } from "@/lib/supabase/server";
import type { ClienteDetalle, Vehiculo } from "@/types";

type ClienteBusqueda = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  whatsapp: string | null;
  email: string | null;
};

type UltimaOrdenBusqueda = {
  id: string;
  numero: string | null;
  fecha: string | null;
  estado: string | null;
  kilometraje: number | null;
  total: number | null;
};

type RecordatorioBusqueda = {
  id: string;
  tipo: string;
  fecha_programada: string | null;
  kilometraje_programado: number | null;
  estado: string | null;
};

type VehiculoBusquedaRow = {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number | null;
  kilometraje_actual: number | null;
  cliente_id: string | null;
  clientes: ClienteBusqueda | ClienteBusqueda[] | null;
};

export type BusquedaResultadoNormalizado = {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number | null;
  kilometraje_actual: number | null;
  cliente: ClienteBusqueda | null;
  coincidencia: "placa" | "telefono" | "nombre";
  ultima_orden: UltimaOrdenBusqueda | null;
  proximo_recordatorio: RecordatorioBusqueda | null;
};

function normalizarTexto(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizarPlaca(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function mapVehiculo(
  item: VehiculoBusquedaRow,
  coincidencia: BusquedaResultadoNormalizado["coincidencia"]
): BusquedaResultadoNormalizado {
  const cliente = Array.isArray(item.clientes)
    ? item.clientes[0] ?? null
    : item.clientes ?? null;

  return {
    id: item.id,
    placa: item.placa,
    marca: item.marca,
    modelo: item.modelo,
    anio: item.anio,
    kilometraje_actual: item.kilometraje_actual,
    cliente,
    coincidencia,
    ultima_orden: null,
    proximo_recordatorio: null,
  };
}

function uniqueById(rows: BusquedaResultadoNormalizado[]) {
  const map = new Map<string, BusquedaResultadoNormalizado>();

  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, row);
    }
  }

  return Array.from(map.values());
}

export async function buscarVehiculosYClientes(
  term: string
): Promise<BusquedaResultadoNormalizado[]> {
  const value = normalizarTexto(term);

  if (!value || value.length < 2) return [];

  const supabase = await createClient();

  const likeValue = `%${value}%`;
  const isNumeric = /^\d+$/.test(value);

  const placaNormalizada = normalizarPlaca(value);
  const placaLikeValue = `%${placaNormalizada}%`;
  const isPossiblePlate = /^[A-Z0-9-]+$/.test(value);

  const placaExactaQuery = supabase
    .from("vehiculos")
    .select(
      `
      id,
      placa,
      marca,
      modelo,
      anio,
      kilometraje_actual,
      cliente_id,
      clientes (
        id,
        nombres,
        apellidos,
        telefono,
        whatsapp,
        email
      )
      `
    )
    .ilike("placa", placaNormalizada)
    .limit(10);

  const placaParcialQuery = supabase
    .from("vehiculos")
    .select(
      `
      id,
      placa,
      marca,
      modelo,
      anio,
      kilometraje_actual,
      cliente_id,
      clientes (
        id,
        nombres,
        apellidos,
        telefono,
        whatsapp,
        email
      )
      `
    )
    .ilike("placa", placaLikeValue)
    .order("created_at", { ascending: false })
    .limit(15);

  const clientesQuery = isNumeric
    ? supabase
      .from("clientes")
      .select("id")
      .ilike("telefono", likeValue)
      .limit(15)
    : supabase
      .from("clientes")
      .select("id")
      .or(`nombres.ilike.${likeValue},apellidos.ilike.${likeValue}`)
      .limit(15);

  const [placaExactaResponse, placaParcialResponse, clientesResponse] =
    await Promise.all([placaExactaQuery, placaParcialQuery, clientesQuery]);

  if (placaExactaResponse.error) {
    console.error(
      "Error buscando vehículos por placa exacta:",
      placaExactaResponse.error.message
    );
    throw new Error("No se pudo realizar la búsqueda");
  }

  if (placaParcialResponse.error) {
    console.error(
      "Error buscando vehículos por placa:",
      placaParcialResponse.error.message
    );
    throw new Error("No se pudo realizar la búsqueda");
  }

  if (clientesResponse.error) {
    console.error(
      "Error buscando clientes relacionados:",
      clientesResponse.error.message
    );
    throw new Error("No se pudo realizar la búsqueda");
  }

  const vehiculosPorPlacaExacta = (
    placaExactaResponse.data ?? []
  ) as VehiculoBusquedaRow[];

  const vehiculosPorPlacaParcial = (
    placaParcialResponse.data ?? []
  ) as VehiculoBusquedaRow[];

  const resultadosPorPlaca = uniqueById([
    ...vehiculosPorPlacaExacta.map((item) => mapVehiculo(item, "placa")),
    ...vehiculosPorPlacaParcial.map((item) => mapVehiculo(item, "placa")),
  ]);

  if (isPossiblePlate && resultadosPorPlaca.length > 0) {
    return await enriquecerResultados(resultadosPorPlaca.slice(0, 15));
  }

  const clienteIds = (clientesResponse.data ?? []).map((item) => item.id);

  let vehiculosPorCliente: VehiculoBusquedaRow[] = [];
  const tipoCoincidenciaCliente: BusquedaResultadoNormalizado["coincidencia"] =
    isNumeric ? "telefono" : "nombre";

  if (clienteIds.length > 0) {
    const { data, error } = await supabase
      .from("vehiculos")
      .select(
        `
        id,
        placa,
        marca,
        modelo,
        anio,
        kilometraje_actual,
        cliente_id,
        clientes (
          id,
          nombres,
          apellidos,
          telefono,
          whatsapp,
          email
        )
        `
      )
      .in("cliente_id", clienteIds)
      .order("created_at", { ascending: false })
      .limit(15);

    if (error) {
      console.error("Error buscando vehículos por cliente:", error.message);
      throw new Error("No se pudo realizar la búsqueda");
    }

    vehiculosPorCliente = (data ?? []) as VehiculoBusquedaRow[];
  }

  const mezclados = uniqueById([
    ...resultadosPorPlaca,
    ...vehiculosPorCliente.map((item) => mapVehiculo(item, tipoCoincidenciaCliente)),
  ]).slice(0, 15);

  return await enriquecerResultados(mezclados);
}

async function enriquecerResultados(
  resultados: BusquedaResultadoNormalizado[]
): Promise<BusquedaResultadoNormalizado[]> {
  if (resultados.length === 0) return [];

  const supabase = await createClient();
  const vehiculoIds = resultados.map((item) => item.id);

  const [ordenesResponse, recordatoriosResponse] = await Promise.all([
    supabase
      .from("ordenes_trabajo")
      .select("id, numero, fecha, estado, kilometraje, total, vehiculo_id")
      .in("vehiculo_id", vehiculoIds)
      .order("fecha", { ascending: false })
      .limit(100),
    supabase
      .from("recordatorios")
      .select(
        "id, tipo, fecha_programada, kilometraje_programado, estado, vehiculo_id"
      )
      .in("vehiculo_id", vehiculoIds)
      .in("estado", ["pendiente", "programado"])
      .order("fecha_programada", { ascending: true })
      .limit(100),
  ]);

  if (ordenesResponse.error) {
    console.error(
      "Error obteniendo últimas órdenes de búsqueda:",
      ordenesResponse.error.message
    );
    throw new Error("No se pudo completar la búsqueda");
  }

  if (recordatoriosResponse.error) {
    console.error(
      "Error obteniendo recordatorios de búsqueda:",
      recordatoriosResponse.error.message
    );
    throw new Error("No se pudo completar la búsqueda");
  }

  const ordenesPorVehiculo = new Map<string, UltimaOrdenBusqueda>();
  for (const orden of ordenesResponse.data ?? []) {
    const vehiculoId = (orden as { vehiculo_id: string | null }).vehiculo_id;
    if (!vehiculoId) continue;
    if (!ordenesPorVehiculo.has(vehiculoId)) {
      ordenesPorVehiculo.set(vehiculoId, {
        id: orden.id,
        numero: orden.numero,
        fecha: orden.fecha,
        estado: orden.estado,
        kilometraje: orden.kilometraje,
        total: orden.total,
      });
    }
  }

  const recordatoriosPorVehiculo = new Map<string, RecordatorioBusqueda>();
  for (const recordatorio of recordatoriosResponse.data ?? []) {
    const vehiculoId = (recordatorio as { vehiculo_id: string | null }).vehiculo_id;
    if (!vehiculoId) continue;
    if (!recordatoriosPorVehiculo.has(vehiculoId)) {
      recordatoriosPorVehiculo.set(vehiculoId, {
        id: recordatorio.id,
        tipo: recordatorio.tipo,
        fecha_programada: recordatorio.fecha_programada,
        kilometraje_programado: recordatorio.kilometraje_programado,
        estado: recordatorio.estado,
      });
    }
  }

  return resultados.map((item) => ({
    ...item,
    ultima_orden: ordenesPorVehiculo.get(item.id) ?? null,
    proximo_recordatorio: recordatoriosPorVehiculo.get(item.id) ?? null,
  }));
}

export async function getClienteDetalle(
  clienteId: string
): Promise<ClienteDetalle> {
  const supabase = await createClient();

  const [
    { data: cliente, error: clienteError },
    { data: vehiculos, error: vehiculosError },
  ] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", clienteId).single(),
    supabase
      .from("vehiculos")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false }),
  ]);

  if (clienteError || !cliente) {
    console.error("Error al obtener cliente:", clienteError?.message);
    throw new Error("No se pudo obtener el cliente");
  }

  if (vehiculosError) {
    console.error(
      "Error al obtener vehículos del cliente:",
      vehiculosError.message
    );
    throw new Error("No se pudieron obtener los vehículos del cliente");
  }

  return {
    ...cliente,
    vehiculos: (vehiculos ?? []) as Vehiculo[],
  };
}