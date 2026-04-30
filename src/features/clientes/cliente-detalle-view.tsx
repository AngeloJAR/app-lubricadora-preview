import Link from "next/link";
import { CarFront, CheckCircle2, FilePlus2, Phone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value || "-"}
      </p>
    </div>
  );
}

export function ClienteDetalleView({
  cliente,
  resumenFidelizacion,
  movimientosPuntos,
}: ClienteDetalleViewProps) {
  const clienteFrecuente = (resumenFidelizacion.puntosGanados ?? 0) > 50;

  return (
    <div className="grid gap-5">
      <div className="flex justify-end">
        <Link href={`/ordenes/nueva?cliente_id=${cliente.id}`}>
          <Button>
            <FilePlus2 className="h-4 w-4" />
            Crear orden para este cliente
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        <ClienteFidelizacionCard resumen={resumenFidelizacion} />
      </div>

      <ClienteCanjePuntosCard
        clienteId={cliente.id}
        puntosDisponibles={resumenFidelizacion.puntosDisponibles}
      />

      {resumenFidelizacion.puntosDisponibles >= 20 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          Este cliente ya puede canjear beneficios. Ofrécele una promoción en la siguiente orden.
        </div>
      ) : null}

      <Card
        title="Información del cliente"
        description={clienteFrecuente ? "Cliente frecuente / valioso" : "Cliente en crecimiento"}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <InfoItem label="Nombre" value={`${cliente.nombres} ${cliente.apellidos}`} />
          <InfoItem label="Teléfono" value={cliente.telefono} />
          <InfoItem label="WhatsApp" value={cliente.whatsapp} />
          <InfoItem label="Correo" value={cliente.email} />
          <InfoItem label="Cédula / RUC" value={cliente.cedula_ruc} />
          <InfoItem label="Promociones" value={cliente.acepta_promociones ? "Sí" : "No"} />
        </div>

        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Notas
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {cliente.notas || "-"}
          </p>
        </div>
      </Card>

      <ClientePuntosMovimientosCard movimientos={movimientosPuntos} />

      <Card title="Vehículos del cliente" description="Vehículos registrados para este cliente.">
        {cliente.vehiculos.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
              <CarFront className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-500">
              Este cliente no tiene vehículos registrados.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {cliente.vehiculos.map((vehiculo) => (
              <article
                key={vehiculo.id}
                className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                      <CarFront className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-lg font-bold tracking-tight text-slate-950">
                        {vehiculo.placa}
                      </p>
                      <p className="text-sm text-slate-500">
                        {vehiculo.marca} {vehiculo.modelo}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3 md:w-[520px]">
                    <InfoItem label="Año" value={vehiculo.anio} />
                    <InfoItem label="Km" value={vehiculo.kilometraje_actual} />
                    <InfoItem label="Transmisión" value={vehiculo.transmision} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}