import { createClient } from "@/lib/supabase/server";
import type { ConfiguracionTaller, OrdenDetalle, OrdenItem } from "@/types";

type SupabaseClientType = Awaited<ReturnType<typeof createClient>>;

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
  orden_items: OrdenItem[] | null;
};

export async function getOrdenDetallePdf(
  ordenId: string,
  userId: string,
  rol: string,
  supabase: any
) {
  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .select(`
      id,
      numero,
      fecha,
      estado,
      kilometraje,
      kilometraje_final,
      subtotal,
      descuento,
      total,
      notas,
      observaciones_tecnicas,
      proximo_mantenimiento_fecha,
      proximo_mantenimiento_km,

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

      orden_items (
        id,
        tipo_item,
        nombre_item,
        cantidad,
        precio_unitario,
        total
      )
    `)
    .eq("id", ordenId)
    .single();

  if (error || !data) {
    console.error("Error orden detalle PDF:", error?.message);
    throw new Error("No se pudo obtener la orden");
  }

  if (rol === "tecnico") {

  }

  return data;
}

export async function getConfiguracionTaller(
  supabase: SupabaseClientType
): Promise<ConfiguracionTaller | null> {
  const { data } = await supabase
    .from("configuracion_taller")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as ConfiguracionTaller | null) ?? null;
}