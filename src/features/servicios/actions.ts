"use server";

import { createClient } from "@/lib/supabase/server";
import { SERVICIOS_ORDEN_BASE } from "@/features/ordenes/constants";
import type { Servicio, ServicioFormData } from "@/types";

export async function getServicios(): Promise<Servicio[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("servicios")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al obtener servicios:", error.message);
    throw new Error("No se pudieron cargar los servicios");
  }

  return data ?? [];
}

export async function createServicio(payload: ServicioFormData): Promise<Servicio> {
  const supabase = await createClient();

  const dataToInsert = {
    nombre: payload.nombre.trim(),
    categoria: payload.categoria.trim(),
    descripcion: payload.descripcion.trim() || null,
    precio_base: payload.precio_base.trim() ? Number(payload.precio_base) : 0,
    duracion_estimada_min: payload.duracion_estimada_min.trim()
      ? Number(payload.duracion_estimada_min)
      : null,
    activo: payload.activo,
  };

  const { data, error } = await supabase
    .from("servicios")
    .insert([dataToInsert])
    .select()
    .single();

  if (error) {
    console.error("Error al crear servicio:", error.message);
    throw new Error(error.message || "No se pudo crear el servicio");
  }

  return data as Servicio;
}

export async function updateServicio(
  servicioId: string,
  payload: ServicioFormData
): Promise<Servicio> {
  const supabase = await createClient();

  const dataToUpdate = {
    nombre: payload.nombre.trim(),
    categoria: payload.categoria.trim(),
    descripcion: payload.descripcion.trim() || null,
    precio_base: payload.precio_base.trim() ? Number(payload.precio_base) : 0,
    duracion_estimada_min: payload.duracion_estimada_min.trim()
      ? Number(payload.duracion_estimada_min)
      : null,
    activo: payload.activo,
  };

  const { data, error } = await supabase
    .from("servicios")
    .update(dataToUpdate)
    .eq("id", servicioId)
    .select()
    .single();

  if (error) {
    console.error("Error al actualizar servicio:", error.message);
    throw new Error(error.message || "No se pudo actualizar el servicio");
  }

  return data as Servicio;
}

export async function toggleServicioActivo(
  servicioId: string,
  activo: boolean
): Promise<Servicio> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("servicios")
    .update({ activo })
    .eq("id", servicioId)
    .select()
    .single();

  if (error) {
    console.error("Error al cambiar estado del servicio:", error.message);
    throw new Error("No se pudo cambiar el estado del servicio");
  }

  return data as Servicio;
}

export async function deleteServicio(servicioId: string) {
  const supabase = await requireAdmin();

  const { error } = await supabase.from("servicios").delete().eq("id", servicioId);

  if (error) {
    console.error("Error al eliminar servicio:", error.message);
    throw new Error(error.message || "No se pudo eliminar el servicio");
  }

  return { success: true };
}

export async function syncServiciosBase() {
  const supabase = await requireAdmin();

  const { data: existentesData, error: existentesError } = await supabase
    .from("servicios")
    .select("nombre");

  if (existentesError) {
    console.error("Error obteniendo servicios existentes:", existentesError.message);
    throw new Error("No se pudieron validar los servicios existentes");
  }

  const existentes = new Set(
    (existentesData ?? []).map((item) => item.nombre.trim().toLowerCase())
  );

  const rows = SERVICIOS_ORDEN_BASE.filter(
    (servicio) => !existentes.has(servicio.nombre.trim().toLowerCase())
  ).map((servicio) => ({
    nombre: servicio.nombre,
    categoria: servicio.categoria,
    descripcion: servicio.tareas.map((tarea) => `• ${tarea}`).join("\n"),
    precio_base: servicio.precio,
    duracion_estimada_min: null,
    activo: true,
  }));

  if (rows.length === 0) {
    return {
      inserted: 0,
      success: true,
    };
  }

  const { error } = await supabase.from("servicios").insert(rows);

  if (error) {
    console.error("Error sincronizando servicios base:", error.message);
    throw new Error("No se pudieron sincronizar los servicios base");
  }

  return {
    inserted: rows.length,
    success: true,
  };
}

async function requireAdmin() {
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

  if (error || !perfil || perfil.rol !== "admin") {
    throw new Error("No autorizado");
  }

  return supabase;
}