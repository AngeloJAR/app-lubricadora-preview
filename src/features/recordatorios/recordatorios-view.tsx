"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export function RecordatoriosView() {
  const [recordatorios, setRecordatorios] = useState<RecordatorioConRelaciones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function loadRecordatorios() {
    try {
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
      <Card
        title="Recordatorios pendientes"
        description="Consulta los mantenimientos que deben notificarse a los clientes."
      >
        {loading ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
            Cargando recordatorios...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : recordatorios.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
            No hay recordatorios pendientes.
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

              return (
                <article
                  key={recordatorio.id}
                  className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 grid flex-1 gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold text-gray-900 break-words">
                              {vehiculoTexto}
                            </h3>

                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                                recordatorio.tipo === "fecha"
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : "border-yellow-200 bg-yellow-50 text-yellow-700"
                              }`}
                            >
                              {tipoTexto}
                            </span>
                          </div>

                          <p className="mt-2 text-sm leading-6 text-gray-500 break-words">
                            {recordatorio.mensaje?.trim() || "Sin mensaje registrado."}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                              Cliente
                            </p>
                            <p className="mt-2 text-sm font-medium text-gray-900 break-words">
                              {clienteTexto}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                              Teléfono
                            </p>
                            {recordatorio.clientes?.telefono ? (
                              <a
                                href={`tel:${recordatorio.clientes.telefono}`}
                                className="mt-2 inline-block text-sm font-medium text-gray-900 transition hover:text-yellow-700"
                              >
                                {recordatorio.clientes.telefono}
                              </a>
                            ) : (
                              <p className="mt-2 text-sm font-medium text-gray-400">-</p>
                            )}
                          </div>

                          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                              Programado
                            </p>
                            <p className="mt-2 text-sm font-medium text-gray-900 break-words">
                              {recordatorio.tipo === "fecha"
                                ? formatFecha(recordatorio.fecha_programada)
                                : `${recordatorio.kilometraje_programado ?? "-"} km`}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                              Orden relacionada
                            </p>
                            <p className="mt-2 text-sm font-medium text-gray-900">
                              {recordatorio.ordenes_trabajo?.numero ?? "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2 xl:w-44">
                        {recordatorio.vehiculos?.id ? (
                          <Link
                            href={`/vehiculos/${recordatorio.vehiculos.id}`}
                            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                          >
                            Ver vehículo
                          </Link>
                        ) : null}

                        {recordatorio.clientes?.id ? (
                          <Link
                            href={`/clientes/${recordatorio.clientes.id}`}
                            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                          >
                            Ver cliente
                          </Link>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleMarcarEnviado(recordatorio.id)}
                          disabled={isLoading}
                          className="rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-sm font-medium text-white transition hover:brightness-95 disabled:opacity-60"
                        >
                          {isLoading ? "Actualizando..." : "Marcar enviado"}
                        </button>
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