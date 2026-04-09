import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { normalizeDashboardPeriodo } from "@/features/dashboard/dashboard-periodo";
import {
  getDashboardMetricas,
  getDashboardSerieFinanciera,
  getProductosRentables,
  getServiciosTop,
} from "@/features/dashboard/actions";
import { DashboardFinanzasView } from "@/features/dashboard/dashboard-finanzas-view";

type DashboardFinanzasPageProps = {
  searchParams?: Promise<{
    periodo?: string;
  }>;
};

export default async function DashboardFinanzasPage({
  searchParams,
}: DashboardFinanzasPageProps) {
  const resolvedSearchParams = await searchParams;
  const periodo = normalizeDashboardPeriodo(resolvedSearchParams?.periodo);

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

  const [metricas, serieFinanciera, productosRentables, serviciosTop] =
    await Promise.all([
      getDashboardMetricas(periodo),
      getDashboardSerieFinanciera(periodo),
      getProductosRentables(),
      getServiciosTop(),
    ]);

  return (
    <AppShell title="Dashboard · Finanzas">
      <div className="mb-4">
        <p className="text-gray-600">
          Vista detallada de finanzas, rentabilidad y resultados del negocio.
        </p>
      </div>

      <DashboardFinanzasView
        periodo={periodo}
        metricas={metricas}
        serieFinanciera={serieFinanciera}
        productosRentables={productosRentables}
        serviciosTop={serviciosTop}
      />
    </AppShell>
  );
}