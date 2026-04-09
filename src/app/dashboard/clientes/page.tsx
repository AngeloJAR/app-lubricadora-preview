import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import {
  getClientesCampaniaReactivacion,
  getClientesInactivos,
  getClientesRecientes,
} from "@/features/dashboard/actions";
import { DashboardClientesView } from "@/features/dashboard/dashboard-clientes-view";

export default async function DashboardClientesPage() {
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

  const [clientesRecientes, clientesInactivos, clientesCampaniaReactivacion] =
    await Promise.all([
      getClientesRecientes(),
      getClientesInactivos(30),
      getClientesCampaniaReactivacion(30),
    ]);

  return (
    <AppShell title="Dashboard · Clientes">
      <div className="mb-4">
        <p className="text-gray-600">
          Seguimiento de clientes, inactividad y reactivación.
        </p>
      </div>

      <DashboardClientesView
        clientesRecientes={clientesRecientes}
        clientesInactivos={clientesInactivos}
        clientesCampaniaReactivacion={clientesCampaniaReactivacion}
      />
    </AppShell>
  );
}