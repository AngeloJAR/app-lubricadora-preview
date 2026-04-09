import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getOrdenDetalle } from "@/features/ordenes/actions";
import { OrdenDetalleView } from "@/features/ordenes/orden-detalle-view";
import { createClient } from "@/lib/supabase/server";

type OrdenDetallePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrdenDetallePage({
  params,
}: OrdenDetallePageProps) {
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

  if (!perfil) {
    redirect("/ordenes");
  }

  const rol = perfil.rol as "admin" | "recepcion" | "tecnico";

  if (!["admin", "recepcion", "tecnico"].includes(rol)) {
    redirect("/ordenes");
  }

  const canManageOrden = rol === "admin" || rol === "recepcion";

  const { id } = await params;

  // validar UUID
  const isUUID = /^[0-9a-fA-F-]{36}$/.test(id);

  if (!isUUID) {
    redirect("/ordenes");
  }

  const orden = await getOrdenDetalle(id);

  return (
    <AppShell title="Detalle de la orden">
      <div className="mb-4">
        <p className="text-gray-600">
          Consulta toda la información de la orden de trabajo.
        </p>
      </div>

      <OrdenDetalleView
        orden={orden}
        canManageOrden={canManageOrden}
        rol={rol}
      />
    </AppShell>
  );
}