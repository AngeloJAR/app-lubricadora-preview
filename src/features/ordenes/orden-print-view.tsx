import type { ConfiguracionTaller, OrdenDetalle } from "@/types";
import { getEstadoLabel } from "@/utils/orden-status";
import { formatDate, formatMoney } from "@/features/ordenes/pdf-formatters";
import { PDF_TEXTS } from "@/features/ordenes/pdf-texts";
import { OrdenWhatsappButton, PrintButton } from "./components/actions";

type OrdenPrintViewProps = {
  orden: OrdenDetalle;
  configuracion: ConfiguracionTaller | null;
};

export function OrdenPrintView({ orden, configuracion }: OrdenPrintViewProps) {
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

  const direccion = configuracion?.direccion || PDF_TEXTS.dato_no_disponible;

  const mensajeFinal =
    configuracion?.mensaje_final || PDF_TEXTS.mensaje_final_print_default;

  const logoUrl = configuracion?.logo_url || "";

  return (
    <div className="mx-auto max-w-5xl bg-white p-4 text-black md:p-8 print:p-0">
      <div className="mb-6 flex flex-wrap gap-3 print:hidden">
        <PrintButton ordenId={orden.id} />
        <OrdenWhatsappButton orden={orden} />
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm print:rounded-none print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b-4 border-gray-900 px-6 py-5">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              {nombreNegocio}
            </h1>
            <p className="mt-1 text-sm text-gray-600">{direccion}</p>
            <p className="text-sm text-gray-600">Tel: {telefono}</p>
          </div>

          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo del taller"
              className="max-h-24 w-auto object-contain"
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-3 bg-gray-900 px-6 py-5 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {PDF_TEXTS.titulo_print_default}
            </h2>
            <p className="text-sm text-gray-300">
              {PDF_TEXTS.descripcion_print_default}
            </p>
          </div>

          <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-900">
            {getEstadoLabel(orden.estado)}
          </span>
        </div>

        <div className="grid gap-4 border-b px-6 py-5 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
              Orden
            </h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-bold">Número:</span> {orden.numero}</p>
              <p><span className="font-bold">Fecha:</span> {formatDate(orden.fecha)}</p>
              <p><span className="font-bold">Km ingreso:</span> {orden.kilometraje ?? PDF_TEXTS.dato_no_disponible}</p>
              <p><span className="font-bold">Km salida:</span> {orden.kilometraje_final ?? PDF_TEXTS.dato_no_disponible}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
              Cliente / vehículo
            </h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-bold">Cliente:</span> {clienteNombre}</p>
              <p><span className="font-bold">Teléfono:</span> {orden.clientes?.telefono || orden.clientes?.whatsapp || PDF_TEXTS.dato_no_disponible}</p>
              <p><span className="font-bold">Vehículo:</span> {vehiculoNombre}</p>
              <p><span className="font-bold">Placa:</span> {orden.vehiculos?.placa ?? PDF_TEXTS.dato_no_disponible}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <h3 className="mb-3 text-lg font-bold text-gray-900">
            Detalle de la orden
          </h3>

          <div className="overflow-hidden rounded-2xl border border-gray-300">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="border-b px-3 py-3">Item</th>
                  <th className="border-b px-3 py-3">Tipo</th>
                  <th className="border-b px-3 py-3">Cant.</th>
                  <th className="border-b px-3 py-3">P. unitario</th>
                  <th className="border-b px-3 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {orden.orden_items.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-3 py-3 font-medium">{item.nombre_item}</td>
                    <td className="px-3 py-3">
                      {item.tipo_item === "servicio" ? "Servicio" : "Producto"}
                    </td>
                    <td className="px-3 py-3">{item.cantidad}</td>
                    <td className="px-3 py-3">
                      ${formatMoney(item.precio_unitario)}
                    </td>
                    <td className="px-3 py-3 font-bold">
                      ${formatMoney(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-4 border-t px-6 py-5 md:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-1 text-sm font-bold">Notas</h3>
              <p className="text-sm text-gray-700">
                {orden.notas || PDF_TEXTS.sin_notas}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-1 text-sm font-bold">
                Observaciones técnicas
              </h3>
              <p className="text-sm text-gray-700">
                {orden.observaciones_tecnicas ||
                  PDF_TEXTS.sin_observaciones_tecnicas}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-900 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
              Resumen
            </h3>

            <div className="space-y-2 text-sm">
              <p className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold">${formatMoney(orden.subtotal)}</span>
              </p>
              <p className="flex justify-between">
                <span>Descuento</span>
                <span className="font-bold">-${formatMoney(orden.descuento)}</span>
              </p>

              <div className="mt-3 rounded-xl bg-gray-900 px-3 py-3 text-white">
                <p className="flex justify-between text-base font-extrabold">
                  <span>Total</span>
                  <span>${formatMoney(orden.total)}</span>
                </p>
              </div>

              <div className="pt-3 text-gray-700">
                <p><span className="font-bold">Próxima fecha:</span> {formatDate(orden.proximo_mantenimiento_fecha)}</p>
                <p><span className="font-bold">Próximo km:</span> {orden.proximo_mantenimiento_km ?? PDF_TEXTS.dato_no_disponible}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-5 text-center text-sm font-medium text-gray-600">
          {mensajeFinal}
        </div>
      </div>
    </div>
  );
}