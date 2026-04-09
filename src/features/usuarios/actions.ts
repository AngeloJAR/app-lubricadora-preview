"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  return { supabase, user };
}

export async function getUsuarios() {
  await requireAdmin();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("usuarios_app")
    .select("id, nombre, email, rol, activo, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al obtener usuarios:", error.message);
    throw new Error("No se pudieron cargar los usuarios");
  }

  return data ?? [];
}

type CrearUsuarioPayload = {
  nombre: string;
  email: string;
  password: string;
  rol: "admin" | "recepcion" | "tecnico";
};

export async function createUsuario(payload: CrearUsuarioPayload) {
  await requireAdmin();

  const admin = createAdminClient();

  const nombre = payload.nombre.trim();
  const email = payload.email.trim().toLowerCase();
  const password = payload.password.trim();
  const rol = payload.rol;

  if (!nombre || !email || !password || !rol) {
    throw new Error("Todos los campos son obligatorios");
  }

  const { data: createdUser, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        rol,
      },
    });

  if (authError || !createdUser.user) {
    console.error("Error al crear usuario auth:", authError?.message);
    throw new Error(authError?.message || "No se pudo crear el usuario");
  }

  const supabase = await createClient();

  const { error: insertError } = await supabase.from("usuarios_app").insert({
    id: createdUser.user.id,
    nombre,
    email,
    rol,
    activo: true,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(createdUser.user.id, false);
    console.error("Error al crear usuario app:", insertError.message);
    throw new Error(insertError.message || "No se pudo guardar el usuario");
  }

  revalidatePath("/usuarios");
  return { success: true };
}

export async function toggleUsuarioActivo(
  userId: string,
  activo: boolean
) {
  await requireAdmin();

  const supabase = await createClient();

  const { error } = await supabase
    .from("usuarios_app")
    .update({ activo })
    .eq("id", userId);

  if (error) {
    console.error("Error al cambiar estado del usuario:", error.message);
    throw new Error("No se pudo actualizar el usuario");
  }

  revalidatePath("/usuarios");
  return { success: true };
}

export async function updateUsuarioRol(
  userId: string,
  rol: "admin" | "recepcion" | "tecnico"
) {
  await requireAdmin();

  const supabase = await createClient();

  const { error } = await supabase
    .from("usuarios_app")
    .update({ rol })
    .eq("id", userId);

  if (error) {
    console.error("Error al actualizar rol:", error.message);
    throw new Error("No se pudo actualizar el rol");
  }

  revalidatePath("/usuarios");
  return { success: true };
}

export async function deleteUsuario(userId: string) {
  const { user } = await requireAdmin();

  if (user.id === userId) {
    throw new Error("No puedes eliminar tu propio usuario");
  }

  const admin = createAdminClient();

  const { error } = await admin.auth.admin.deleteUser(userId, false);

  if (error) {
    console.error("Error al eliminar usuario:", error.message);
    throw new Error(error.message || "No se pudo eliminar el usuario");
  }

  revalidatePath("/usuarios");
  return { success: true };
}