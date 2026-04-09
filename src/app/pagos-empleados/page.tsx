import { AppShell } from "@/components/layout/app-shell";
import { PagosEmpleadosView } from "@/features/pagos-empleados/pagos-empleados-view";
import { getEmpleadosActivos } from "@/features/pagos-empleados/actions";
import { createClient } from "@/lib/supabase/server";

export default async function PagosEmpleadosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canManagePagos = false;
  let empleados: Awaited<ReturnType<typeof getEmpleadosActivos>> = [];

  if (user) {
    const { data: perfil } = await supabase
      .from("usuarios_app")
      .select("rol, activo")
      .eq("id", user.id)
      .eq("activo", true)
      .maybeSingle();

    canManagePagos = perfil?.rol === "admin";

    if (canManagePagos) {
      empleados = await getEmpleadosActivos();
    }
  }

  return (
    <AppShell title="Pagos de empleados">
      <div className="mb-4">
        <p className="text-gray-600">
          Registra y consulta sueldos, anticipos, bonos, comisiones y descuentos.
        </p>
      </div>

      <PagosEmpleadosView
        canManagePagos={canManagePagos}
        empleados={empleados}
      />
    </AppShell>
  );
}