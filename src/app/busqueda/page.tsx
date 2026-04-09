import { AppShell } from "@/components/layout/app-shell";
import { BusquedaRapidaView } from "@/features/busqueda/busqueda-rapida-view";
import { createClient } from "@/lib/supabase/server";

export default async function BusquedaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let rol: "admin" | "recepcion" | "tecnico" = "recepcion";

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
  }

  return (
    <AppShell title="Búsqueda rápida">
      <div className="mb-4">
        <p className="text-gray-600">
          Busca por placa, teléfono o nombre del cliente para atender más rápido.
        </p>
      </div>

      <BusquedaRapidaView rol={rol} />
    </AppShell>
  );
}