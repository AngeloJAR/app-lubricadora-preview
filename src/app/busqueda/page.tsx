import { Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { BusquedaRapidaView } from "@/features/busqueda/busqueda-rapida-view";
import { createClient } from "@/lib/supabase/server";

export default async function BusquedaPage() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getUser();

  let rol: "admin" | "recepcion" | "tecnico" = "recepcion";

  if (data.user) {
    const { data: perfil } = await supabase
      .from("usuarios_app")
      .select("rol, activo")
      .eq("id", data.user.id)
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
      <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
            <Search className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-950">
              Encuentra clientes y vehículos rápido
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Busca por placa, teléfono o nombre del cliente para atender más rápido.
            </p>
          </div>
        </div>
      </div>

      <BusquedaRapidaView rol={rol} />
    </AppShell>
  );
}