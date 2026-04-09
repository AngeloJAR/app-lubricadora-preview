"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  ConfiguracionTaller,
  ConfiguracionTallerFormData,
} from "@/types";

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return 0;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export async function getConfiguracionTaller(): Promise<ConfiguracionTaller | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("configuracion_taller")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error al obtener configuración:", error.message);
    throw new Error("No se pudo cargar la configuración del taller");
  }

  return data;
}

export async function upsertConfiguracionTaller(
  payload: ConfiguracionTallerFormData,
  existingId?: string
) {
  const supabase = await createClient();

  const margenGanancia = toNumber(payload.margen_ganancia);

  if (margenGanancia < 0) {
    throw new Error("El margen de ganancia no puede ser negativo");
  }

  const dataToSave = {
    id: existingId,
    nombre_negocio: payload.nombre_negocio.trim(),
    telefono: payload.telefono.trim() || null,
    whatsapp: payload.whatsapp.trim() || null,
    direccion: payload.direccion.trim() || null,
    mensaje_final: payload.mensaje_final.trim() || null,
    moneda: payload.moneda.trim() || "USD",
    logo_url: payload.logo_url.trim() || null,
    margen_ganancia: margenGanancia || 45,
  };

  const { data, error } = await supabase
    .from("configuracion_taller")
    .upsert(dataToSave)
    .select()
    .single();

  if (error) {
    console.error("Error al guardar configuración:", error.message);
    throw new Error("No se pudo guardar la configuración");
  }

  return data;
}

export async function uploadLogoTaller(file: File) {
  const supabase = await createClient();

  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const fileName = `logo-${Date.now()}.${extension}`;
  const filePath = `taller/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("branding")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type || "image/png",
    });

  if (uploadError) {
    console.error("Error al subir logo:", uploadError.message);
    throw new Error("No se pudo subir el logo");
  }

  const { data } = supabase.storage.from("branding").getPublicUrl(filePath);

  return data.publicUrl;
}