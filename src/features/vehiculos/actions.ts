"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  Cliente,
  HistorialVehiculoOrden,
  VehiculoConCliente,
  VehiculoDetalle,
  VehiculoFormData,
} from "@/types";

export async function getClientesForSelect(): Promise<Cliente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nombres", { ascending: true });

  if (error) {
    console.error("Error al obtener clientes:", error.message);
    throw new Error("No se pudieron cargar los clientes");
  }

  return data ?? [];
}

type VehiculoRow = {
  id: string;
  cliente_id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number | null;
  color: string | null;
  combustible: string | null;
  transmision: string | null;
  kilometraje_actual: number | null;
  vin_chasis: string | null;
  notas: string | null;
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
};

export async function getVehiculos(): Promise<VehiculoConCliente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehiculos")
    .select(
      `
      *,
      clientes (
        id,
        nombres,
        apellidos,
        telefono
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al obtener vehículos:", error.message);
    throw new Error("No se pudieron cargar los vehículos");
  }

  const rows = (data ?? []) as VehiculoRow[];

  return rows.map((row) => ({
    ...row,
    clientes: Array.isArray(row.clientes) ? row.clientes[0] ?? null : row.clientes,
  })) as VehiculoConCliente[];
}

export async function createVehiculo(payload: VehiculoFormData) {
  const dataToInsert = {
    cliente_id: payload.cliente_id,
    placa: payload.placa.trim().toUpperCase(),
    marca: payload.marca.trim(),
    modelo: payload.modelo.trim(),
    anio: payload.anio.trim() ? Number(payload.anio) : null,
    color: payload.color.trim() || null,
    combustible: payload.combustible.trim() || null,
    transmision: payload.transmision.trim() || null,
    kilometraje_actual: payload.kilometraje_actual.trim()
      ? Number(payload.kilometraje_actual)
      : null,
    vin_chasis: payload.vin_chasis.trim() || null,
    notas: payload.notas.trim() || null,
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehiculos")
    .insert([dataToInsert])
    .select()
    .single();

  if (error) {
    console.error("Error al crear vehículo:", error.message);
    throw new Error(error.message || "No se pudo crear el vehículo");
  }

  return data;
}

type VehiculoDetalleRow = {
  id: string;
  cliente_id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number | null;
  color: string | null;
  combustible: string | null;
  transmision: string | null;
  kilometraje_actual: number | null;
  vin_chasis: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
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
};

export async function getVehiculoDetalle(vehiculoId: string): Promise<VehiculoDetalle> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehiculos")
    .select(
      `
      *,
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
    .eq("id", vehiculoId)
    .single();

  if (error || !data) {
    console.error("Error al obtener detalle del vehículo:", error?.message);
    throw new Error("No se pudo obtener el detalle del vehículo");
  }

  const row = data as VehiculoDetalleRow;

  return {
    ...row,
    clientes: Array.isArray(row.clientes) ? row.clientes[0] ?? null : row.clientes,
  };
}

type HistorialVehiculoRow = {
  id: string;
  numero: string;
  cliente_id: string;
  vehiculo_id: string;
  fecha: string;
  estado: "pendiente" | "en_proceso" | "completada" | "entregada" | "cancelada";
  kilometraje: number | null;
  subtotal: number;
  descuento: number;
  total: number;
  notas: string | null;
  proximo_mantenimiento_fecha: string | null;
  proximo_mantenimiento_km: number | null;
  created_at: string;
  updated_at: string;
  orden_items: {
    id: string;
    orden_id: string;
    tipo_item: "servicio" | "producto";
    servicio_id: string | null;
    producto_id: string | null;
    nombre_item: string;
    cantidad: number;
    precio_unitario: number;
    total: number;
    created_at: string;
    updated_at: string;
  }[] | null;
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
};

export async function getHistorialVehiculo(
  vehiculoId: string
): Promise<HistorialVehiculoOrden[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .select(
      `
      *,
      orden_items (
        *
      ),
      clientes (
        id,
        nombres,
        apellidos,
        telefono
      )
    `
    )
    .eq("vehiculo_id", vehiculoId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al obtener historial del vehículo:", error.message);
    throw new Error("No se pudo cargar el historial del vehículo");
  }

  const rows = (data ?? []) as HistorialVehiculoRow[];

  return rows.map((row) => ({
    ...row,
    orden_items: row.orden_items ?? [],
    clientes: Array.isArray(row.clientes) ? row.clientes[0] ?? null : row.clientes,
  })) as HistorialVehiculoOrden[];
}