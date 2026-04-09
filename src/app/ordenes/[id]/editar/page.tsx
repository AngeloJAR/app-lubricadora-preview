import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { OrdenEditForm } from "@/features/ordenes/orden-edit-form";
import { createClient } from "@/lib/supabase/server";

type OrdenEditarPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrdenEditarPage({
  params,
}: OrdenEditarPageProps) {
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

  const canEditOrden =
    perfil?.rol === "admin" || perfil?.rol === "recepcion";

  if (!canEditOrden) {
    redirect("/ordenes");
  }

  const { id } = await params;

  return (
    <AppShell title="Editar orden">
      <div className="mb-4">
        <p className="text-gray-600">
          Actualiza servicios, notas, montos y recomendaciones de la orden.
        </p>
      </div>

      <OrdenEditForm ordenId={id} />
    </AppShell>
  );
}