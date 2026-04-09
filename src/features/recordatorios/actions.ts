import { supabase } from "@/lib/supabase";
import type { RecordatorioConRelaciones } from "@/types";

type RecordatorioRow = {
  id: string;
  cliente_id: string;
  vehiculo_id: string;
  orden_id: string;
  tipo: "fecha" | "kilometraje";
  canal: "manual" | "whatsapp" | "email" | "sms";
  fecha_programada: string | null;
  kilometraje_programado: number | null;
  mensaje: string | null;
  estado: "pendiente" | "enviado" | "cancelado";
  enviado_en: string | null;
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
        kilometraje_actual: number | null;
      }
    | {
        id: string;
        placa: string;
        marca: string;
        modelo: string;
        kilometraje_actual: number | null;
      }[]
    | null;
  ordenes_trabajo:
    | {
        id: string;
        numero: string;
      }
    | {
        id: string;
        numero: string;
      }[]
    | null;
};

export async function getRecordatoriosPendientes(): Promise<
  RecordatorioConRelaciones[]
> {
  const { data, error } = await supabase
    .from("recordatorios")
    .select(
      `
      *,
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
        modelo,
        kilometraje_actual
      ),
      ordenes_trabajo (
        id,
        numero
      )
    `
    )
    .eq("estado", "pendiente")
    .order("fecha_programada", { ascending: true });

  if (error) {
    console.error("Error al cargar recordatorios:", error.message);
    throw new Error("No se pudieron cargar los recordatorios");
  }

  const rows = (data ?? []) as RecordatorioRow[];

  return rows.map((row) => ({
    ...row,
    clientes: Array.isArray(row.clientes) ? row.clientes[0] ?? null : row.clientes,
    vehiculos: Array.isArray(row.vehiculos) ? row.vehiculos[0] ?? null : row.vehiculos,
    ordenes_trabajo: Array.isArray(row.ordenes_trabajo)
      ? row.ordenes_trabajo[0] ?? null
      : row.ordenes_trabajo,
  }));
}

export async function marcarRecordatorioEnviado(recordatorioId: string) {
  const { data, error } = await supabase
    .from("recordatorios")
    .update({
      estado: "enviado",
      enviado_en: new Date().toISOString(),
    })
    .eq("id", recordatorioId)
    .select()
    .single();

  if (error) {
    console.error("Error al marcar recordatorio:", error.message);
    throw new Error("No se pudo actualizar el recordatorio");
  }

  return data;
}