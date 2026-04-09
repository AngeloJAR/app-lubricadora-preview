import { CotizacionEstadoSelect } from "./cotizacion-estado-select";
import { CotizacionPdfButton } from "./cotizacion-pdf-button";
import { CotizacionWhatsappButton } from "./cotizacion-whatsapp-button";
import type { CotizacionDetalle } from "@/types";
import { CrearOrdenDesdeCotizacionButton } from "./crear-orden-button";

type CotizacionDetalleViewProps = {
  cotizacion: CotizacionDetalle;
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatMoney(value?: number | string | null) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function getEstadoClass(estado?: string | null) {
  const value = (estado ?? "").toLowerCase();

  if (value.includes("aprob")) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (value.includes("rechaz")) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (value.includes("venc")) {
    return "border-gray-200 bg-gray-100 text-gray-700";
  }

  return "border-yellow-200 bg-yellow-50 text-yellow-700";
}

export function CotizacionDetalleView({
  cotizacion,
}: CotizacionDetalleViewProps) {
  const clienteNombre = cotizacion.clientes
    ? `${cotizacion.clientes.nombres} ${cotizacion.clientes.apellidos}`
    : "-";

  const vehiculoNombre = cotizacion.vehiculos
    ? `${cotizacion.vehiculos.placa} · ${cotizacion.vehiculos.marca} ${cotizacion.vehiculos.modelo}`
    : "-";

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900 break-words">
                  {cotizacion.numero}
                </h2>

                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getEstadoClass(
                    cotizacion.estado
                  )}`}
                >
                  {cotizacion.estado}
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-600">
                Fecha: {formatDate(cotizacion.fecha)}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Válida hasta: {formatDate(cotizacion.validez_hasta)}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-3">
              <CrearOrdenDesdeCotizacionButton cotizacionId={cotizacion.id} />
              <CotizacionPdfButton cotizacionId={cotizacion.id} />
              <CotizacionWhatsappButton cotizacion={cotizacion} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900">Cliente</h3>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Nombre
                </p>
                <p className="mt-2 text-sm font-medium text-gray-900 break-words">
                  {clienteNombre}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Teléfono
                  </p>
                  {cotizacion.clientes?.telefono ? (
                    <a
                      href={`tel:${cotizacion.clientes.telefono}`}
                      className="mt-2 inline-block text-sm font-medium text-gray-900 transition hover:text-yellow-700"
                    >
                      {cotizacion.clientes.telefono}
                    </a>
                  ) : (
                    <p className="mt-2 text-sm font-medium text-gray-400">-</p>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Correo
                  </p>
                  {cotizacion.clientes?.email ? (
                    <a
                      href={`mailto:${cotizacion.clientes.email}`}
                      className="mt-2 inline-block text-sm font-medium text-gray-900 break-words transition hover:text-yellow-700"
                    >
                      {cotizacion.clientes.email}
                    </a>
                  ) : (
                    <p className="mt-2 text-sm font-medium text-gray-400">-</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900">Vehículo</h3>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Vehículo
                </p>
                <p className="mt-2 text-sm font-medium text-gray-900 break-words">
                  {vehiculoNombre}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Placa
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {cotizacion.vehiculos?.placa ?? "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Año
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {cotizacion.vehiculos?.anio ?? "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Estado</h3>
              <p className="mt-1 text-sm text-gray-500">
                Actualiza el estado de la cotización según la respuesta del cliente.
              </p>
            </div>

            <div className="w-full xl:max-w-xs">
              <CotizacionEstadoSelect
                cotizacionId={cotizacion.id}
                estadoActual={cotizacion.estado}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Items</h3>
            <p className="text-sm text-gray-500">
              Servicios y productos incluidos en la cotización.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:hidden">
            {cotizacion.cotizacion_items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 break-words">
                    {item.nombre_item}
                  </p>

                  <span className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                    {item.tipo_item}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Cantidad
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {item.cantidad}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      P. Unit.
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {formatMoney(item.precio_unitario)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Total
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatMoney(item.total)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="min-w-full overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <thead className="bg-gray-50 text-left text-sm text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Cantidad</th>
                  <th className="px-4 py-3 font-medium">P. Unit.</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {cotizacion.cotizacion_items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-gray-200 text-sm"
                  >
                    <td className="px-4 py-3 text-gray-900">
                      {item.nombre_item}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {item.tipo_item}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {item.cantidad}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatMoney(item.precio_unitario)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {formatMoney(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 ml-auto grid max-w-sm gap-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <p className="flex items-center justify-between text-sm text-gray-700">
                <span>Subtotal</span>
                <span className="font-medium">
                  {formatMoney(cotizacion.subtotal)}
                </span>
              </p>

              <p className="mt-2 flex items-center justify-between text-sm text-gray-700">
                <span>Descuento</span>
                <span className="font-medium">
                  {formatMoney(cotizacion.descuento)}
                </span>
              </p>

              <div className="mt-3 border-t border-gray-200 pt-3">
                <p className="flex items-center justify-between text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatMoney(cotizacion.total)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Notas</h3>
          <p className="mt-3 text-sm leading-6 text-gray-700 break-words">
            {cotizacion.notas?.trim() || "Sin notas."}
          </p>
        </div>
      </section>
    </div>
  );
}