import { Card } from "@/components/ui/card";
import { getEstadoClasses, getEstadoLabel } from "@/utils/orden-status";
import type { OrdenDetalle, OrdenTareaTecnico } from "@/types";

export function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";

  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Guayaquil",
  }).format(new Date(fecha));
}

export function formatFechaHora(fecha?: string | null) {
  if (!fecha) return "-";

  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Guayaquil",
  }).format(new Date(fecha));
}

export function formatMoney(value?: number | string | null) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

export function getEstadoTareaLabel(estado: OrdenTareaTecnico["estado"]) {
  switch (estado) {
    case "pendiente":
      return "Pendiente";
    case "en_proceso":
      return "En proceso";
    case "completada":
      return "Completada";
    default:
      return estado;
  }
}

export function getEstadoTareaClasses(estado: OrdenTareaTecnico["estado"]) {
  switch (estado) {
    case "pendiente":
      return "border-yellow-200 bg-yellow-50 text-yellow-800";
    case "en_proceso":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "completada":
      return "border-green-200 bg-green-50 text-green-800";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

type OrdenResumenCardProps = {
  orden: OrdenDetalle;
  rightContent?: React.ReactNode;
  showTotal?: boolean;
  showKilometrajeFinal?: boolean;
};

export function OrdenResumenCard({
  orden,
  rightContent,
  showTotal = false,
  showKilometrajeFinal = false,
}: OrdenResumenCardProps) {
  return (
    <Card title="Resumen de la orden">
      <div className="grid gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Número de orden</p>
              <p className="mt-1 text-2xl font-bold">{orden.numero}</p>
            </div>

            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Estado</p>
              <div className="mt-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${getEstadoClasses(
                    orden.estado
                  )}`}
                >
                  {getEstadoLabel(orden.estado)}
                </span>
              </div>
            </div>

            {showTotal ? (
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Total</p>
                <p className="mt-1 text-2xl font-bold">
                  {formatMoney(orden.total)}
                </p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Fecha</p>
              <p className="mt-1 font-medium">{formatFecha(orden.fecha)}</p>
            </div>

            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Kilometraje ingreso</p>
              <p className="mt-1 font-medium">{orden.kilometraje ?? "-"}</p>
            </div>

            {showKilometrajeFinal ? (
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Kilometraje final</p>
                <p className="mt-1 font-medium">
                  {orden.kilometraje_final ?? "-"}
                </p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Hora inicio</p>
              <p className="mt-1 font-medium">
                {formatFechaHora(orden.hora_inicio)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Hora fin</p>
              <p className="mt-1 font-medium">
                {formatFechaHora(orden.hora_fin)}
              </p>
            </div>
          </div>

          {rightContent ? (
            <div className="grid gap-3 xl:min-w-70">{rightContent}</div>
          ) : null}
        </div>

        {orden.notas ? (
          <div className="rounded-2xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Notas</p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-gray-800">
              {orden.notas}
            </p>
          </div>
        ) : null}

        {orden.observaciones_tecnicas ? (
          <div className="rounded-2xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Observaciones técnicas</p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-gray-800">
              {orden.observaciones_tecnicas}
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

type OrdenClienteVehiculoCardsProps = {
  orden: OrdenDetalle;
  showLinks?: boolean;
};

export function OrdenClienteVehiculoCards({
  orden,
  showLinks = false,
}: OrdenClienteVehiculoCardsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Cliente">
        {orden.clientes ? (
          <div className="grid gap-3">
            <div>
              <p className="text-sm text-gray-500">Nombre</p>
              <p className="font-medium">
                {orden.clientes.nombres} {orden.clientes.apellidos}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Teléfono</p>
              <p className="font-medium">{orden.clientes.telefono}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">WhatsApp</p>
              <p className="font-medium">{orden.clientes.whatsapp || "-"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Correo</p>
              <p className="font-medium">{orden.clientes.email || "-"}</p>
            </div>

            {showLinks ? (
              <div>
                <a
                  href={`/clientes/${orden.clientes.id}`}
                  className="inline-flex rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-sm text-white transition hover:opacity-90"
                >
                  Ver cliente
                </a>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-gray-600">No hay cliente relacionado.</p>
        )}
      </Card>

      <Card title="Vehículo">
        {orden.vehiculos ? (
          <div className="grid gap-3">
            <div>
              <p className="text-sm text-gray-500">Placa</p>
              <p className="font-medium">{orden.vehiculos.placa}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Marca / Modelo</p>
              <p className="font-medium">
                {orden.vehiculos.marca} {orden.vehiculos.modelo}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Año</p>
              <p className="font-medium">{orden.vehiculos.anio ?? "-"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Color</p>
              <p className="font-medium">{orden.vehiculos.color ?? "-"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Transmisión</p>
              <p className="font-medium">{orden.vehiculos.transmision ?? "-"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Combustible</p>
              <p className="font-medium">{orden.vehiculos.combustible ?? "-"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Kilometraje actual vehículo</p>
              <p className="font-medium">
                {orden.vehiculos.kilometraje_actual ?? "-"}
              </p>
            </div>

            {showLinks ? (
              <div>
                <a
                  href={`/vehiculos/${orden.vehiculos.id}`}
                  className="inline-flex rounded-xl border border-gray-300 px-4 py-2 text-sm transition hover:bg-gray-50"
                >
                  Ver vehículo
                </a>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-gray-600">No hay vehículo relacionado.</p>
        )}
      </Card>
    </div>
  );
}

type OrdenItemsCardProps = {
  orden: OrdenDetalle;
  showTotals?: boolean;
};

export function OrdenItemsCard({
  orden,
  showTotals = false,
}: OrdenItemsCardProps) {
  const subtotal = Number(orden.subtotal ?? 0);
  const descuentoManual = Number(orden.descuento ?? 0);
  const descuentoPuntos = Number(orden.descuento_puntos ?? 0);
  const descuentoTotal = descuentoManual + descuentoPuntos;

  return (
    <Card title="Servicios / Items de la orden">
      {orden.orden_items.length === 0 ? (
        <p className="text-gray-600">No hay items registrados en esta orden.</p>
      ) : (
        <div className="grid gap-4">
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-600">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Precio unitario</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {orden.orden_items.map((item) => (
                  <tr key={item.id} className="border-t border-gray-200 text-sm">
                    <td className="px-4 py-3 font-medium">{item.nombre_item}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          item.tipo_item === "servicio"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.tipo_item === "servicio" ? "Servicio" : "Producto"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.cantidad}</td>
                    <td className="px-4 py-3">
                      {formatMoney(item.precio_unitario)}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatMoney(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showTotals ? (
            <div className="ml-auto w-full max-w-sm rounded-2xl border border-gray-200 p-4">
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatMoney(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Descuento manual</span>
                  <span className="font-medium">
                    - {formatMoney(descuentoManual)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Descuento por puntos</span>
                  <span className="font-medium">
                    - {formatMoney(descuentoPuntos)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                  <span className="text-gray-500">Descuento total</span>
                  <span className="font-medium">
                    - {formatMoney(descuentoTotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-base">
                  <span className="font-semibold text-gray-900">Total final</span>
                  <span className="font-bold text-gray-900">
                    {formatMoney(orden.total)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}