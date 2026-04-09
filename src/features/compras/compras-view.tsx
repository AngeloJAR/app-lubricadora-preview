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

  return (
    <div className="grid gap-4">
      <Card title="Importar factura XML">
        <FacturaImportView proveedores={proveedores} productos={productos} />
      </Card>

      <Card title="Nuevo proveedor">
        <ProveedorForm />
      </Card>

      <Card title="Facturas registradas">
        <FacturasCompraTable facturas={facturas} />
      </Card>
    </div>
  );
}