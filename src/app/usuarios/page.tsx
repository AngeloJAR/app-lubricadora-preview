import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getUsuarios } from "@/features/usuarios/actions";
import { UsuariosView } from "@/features/usuarios/usuarios-view";

export default async function UsuariosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("usuarios_app")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil?.rol !== "admin") {
    redirect("/dashboard");
  }

  const usuarios = await getUsuarios();

  return (
    <AppShell title="Usuarios">
      <UsuariosView usuarios={usuarios} />
    </AppShell>
  );
}