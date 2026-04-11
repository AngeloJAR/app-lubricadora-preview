import { Card } from "@/components/ui/card";
import { getEstadoClasses, getEstadoLabel } from "@/utils/orden-status";
import type { OrdenDetalle, OrdenTareaTecnico } from "@/types";

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

export function OrdenResumenCard({
  orden,
  rightContent,
}: {
  orden: OrdenDetalle;
  rightContent?: React.ReactNode;
}) {
  return (
    <Card title="Resumen de la orden">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="grid gap-2">
          <div>
            <p className="text-sm text-gray-500">Número de orden</p>
            <p className="text-2xl font-bold">{orden.numero}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Fecha</p>
            <p className="font-medium">
              {new Date(orden.fecha).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Kilometraje al ingreso</p>
            <p className="font-medium">{orden.kilometraje ?? "-"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Hora inicio</p>
            <p className="font-medium">{formatFechaHora(orden.hora_inicio)}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Hora fin</p>
            <p className="font-medium">{formatFechaHora(orden.hora_fin)}</p>
          </div>
        </div>

        <div className="grid gap-3">
          {rightContent}

          <div>
            <p className="mb-1 text-sm text-gray-500">Estado</p>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${getEstadoClasses(
                orden.estado
              )}`}
            >
              {getEstadoLabel(orden.estado)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function OrdenClienteVehiculoCards({ orden }: { orden: OrdenDetalle }) {
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
              <p className="text-sm text-gray-500">Transmisión</p>
              <p className="font-medium">{orden.vehiculos.transmision ?? "-"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Combustible</p>
              <p className="font-medium">{orden.vehiculos.combustible ?? "-"}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">No hay vehículo relacionado.</p>
        )}
      </Card>
    </div>
  );
}

export function OrdenItemsCard({ orden }: { orden: OrdenDetalle }) {
  return (
    <Card title="Servicios / Items de la orden">
      {orden.orden_items.length === 0 ? (
        <p className="text-gray-600">No hay items registrados en esta orden.</p>
      ) : (
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
                  <td className="px-4 py-3">{item.nombre_item}</td>
                  <td className="px-4 py-3">
                    {item.tipo_item === "servicio" ? "Servicio" : "Producto"}
                  </td>
                  <td className="px-4 py-3">{item.cantidad}</td>
                  <td className="px-4 py-3">
                    ${Number(item.precio_unitario).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">${Number(item.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}