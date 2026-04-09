import { AppShell } from "@/components/layout/app-shell";
import { getCotizacionDetalle } from "@/features/cotizaciones/actions";
import { CotizacionDetalleView } from "@/features/cotizaciones/cotizacion-detalle-view";

type CotizacionDetallePageProps = {
  params: Promise<{ id: string }>;
};

export default async function CotizacionDetallePage({
  params,
}: CotizacionDetallePageProps) {
  const { id } = await params;
  const cotizacion = await getCotizacionDetalle(id);

  return (
    <AppShell title="Detalle de cotización">
      <CotizacionDetalleView cotizacion={cotizacion} />
    </AppShell>
  );
}