import { AppShell } from "@/components/layout/app-shell";
import { ServiciosView } from "@/features/servicios/servicios-view";
import { createClient } from "@/lib/supabase/server";

export default async function ServiciosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canManageServicios = false;

  if (user) {
    const { data: perfil } = await supabase
      .from("usuarios_app")
      .select("rol, activo")
      .eq("id", user.id)
      .eq("activo", true)
      .maybeSingle();

    canManageServicios = perfil?.rol === "admin";
  }

  return (
    <AppShell title="Servicios">
      <div className="mb-4">
        <p className="text-gray-600">
          Gestiona el catálogo de servicios del taller.
        </p>
      </div>

      <ServiciosView canManageServicios={canManageServicios} />
    </AppShell>
  );
}