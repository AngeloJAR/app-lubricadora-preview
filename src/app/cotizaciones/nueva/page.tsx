import { AppShell } from "@/components/layout/app-shell";
import {
  getClientesParaCotizacion,
  getVehiculosParaCotizacion,
  getServiciosParaCotizacion,
  getProductosParaCotizacion,
} from "@/features/cotizaciones/actions";
import { CotizacionForm } from "@/features/cotizaciones/cotizacion-form";

export default async function NuevaCotizacionPage() {
  const [clientes, vehiculos, servicios, productos] = await Promise.all([
    getClientesParaCotizacion(),
    getVehiculosParaCotizacion(),
    getServiciosParaCotizacion(),
    getProductosParaCotizacion(),
  ]);

  return (
    <AppShell title="Nueva cotización">
      <div className="mb-4">
        <p className="text-gray-600">
          Crea una nueva cotización para un cliente.
        </p>
      </div>

      <CotizacionForm
        clientes={clientes}
        vehiculos={vehiculos}
        servicios={servicios}
        productos={productos}
      />
    </AppShell>
  );
}