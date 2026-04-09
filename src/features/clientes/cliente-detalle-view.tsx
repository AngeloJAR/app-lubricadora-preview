import { Card } from "@/components/ui/card";
import { ClienteCanjePuntosCard } from "./cliente-canje-puntos-card";
import { ClienteFidelizacionCard } from "./cliente-fidelizacion-card";
import { ClientePuntosMovimientosCard } from "./cliente-puntos-movimientos-card";
import type {
  ClienteDetalle,
  ClienteFidelizacionResumen,
  ClientePuntosMovimiento,
} from "@/types";

type ClienteDetalleViewProps = {
  cliente: ClienteDetalle;
  resumenFidelizacion: ClienteFidelizacionResumen;
  movimientosPuntos: ClientePuntosMovimiento[];
};

export function ClienteDetalleView({
  cliente,
  resumenFidelizacion,
  movimientosPuntos,
}: ClienteDetalleViewProps) {
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <a
          href={`/ordenes/nueva?cliente_id=${cliente.id}`}
          className="rounded-xl bg-yellow-500 text-white px-4 py-2 text-sm"
        >
          Crear orden para este cliente
        </a>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <ClienteFidelizacionCard resumen={resumenFidelizacion} />

        <Card title="Estado del cliente">
          <div className="grid gap-2">
            <p className="text-sm text-gray-500">Puntos disponibles</p>
            <p className="text-2xl font-bold text-green-600">
              {resumenFidelizacion.puntosDisponibles}
            </p>

            <p className="text-sm text-gray-500">Total acumulados</p>
            <p className="font-medium">
              {resumenFidelizacion.puntosGanados ?? 0}            </p>

            <p className="text-sm text-gray-500">Total canjeados</p>
            <p className="font-medium">
              {resumenFidelizacion.puntosCanjeados}
            </p>
          </div>
        </Card>
      </div>

      <ClienteCanjePuntosCard
        clienteId={cliente.id}
        puntosDisponibles={resumenFidelizacion.puntosDisponibles}
      />
      {resumenFidelizacion.puntosDisponibles >= 20 ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Este cliente ya puede canjear beneficios. Ofrécele una promoción en la siguiente orden.
        </div>
      ) : null}

      <Card
        title="Información del cliente"
        description={
          (resumenFidelizacion.puntosGanados ?? 0) > 50 ? "Cliente frecuente / valioso"
            : "Cliente en crecimiento"
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Nombre</p>
            <p className="font-medium">
              {cliente.nombres} {cliente.apellidos}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Teléfono</p>
            <p className="font-medium">{cliente.telefono}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">WhatsApp</p>
            <p className="font-medium">{cliente.whatsapp || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Correo</p>
            <p className="font-medium">{cliente.email || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Cédula / RUC</p>
            <p className="font-medium">{cliente.cedula_ruc || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Promociones</p>
            <p className="font-medium">
              {cliente.acepta_promociones ? "Sí" : "No"}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-gray-500">Notas</p>
          <p className="font-medium">{cliente.notas || "-"}</p>
        </div>
      </Card>

      <ClientePuntosMovimientosCard movimientos={movimientosPuntos} />

      <Card title="Vehículos del cliente">
        {cliente.vehiculos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
            Este cliente no tiene vehículos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-600">
                  <th className="px-4 py-3">Placa</th>
                  <th className="px-4 py-3">Marca</th>
                  <th className="px-4 py-3">Modelo</th>
                  <th className="px-4 py-3">Año</th>
                  <th className="px-4 py-3">Kilometraje</th>
                  <th className="px-4 py-3">Transmisión</th>
                </tr>
              </thead>
              <tbody>
                {cliente.vehiculos.map((vehiculo) => (
                  <tr
                    key={vehiculo.id}
                    className="border-t border-gray-200 text-sm"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {vehiculo.placa}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {vehiculo.marca}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {vehiculo.modelo}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {vehiculo.anio ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {vehiculo.kilometraje_actual ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {vehiculo.transmision ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}