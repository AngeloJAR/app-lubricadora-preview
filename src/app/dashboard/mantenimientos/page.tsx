import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getProximosMantenimientos } from "@/features/dashboard/actions";
import { DashboardMantenimientosView } from "@/features/dashboard/dashboard-mantenimientos-view";

export default async function DashboardMantenimientosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("usuarios_app")
    .select("rol, activo")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();

  if (!perfil?.rol) {
    redirect("/login");
  }

  const proximosMantenimientos = await getProximosMantenimientos();

  return (
    <AppShell title="Dashboard · Mantenimientos">
      <div className="mb-4">
        <p className="text-gray-600">
          Seguimiento de próximos mantenimientos recomendados.
        </p>
      </div>

      <DashboardMantenimientosView
        proximosMantenimientos={proximosMantenimientos}
      />
    </AppShell>
  );
}