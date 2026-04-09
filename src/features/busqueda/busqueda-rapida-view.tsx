"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  CarFront,
  UserRound,
  Phone,
  FilePlus2,
  Plus,
  Wrench,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { buscarVehiculosYClientes } from "./busqueda-actions";

type ResultadoBusqueda = Awaited<
  ReturnType<typeof buscarVehiculosYClientes>
>[number];

type BusquedaRapidaViewProps = {
  rol: "admin" | "recepcion" | "tecnico";
};

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";

  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return fecha;

  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function getCoincidenciaLabel(tipo: ResultadoBusqueda["coincidencia"]) {
  if (tipo === "placa") return "Coincidencia por placa";
  if (tipo === "telefono") return "Coincidencia por teléfono";
  return "Coincidencia por nombre";
}

export function BusquedaRapidaView({ rol }: BusquedaRapidaViewProps) {
  const [term, setTerm] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const lastQueryRef = useRef("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const termNormalizado = useMemo(() => term.trim(), [term]);
  const puedeCrear = rol !== "tecnico";

  useEffect(() => {
    const controller = new AbortController();

    if (!termNormalizado || termNormalizado.length < 2) {
      setResultados([]);
      setError("");
      setSearched(false);
      setLoading(false);
      lastQueryRef.current = "";
      return;
    }

    if (lastQueryRef.current === termNormalizado) {
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        setSearched(true);

        lastQueryRef.current = termNormalizado;

        const data = await buscarVehiculosYClientes(termNormalizado);

        if (!controller.signal.aborted) {
          setResultados(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const message =
            err instanceof Error
              ? err.message
              : "No se pudo realizar la búsqueda";

          setError(message);
          setResultados([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [termNormalizado]);

  function limpiarBusqueda() {
    setTerm("");
    setResultados([]);
    setError("");
    setSearched(false);
    setLoading(false);
    lastQueryRef.current = "";
    inputRef.current?.focus();
  }

  return (
    <div className="grid gap-4">
      <Card title="Atención rápida">
        <div className="grid gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              value={term}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                setTerm(value);

                if (puedeCrear && /^\d+$/.test(value)) {
                  localStorage.setItem("nuevo_cliente_telefono", value);
                }

                if (puedeCrear && /^[A-Z0-9-]+$/.test(value) && value.length >= 5) {
                  localStorage.setItem("nuevo_vehiculo_placa", value);
                }
              }}
              className="w-full rounded-2xl border border-gray-300 py-3 pl-12 pr-4 text-base outline-none transition focus:border-black"
              placeholder="Ej: PBC1234, 0999999999, JUAN"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={limpiarBusqueda}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm transition hover:bg-gray-50"
            >
              Limpiar
            </button>

            {puedeCrear && (
              <Link
                href="/clientes"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm transition hover:bg-gray-50"
              >
                <Plus className="size-4" />
                Nuevo cliente
              </Link>
            )}

            {puedeCrear && (
              <Link
                href="/vehiculos"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm transition hover:bg-gray-50"
              >
                <CarFront className="size-4" />
                Nuevo vehículo
              </Link>
            )}
          </div>

          <p className="text-sm text-gray-500">
            Busca por placa, teléfono o nombre y crea la atención en segundos.
          </p>
        </div>
      </Card>

      <Card title="Resultados">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-3">
            <div className="h-24 animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
            <div className="h-24 animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
            <div className="h-24 animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
          </div>
        ) : !searched ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
            Escribe una placa, teléfono o nombre para encontrar al cliente rápido.
          </div>
        ) : resultados.length === 0 ? (
          <div className="grid gap-4 rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
            <p>No se encontraron coincidencias.</p>

            {puedeCrear && (
              <div className="flex flex-col justify-center gap-2 sm:flex-row">
                <Link
                  href="/clientes"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-sm text-white transition hover:opacity-90"
                >
                  <UserRound className="size-4" />
                  Crear cliente nuevo
                </Link>

                <Link
                  href="/vehiculos"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm transition hover:bg-gray-50"
                >
                  <CarFront className="size-4" />
                  Crear vehículo nuevo
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {resultados.map((item) => {
              const clienteNombre = item.cliente
                ? `${item.cliente.nombres} ${item.cliente.apellidos}`
                : "Sin cliente";

              const crearPreOrdenHref = item.cliente?.id
                ? `/ordenes/preorden?vehiculo_id=${item.id}&cliente_id=${item.cliente.id}`
                : `/vehiculos/${item.id}`;

              const crearOrdenHref = item.cliente?.id
                ? `/ordenes/nueva?vehiculo_id=${item.id}&cliente_id=${item.cliente.id}`
                : `/vehiculos/${item.id}`;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="grid gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-gray-900">
                            {item.placa} · {item.marca} {item.modelo}
                          </p>

                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            {getCoincidenciaLabel(item.coincidencia)}
                          </span>
                        </div>

                        <div className="grid gap-1 text-sm text-gray-600">
                          <p className="inline-flex items-center gap-2">
                            <UserRound className="size-4" />
                            Cliente: {clienteNombre}
                          </p>

                          <p className="inline-flex items-center gap-2">
                            <Phone className="size-4" />
                            Teléfono: {item.cliente?.telefono ?? "-"}
                          </p>

                          <p className="inline-flex items-center gap-2">
                            <CarFront className="size-4" />
                            Año: {item.anio ?? "-"} · Kilometraje:{" "}
                            {item.kilometraje_actual ?? "-"}
                          </p>

                          <p className="inline-flex items-center gap-2">
                            <Wrench className="size-4" />
                            Última visita: {formatFecha(item.ultima_orden?.fecha)} ·
                            Estado: {item.ultima_orden?.estado ?? "-"}
                          </p>

                          <p className="inline-flex items-center gap-2">
                            <FilePlus2 className="size-4" />
                            Próximo recordatorio:{" "}
                            {item.proximo_recordatorio?.fecha_programada
                              ? formatFecha(item.proximo_recordatorio.fecha_programada)
                              : item.proximo_recordatorio?.kilometraje_programado ?? "-"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row lg:w-55 lg:flex-col">
                        {item.cliente?.id && (
                          <Link
                            href={crearOrdenHref}
                            className="inline-flex items-center justify-center rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-sm text-white transition hover:opacity-90"
                          >
                            Crear orden
                          </Link>
                        )}

                        {item.cliente?.id && (
                          <Link
                            href={crearPreOrdenHref}
                            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm transition hover:bg-gray-50"
                          >
                            Crear pre-orden
                          </Link>
                        )}

                        {item.cliente?.id && (
                          <Link
                            href={`/clientes/${item.cliente.id}`}
                            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm transition hover:bg-gray-50"
                          >
                            Ver cliente
                          </Link>
                        )}

                        <Link
                          href={`/vehiculos/${item.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm transition hover:bg-gray-50"
                        >
                          Ver vehículo
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}