import { Card } from "@/components/ui/card";
import {
  getFacturasCompra,
  getProductosLite,
  getProveedores,
} from "./actions";
import { ProveedorForm } from "./proveedor-form";
import { FacturasCompraTable } from "./facturas-compra-table";
import { FacturaImportView } from "./factura-import-view";

export async function ComprasView() {
  const [proveedores, productos, facturas] = await Promise.all([
    getProveedores(),
    getProductosLite(),
    getFacturasCompra(),
  ]);

  const totalPendiente = facturas.reduce(
    (acc, factura) => acc + Number(factura.saldo_pendiente || 0),
    0
  );

  const facturasPendientes = facturas.filter(
    (factura) => factura.estado_pago === "pendiente"
  ).length;

  const facturasParciales = facturas.filter(
    (factura) => factura.estado_pago === "parcial"
  ).length;

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Compras
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Gestión de compras y proveedores
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Importa facturas, registra proveedores y controla las cuentas por
              pagar del negocio.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium text-slate-400">Facturas</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {facturas.length}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
              <p className="text-xs font-medium text-amber-600">Pendientes</p>
              <p className="mt-1 text-xl font-bold text-amber-700">
                {facturasPendientes + facturasParciales}
              </p>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
              <p className="text-xs font-medium text-red-500">Por pagar</p>
              <p className="mt-1 text-xl font-bold text-red-700">
                ${totalPendiente.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
        <Card title="Importar factura XML">
          <FacturaImportView proveedores={proveedores} productos={productos} />
        </Card>

        <Card title="Nuevo proveedor">
          <ProveedorForm />
        </Card>
      </div>

      <Card title="Facturas registradas">
        <FacturasCompraTable facturas={facturas} />
      </Card>
    </div>
  );
}