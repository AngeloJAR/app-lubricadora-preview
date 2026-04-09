import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { OrdenForm } from "@/features/ordenes/orden-form";
import { createClient } from "@/lib/supabase/server";

type NuevaOrdenPageProps = {
  searchParams?: Promise<{
    cliente_id?: string;
    vehiculo_id?: string;
  }>;
};

export default async function NuevaOrdenPage({
  searchParams,
}: NuevaOrdenPageProps) {
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

  const resolvedSearchParams = await searchParams;
  const clienteIdInicial = resolvedSearchParams?.cliente_id;
  const vehiculoIdInicial = resolvedSearchParams?.vehiculo_id;

  return (
    <AppShell title="Nueva orden">
      <div className="mb-4">
        <p className="text-gray-600">
          Registra una nueva orden de trabajo para un cliente.
        </p>
      </div>

      <OrdenForm
        modo="normal"
        clienteIdInicial={clienteIdInicial}
        vehiculoIdInicial={vehiculoIdInicial}
      />
    </AppShell>
  );
}