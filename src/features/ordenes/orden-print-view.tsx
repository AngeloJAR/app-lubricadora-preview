import type { ConfiguracionTaller, OrdenDetalle } from "@/types";
import { getEstadoLabel } from "@/utils/orden-status";
import { OrdenWhatsappButton } from "./orden-whatsapp-button";
import { PrintButton } from "./print-button";
import { formatDate, formatMoney } from "@/features/ordenes/pdf-formatters";
import { PDF_TEXTS } from "@/features/ordenes/pdf-texts";

type OrdenPrintViewProps = {
  orden: OrdenDetalle;
  configuracion: ConfiguracionTaller | null;
};

export function OrdenPrintView({
  orden,
  configuracion,
}: OrdenPrintViewProps) {
  const clienteNombre = orden.clientes
    ? `${orden.clientes.nombres} ${orden.clientes.apellidos}`.trim()
    : PDF_TEXTS.cliente_no_disponible;

  const vehiculoNombre = orden.vehiculos
    ? `${orden.vehiculos.marca} ${orden.vehiculos.modelo}`
    : PDF_TEXTS.vehiculo_no_disponible;

  const nombreNegocio =
    configuracion?.nombre_negocio || PDF_TEXTS.negocio_default;

  const telefono =
    configuracion?.telefono ||
    configuracion?.whatsapp ||
    PDF_TEXTS.dato_no_disponible;

  const direccion =
    configuracion?.direccion || PDF_TEXTS.dato_no_disponible;

  const mensajeFinal =
    configuracion?.mensaje_final ||
    PDF_TEXTS.mensaje_final_print_default;

  const logoUrl = configuracion?.logo_url || "";

  return (
    <div className="mx-auto max-w-4xl bg-white p-4 text-black md:p-8">
      <div className="mb-6 flex flex-wrap gap-3 print:hidden">
        <PrintButton ordenId={orden.id} />
        <OrdenWhatsappButton orden={orden} />
      </div>

      <div className="border border-gray-200">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 border-b px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold">{nombreNegocio}</h1>
            <p className="text-sm text-gray-700">{direccion}</p>
            <p className="text-sm text-gray-700">Tel: {telefono}</p>
          </div>

          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo del taller"
              className="max-h-24 w-auto object-contain"
            />
          ) : null}
        </div>

        {/* TITULO */}
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-semibold">
            {PDF_TEXTS.titulo_print_default}
          </h2>
          <p className="text-sm text-gray-600">
            {PDF_TEXTS.descripcion_print_default}
          </p>
        </div>

        {/* DATOS */}
        <div className="grid gap-4 border-b px-6 py-4 md:grid-cols-2">
          <div className="space-y-2">
            <p>
              <span className="font-semibold">Orden:</span> {orden.numero}
            </p>
            <p>
              <span className="font-semibold">Fecha:</span>{" "}
              {formatDate(orden.fecha)}
            </p>
            <p>
              <span className="font-semibold">Estado:</span>{" "}
              {getEstadoLabel(orden.estado)}
            </p>
            <p>
              <span className="font-semibold">Kilometraje ingreso:</span>{" "}
              {orden.kilometraje ?? PDF_TEXTS.dato_no_disponible}
            </p>
            <p>
              <span className="font-semibold">Kilometraje salida:</span>{" "}
              {orden.kilometraje_final ?? PDF_TEXTS.dato_no_disponible}
            </p>
          </div>

          <div className="space-y-2">
            <p>
              <span className="font-semibold">Cliente:</span> {clienteNombre}
            </p>
            <p>
              <span className="font-semibold">Teléfono:</span>{" "}
              {orden.clientes?.telefono ||
                orden.clientes?.whatsapp ||
                PDF_TEXTS.dato_no_disponible}
            </p>
            <p>
              <span className="font-semibold">Vehículo:</span>{" "}
              {vehiculoNombre}
            </p>
            <p>
              <span className="font-semibold">Placa:</span>{" "}
              {orden.vehiculos?.placa ?? PDF_TEXTS.dato_no_disponible}
            </p>
          </div>
        </div>

        {/* TABLA */}
        <div className="px-6 py-5">
          <h3 className="mb-3 text-lg font-semibold">
            Detalle de la orden
          </h3>

          <table className="min-w-full border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border px-3 py-2">Item</th>
                <th className="border px-3 py-2">Tipo</th>
                <th className="border px-3 py-2">Cantidad</th>
                <th className="border px-3 py-2">P. unitario</th>
                <th className="border px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {orden.orden_items.map((item) => (
                <tr key={item.id}>
                  <td className="border px-3 py-2">
                    {item.nombre_item}
                  </td>
                  <td className="border px-3 py-2">
                    {item.tipo_item === "servicio"
                      ? "Servicio"
                      : "Producto"}
                  </td>
                  <td className="border px-3 py-2">
                    {item.cantidad}
                  </td>
                  <td className="border px-3 py-2">
                    ${formatMoney(item.precio_unitario)}
                  </td>
                  <td className="border px-3 py-2">
                    ${formatMoney(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* NOTAS Y TOTALES */}
        <div className="grid gap-4 border-t px-6 py-5 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <h3 className="mb-1 text-base font-semibold">Notas</h3>
              <p className="text-sm text-gray-700">
                {orden.notas || PDF_TEXTS.sin_notas}
              </p>
            </div>

            <div>
              <h3 className="mb-1 text-base font-semibold">
                Observaciones técnicas
              </h3>
              <p className="text-sm text-gray-700">
                {orden.observaciones_tecnicas ||
                  PDF_TEXTS.sin_observaciones_tecnicas}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p>
              <span className="font-semibold">Subtotal:</span> $
              {formatMoney(orden.subtotal)}
            </p>
            <p>
              <span className="font-semibold">Descuento:</span> $
              {formatMoney(orden.descuento)}
            </p>
            <p className="text-lg font-bold">
              Total: ${formatMoney(orden.total)}
            </p>
            <p>
              <span className="font-semibold">Próxima fecha:</span>{" "}
              {formatDate(orden.proximo_mantenimiento_fecha)}
            </p>
            <p>
              <span className="font-semibold">
                Próximo kilometraje:
              </span>{" "}
              {orden.proximo_mantenimiento_km ??
                PDF_TEXTS.dato_no_disponible}
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t px-6 py-5 text-center text-sm text-gray-700">
          {mensajeFinal}
        </div>
      </div>
    </div>
  );
}