import { AppShell } from "@/components/layout/app-shell";
import { OrdenesView } from "@/features/ordenes/ordenes-view";
import { createClient } from "@/lib/supabase/server";

export default async function OrdenesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canCreateOrden = false;
  let canViewTotales = false;
  let rol: "admin" | "recepcion" | "tecnico" = "tecnico";

  if (user) {
    const { data: perfil } = await supabase
      .from("usuarios_app")
      .select("rol, activo")
      .eq("id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (
      perfil?.rol === "admin" ||
      perfil?.rol === "recepcion" ||
      perfil?.rol === "tecnico"
    ) {
      rol = perfil.rol;
    }

    canCreateOrden = rol === "admin" || rol === "recepcion";
    canViewTotales = rol === "admin" || rol === "recepcion";
  }

  return (
    <AppShell title="Órdenes de trabajo">
      <div className="mb-4">
        <p className="text-gray-600">
          Crea y administra las órdenes de trabajo del taller.
        </p>
      </div>

      <OrdenesView
        canCreateOrden={canCreateOrden}
        canViewTotales={canViewTotales}
        rol={rol}
      />
    </AppShell>
  );
}