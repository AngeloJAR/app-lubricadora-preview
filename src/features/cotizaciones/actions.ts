"use server";

import { createClient } from "@/lib/supabase/server";
import type { CotizacionDetalle } from "@/types";
import { time } from "console";

function generarNumeroCotizacion() {
  return `COT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

type CrearCotizacionInput = {
  cliente_id: string;
  vehiculo_id?: string | null;
  notas?: string;
  validez_hasta?: string | null;
  descuento?: number;
  items: Array<{
    tipo_item: "servicio" | "producto";
    nombre_item: string;
    descripcion?: string | null;
    cantidad: number;
    precio_unitario: number;
  }>;
};

export async function crearCotizacion(input: CrearCotizacionInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sesión no válida");
  }

  const subtotal = input.items.reduce(
    (acc, item) => acc + Number(item.cantidad) * Number(item.precio_unitario),
    0
  );

  const descuento = Number(input.descuento || 0);
  const total = subtotal - descuento;

  const { data: cotizacion, error: cotizacionError } = await supabase
    .from("cotizaciones")
    .insert({
      numero: generarNumeroCotizacion(),
      cliente_id: input.cliente_id,
      vehiculo_id: input.vehiculo_id || null,
      notas: input.notas || null,
      validez_hasta: input.validez_hasta || null,
      subtotal,
      descuento,
      total,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (cotizacionError || !cotizacion) {
    throw new Error(cotizacionError?.message || "No se pudo crear la cotización");
  }

  const items = input.items.map((item) => ({
    cotizacion_id: cotizacion.id,
    tipo_item: item.tipo_item,
    nombre_item: item.nombre_item,
    descripcion: item.descripcion || null,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    total: Number(item.cantidad) * Number(item.precio_unitario),
  }));

  const { error: itemsError } = await supabase
    .from("cotizacion_items")
    .insert(items);

  if (itemsError) {
    throw new Error(itemsError.message || "No se pudieron guardar los items");
  }

  return cotizacion.id;
}

export async function getCotizacionDetalle(
  cotizacionId: string
): Promise<CotizacionDetalle> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cotizaciones")
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
        anio
      ),
      cotizacion_items (
        *
      )
    `)
    .eq("id", cotizacionId)
    .single();

  if (error || !data) {
    console.error("Error getCotizacionDetalle:", error);
    throw new Error(error?.message || "No se pudo obtener la cotización");
  }

  return {
    ...data,
    clientes: Array.isArray(data.clientes) ? data.clientes[0] ?? null : data.clientes,
    vehiculos: Array.isArray(data.vehiculos) ? data.vehiculos[0] ?? null : data.vehiculos,
    cotizacion_items: data.cotizacion_items ?? [],
  } as CotizacionDetalle;
}

export async function getCotizaciones() {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("cotizaciones")
      .select(`
        id,
        numero,
        fecha,
        estado,
        subtotal,
        descuento,
        total,
        validez_hasta,
        clientes (
          nombres,
          apellidos
        ),
        vehiculos (
          placa,
          marca,
          modelo
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getCotizaciones:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      throw new Error(error.message || "No se pudieron obtener las cotizaciones");
    }

    return data ?? [];
  } catch (err) {
    console.error("Fallo inesperado en getCotizaciones:", err);

    throw new Error(
      err instanceof Error
        ? err.message
        : "No se pudieron obtener las cotizaciones"
    );
  }
}

export async function updateCotizacionEstado(
  cotizacionId: string,
  estado: "borrador" | "enviada" | "aprobada" | "rechazada" | "vencida"
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("cotizaciones")
    .update({ estado })
    .eq("id", cotizacionId);

  if (error) {
    throw new Error(error.message || "No se pudo actualizar el estado");
  }

  return true;
}

export async function getClientesParaCotizacion() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombres, apellidos, telefono, whatsapp")
    .order("nombres", { ascending: true });

  if (error) {
    throw new Error("No se pudieron obtener los clientes");
  }

  return data ?? [];
}

export async function getVehiculosParaCotizacion(clienteId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("vehiculos")
    .select("id, cliente_id, placa, marca, modelo, anio")
    .order("placa", { ascending: true });

  if (clienteId) {
    query = query.eq("cliente_id", clienteId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("No se pudieron obtener los vehículos");
  }

  return data ?? [];
}

export async function crearOrdenDesdeCotizacion(cotizacionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sesión no válida");
  }

  console.time("crearOrdenDesdeCotizacion");
  const cotizacion = await getCotizacionDetalle(cotizacionId);

  console.time("get_cotizacion_detalle");

  if (!cotizacion) {
    throw new Error("Cotización no encontrada");
  }

  const numeroOrden = `OT-${new Date().getFullYear()}-${Date.now()
    .toString()
    .slice(-6)}`;

  console.time("insert_orden");

  const { data: orden, error: ordenError } = await supabase
    .from("ordenes_trabajo")
    .insert({
      numero: numeroOrden,
      cliente_id: cotizacion.cliente_id,
      vehiculo_id: cotizacion.vehiculo_id,
      fecha: new Date().toISOString(),
      estado: "pendiente",
      subtotal: cotizacion.subtotal,
      descuento: cotizacion.descuento,
      total: cotizacion.total,
      notas: cotizacion.notas,
    })
    .select("id")
    .single();

  console.timeEnd("insert_orden");

  if (ordenError || !orden) {
    throw new Error(
      ordenError?.message || "No se pudo crear la orden desde la cotización"
    );
  }

  const items = cotizacion.cotizacion_items.map((item) => ({
    orden_id: orden.id,
    tipo_item: item.tipo_item,
    nombre_item: item.nombre_item,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    total: item.total,
  }));

  console.time("insert_items");
  const { error: itemsError } = await supabase
    .from("orden_items")
    .insert(items);

  console.timeEnd("insert_items");
  if (itemsError) {
    console.error("Error items orden desde cotizacion:", itemsError);
    throw new Error(itemsError.message || "Error al copiar items a la orden");
  }

  console.time("update_cotizacion_estado");
  await supabase
    .from("cotizaciones")
    .update({ estado: "aprobada" })
    .eq("id", cotizacionId);
  console.timeEnd("update_cotizacion_estado");

  console.timeEnd("crearOrdenDesdeCotizacion");
  return orden.id;
}

export async function getServiciosParaCotizacion() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("servicios")
    .select("id, nombre, descripcion, precio_base, activo")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error(error.message || "No se pudieron obtener los servicios");
  }

  return data ?? [];
}

export async function getProductosParaCotizacion() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("productos")
    .select("id, nombre, categoria, marca, precio_venta, activo, notas, stock")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error(error.message || "No se pudieron obtener los productos");
  }

  return data ?? [];
}