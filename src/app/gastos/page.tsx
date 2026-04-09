import { AppShell } from "@/components/layout/app-shell";
import { GastosView } from "@/features/gastos/gastos-view";
import { createClient } from "@/lib/supabase/server";

export default async function GastosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canManageGastos = false;

  if (user) {
    const { data: perfil } = await supabase
      .from("usuarios_app")
      .select("rol, activo")
      .eq("id", user.id)
      .eq("activo", true)
      .maybeSingle();

    canManageGastos =
      perfil?.rol === "admin" || perfil?.rol === "recepcion";
  }

  return (
    <AppShell title="Gastos">
      <div className="mb-4">
        <p className="text-gray-600">
          Registra egresos del negocio. Cada gasto también descuenta dinero de la caja abierta.
        </p>
      </div>

      <GastosView canManageGastos={canManageGastos} />
    </AppShell>
  );
}