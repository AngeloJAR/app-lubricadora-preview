"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock,
  Gauge,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCcw,
  UserRound,
  Wrench,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { RecordatorioConRelaciones } from "@/types";
import { getRecordatoriosPendientes, marcarRecordatorioEnviado } from "./actions";

function formatFecha(value?: string | null) {
  if (!value) return "-";

  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return value;

  return fecha.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function limpiarTelefono(telefono?: string | null) {
  return String(telefono || "").replace(/\D/g, "");
}

function normalizarTelefonoWhatsapp(telefono?: string | null) {
  const limpio = limpiarTelefono(telefono);

  if (!limpio) return "";
  if (limpio.startsWith("593")) return limpio;
  if (limpio.startsWith("0")) return `593${limpio.slice(1)}`;
  if (limpio.length === 9) return `593${limpio}`;

  return limpio;
}

function buildWhatsappUrl({
  telefono,
  cliente,
  vehiculo,
  mensaje,
}: {
  telefono?: string | null;
  cliente: string;
  vehiculo: string;
  mensaje?: string | null;
}) {
  const numero = normalizarTelefonoWhatsapp(telefono);

  if (!numero) return "";

  const texto = encodeURIComponent(
    `Hola ${cliente}, le saludamos de AYR Motors.\n\nLe recordamos el mantenimiento pendiente de su vehículo ${vehiculo}.\n\n${
      mensaje?.trim() || "Puede acercarse al taller cuando guste para revisarlo."
    }`
  );

  return `https://wa.me/${numero}?text=${texto}`;
}

function getDiasRestantes(value?: string | null) {
  if (!value) return null;

  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fecha.setHours(0, 0, 0, 0);

  return Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function getEstadoFecha(value?: string | null) {
  const dias = getDiasRestantes(value);

  if (dias === null) {
    return {
      label: "Sin fecha",
      className: "border-slate-200 bg-slate-50 text-slate-600",
      icon: Clock,
    };
  }

  if (dias < 0) {
    return {
      label: `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`,
      className: "border-red-200 bg-red-50 text-red-700",
      icon: Clock,
    };
  }

  if (dias === 0) {
    return {
      label: "Para hoy",
      className: "border-orange-200 bg-orange-50 text-orange-700",
      icon: Bell,
    };
  }

  if (dias <= 7) {
    return {
      label: `En ${dias} día${dias === 1 ? "" : "s"}`,
      className: "border-yellow-200 bg-yellow-50 text-yellow-700",
      icon: CalendarDays,
    };
  }

  return {
    label: `En ${dias} días`,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CalendarDays,
  };
}

function InfoBox({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white hover:shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900 break-words">
        {children}
      </div>
    </div>
  );
}

export function RecordatoriosView() {
  const [recordatorios, setRecordatorios] = useState<RecordatorioConRelaciones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const resumen = useMemo(() => {
    const porFecha = recordatorios.filter((item) => item.tipo === "fecha").length;
    const porKilometraje = recordatorios.filter((item) => item.tipo !== "fecha").length;
    const vencidos = recordatorios.filter((item) => {
      if (item.tipo !== "fecha") return false;
      const dias = getDiasRestantes(item.fecha_programada);
      return dias !== null && dias < 0;
    }).length;

    return {
      total: recordatorios.length,
      porFecha,
      porKilometraje,
      vencidos,
    };
  }, [recordatorios]);

  async function loadRecordatorios() {
    try {
      setLoading(true);
      setError("");

      const data = await getRecordatoriosPendientes();
      setRecordatorios(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar los recordatorios.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecordatorios();
  }, []);

  async function handleMarcarEnviado(recordatorioId: string) {
    try {
      setLoadingId(recordatorioId);
      setError("");

      await marcarRecordatorioEnviado(recordatorioId);

      setRecordatorios((prev) =>
        prev.filter((recordatorio) => recordatorio.id !== recordatorioId)
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo actualizar el recordatorio.";
      setError(message);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-yellow-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-yellow-500 p-3 text-white shadow-sm">
              <Bell className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Recordatorios de mantenimiento
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Revisa los clientes que deben ser contactados por fecha o kilometraje.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadRecordatorios}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Pendientes
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{resumen.total}</p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
              Por fecha
            </p>
            <p className="mt-2 text-2xl font-bold text-blue-700">{resumen.porFecha}</p>
          </div>

          <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-yellow-600">
              Por kilometraje
            </p>
            <p className="mt-2 text-2xl font-bold text-yellow-700">
              {resumen.porKilometraje}
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
              Vencidos
            </p>
            <p className="mt-2 text-2xl font-bold text-red-700">{resumen.vencidos}</p>
          </div>
        </div>
      </section>

      <Card
        title="Recordatorios pendientes"
        description="Consulta y marca como enviados los mantenimientos ya notificados."
      >
        {loading ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-yellow-500" />
            <p className="mt-3 text-sm font-medium text-slate-500">
              Cargando recordatorios...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : recordatorios.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-emerald-300 bg-emerald-50 p-10 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="mt-3 text-base font-bold text-emerald-800">
              No hay recordatorios pendientes.
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              Todo está al día por ahora.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {recordatorios.map((recordatorio) => {
              const isLoading = loadingId === recordatorio.id;

              const vehiculoTexto = recordatorio.vehiculos
                ? `${recordatorio.vehiculos.placa} · ${recordatorio.vehiculos.marca} ${recordatorio.vehiculos.modelo}`
                : "Vehículo no disponible";

              const clienteTexto = recordatorio.clientes
                ? `${recordatorio.clientes.nombres} ${recordatorio.clientes.apellidos}`
                : "-";

              const tipoTexto =
                recordatorio.tipo === "fecha" ? "Por fecha" : "Por kilometraje";

              const estado =
                recordatorio.tipo === "fecha"
                  ? getEstadoFecha(recordatorio.fecha_programada)
                  : {
                      label: "Revisar kilometraje",
                      className: "border-yellow-200 bg-yellow-50 text-yellow-700",
                      icon: Gauge,
                    };

              const EstadoIcon = estado.icon;

              const whatsappUrl = buildWhatsappUrl({
                telefono: recordatorio.clientes?.telefono,
                cliente: clienteTexto,
                vehiculo: vehiculoTexto,
                mensaje: recordatorio.mensaje,
              });

              return (
                <article
                  key={recordatorio.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-yellow-200 hover:shadow-md"
                >
                  <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex items-start gap-4">
                        <div
                          className={`rounded-2xl p-3 ${
                            recordatorio.tipo === "fecha"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-yellow-50 text-yellow-700"
                          }`}
                        >
                          {recordatorio.tipo === "fecha" ? (
                            <CalendarDays className="h-6 w-6" />
                          ) : (
                            <Gauge className="h-6 w-6" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold text-slate-900 break-words">
                              {vehiculoTexto}
                            </h3>

                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${
                                recordatorio.tipo === "fecha"
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : "border-yellow-200 bg-yellow-50 text-yellow-700"
                              }`}
                            >
                              {recordatorio.tipo === "fecha" ? (
                                <CalendarDays className="h-3.5 w-3.5" />
                              ) : (
                                <Gauge className="h-3.5 w-3.5" />
                              )}
                              {tipoTexto}
                            </span>

                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${estado.className}`}
                            >
                              <EstadoIcon className="h-3.5 w-3.5" />
                              {estado.label}
                            </span>
                          </div>

                          <p className="mt-2 text-sm leading-6 text-slate-500 break-words">
                            {recordatorio.mensaje?.trim() || "Sin mensaje registrado."}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        {whatsappUrl ? (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp
                          </a>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleMarcarEnviado(recordatorio.id)}
                          disabled={isLoading}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          {isLoading ? "Actualizando..." : "Marcar enviado"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <InfoBox icon={UserRound} label="Cliente">
                        {clienteTexto}
                      </InfoBox>

                      <InfoBox icon={Phone} label="Teléfono">
                        {recordatorio.clientes?.telefono ? (
                          <a
                            href={`tel:${recordatorio.clientes.telefono}`}
                            className="transition hover:text-yellow-700"
                          >
                            {recordatorio.clientes.telefono}
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </InfoBox>

                      <InfoBox
                        icon={recordatorio.tipo === "fecha" ? CalendarDays : Gauge}
                        label="Programado"
                      >
                        {recordatorio.tipo === "fecha"
                          ? formatFecha(recordatorio.fecha_programada)
                          : `${recordatorio.kilometraje_programado ?? "-"} km`}
                      </InfoBox>

                      <InfoBox icon={Wrench} label="Orden relacionada">
                        {recordatorio.ordenes_trabajo?.numero ?? "-"}
                      </InfoBox>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <CarFront className="h-4 w-4" />
                        <span>Accesos rápidos del recordatorio</span>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        {recordatorio.vehiculos?.id ? (
                          <Link
                            href={`/vehiculos/${recordatorio.vehiculos.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <CarFront className="h-4 w-4" />
                            Ver vehículo
                          </Link>
                        ) : null}

                        {recordatorio.clientes?.id ? (
                          <Link
                            href={`/clientes/${recordatorio.clientes.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <UserRound className="h-4 w-4" />
                            Ver cliente
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}