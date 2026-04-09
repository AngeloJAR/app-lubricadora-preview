import { AppShell } from "@/components/layout/app-shell";
import { ProductosView } from "@/features/productos/productos-view";
import { createClient } from "@/lib/supabase/server";

export default async function ProductosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canManageProductos = false;

  if (user) {
    const { data: perfil } = await supabase
      .from("usuarios_app")
      .select("rol, activo")
      .eq("id", user.id)
      .eq("activo", true)
      .maybeSingle();

    canManageProductos = perfil?.rol === "admin";
  }

  return (
    <AppShell title="Productos">
      <div className="mb-4">
        <p className="text-gray-600">
          Administra filtros, aceites y demás productos del inventario.
        </p>
      </div>

      <ProductosView canManageProductos={canManageProductos} />
    </AppShell>
  );
}