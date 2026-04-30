import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { createClient } from "@/lib/supabase/server";
import { normalizeDashboardPeriodo } from "@/features/dashboard/dashboard-periodo";

import {
  getDashboardAccionesSugeridas,
  getDashboardAlertas,
  getDashboardMetricas,
  getDashboardResumenDinero,
  getDashboardTecnicoMetricas,
  getDashboardSerieFinanciera,
} from "@/features/dashboard/actions";

type DashboardPageProps = {
  searchParams?: Promise<{
    periodo?: string;
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
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

  if (perfil.rol === "tecnico") {
    const metricasTecnico = await getDashboardTecnicoMetricas(user.id);

    return (
      <AppShell title={`Dashboard · ${perfil.rol}`}>
        <div className="mb-4">
          <p className="text-gray-600">
            Resumen de tus órdenes y actividad de hoy.
          </p>
        </div>

        <DashboardView
          rol={perfil.rol}
          periodo={periodo}
          metricasTecnico={metricasTecnico}
        />
      </AppShell>
    );
  }

  const [
    metricas,
    resumenDinero,
    alertas,
    accionesSugeridas,
    serieFinanciera,
  ] = await Promise.all([

    getDashboardMetricas(periodo),
    getDashboardResumenDinero(periodo),
    getDashboardAlertas(periodo),
    getDashboardAccionesSugeridas(periodo),
    getDashboardSerieFinanciera(periodo),
  ]);

  return (

    <AppShell title={`Dashboard · ${perfil.rol}`}>

      <div className="mb-4">
        <p className="text-gray-600">
          Resumen general del negocio y accesos rápidos a cada sección.
        </p>
      </div>

      <DashboardView
        rol={perfil.rol}
        periodo={periodo}
        metricas={metricas}
        resumenDinero={resumenDinero}
        alertas={alertas}
        accionesSugeridas={accionesSugeridas}
        serieFinanciera={serieFinanciera}
      />
    </AppShell>
  );
}