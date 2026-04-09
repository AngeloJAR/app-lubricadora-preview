import { supabase } from "@/lib/supabase";
import type { Cliente, ClienteFormData } from "@/types";

export async function getClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al obtener clientes:", error.message);
    throw new Error("No se pudieron cargar los clientes");
  }

  return data ?? [];
}

export async function createCliente(payload: ClienteFormData) {
  const dataToInsert = {
    nombres: payload.nombres.trim(),
    apellidos: payload.apellidos.trim(),
    telefono: payload.telefono.trim(),
    whatsapp: payload.whatsapp.trim() || null,
    email: payload.email.trim() || null,
    cedula_ruc: payload.cedula_ruc.trim() || null,
    notas: payload.notas.trim() || null,
    acepta_promociones: payload.acepta_promociones,
  };

  const { data, error } = await supabase
    .from("clientes")
    .insert([dataToInsert])
    .select()
    .single();

  if (error) {
    console.error("Error al crear cliente:", error.message);
    throw new Error(error.message || "No se pudo crear el cliente");
  }

  return data;
}