"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CarFront,
  FilePlus2,
  Loader2,
  Phone,
  Plus,
  Search,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  if (tipo === "placa") return "Placa";
  if (tipo === "telefono") return "Teléfono";
  return "Nombre";
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

    if (lastQueryRef.current === termNormalizado) return;

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
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo realizar la búsqueda"
          );
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
    <div className="grid gap-5">
      <Card title="Atención rápida" description="Busca y abre una atención sin perder tiempo.">
        <div className="grid gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

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
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-12 text-base font-semibold text-slate-950 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
              placeholder="Ej: PBC1234, 0999999999, JUAN"
              autoFocus
            />

            {term ? (
              <button
                type="button"
                onClick={limpiarBusqueda}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {puedeCrear && (
              <Link href="/clientes">
                <Button variant="secondary">
                  <Plus className="h-4 w-4" />
                  Nuevo cliente
                </Button>
              </Link>
            )}

            {puedeCrear && (
              <Link href="/vehiculos">
                <Button variant="secondary">
                  <CarFront className="h-4 w-4" />
                  Nuevo vehículo
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>

      <Card
        title="Resultados"
        description={
          searched
            ? `${resultados.length} coincidencia(s) encontrada(s)`
            : "Los resultados aparecerán aquí."
        }
      >
        {error ? (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-3xl border border-slate-200 bg-slate-100"
              />
            ))}
          </div>
        ) : !searched ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
              <Search className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-500">
              Escribe una placa, teléfono o nombre para buscar.
            </p>
          </div>
        ) : resultados.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">
              No se encontraron coincidencias.
            </p>

            {puedeCrear && (
              <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                <Link href="/clientes">
                  <Button>
                    <UserRound className="h-4 w-4" />
                    Crear cliente
                  </Button>
                </Link>

                <Link href="/vehiculos">
                  <Button variant="secondary">
                    <CarFront className="h-4 w-4" />
                    Crear vehículo
                  </Button>
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
                <article
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-yellow-200 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold tracking-tight text-slate-950">
                          {item.placa} · {item.marca} {item.modelo}
                        </h3>

                        <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700 ring-1 ring-yellow-200">
                          {getCoincidenciaLabel(item.coincidencia)}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                        <p className="inline-flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-slate-400" />
                          {clienteNombre}
                        </p>

                        <p className="inline-flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {item.cliente?.telefono ?? "-"}
                        </p>

                        <p className="inline-flex items-center gap-2">
                          <CarFront className="h-4 w-4 text-slate-400" />
                          Año: {item.anio ?? "-"} · Km:{" "}
                          {item.kilometraje_actual ?? "-"}
                        </p>

                        <p className="inline-flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-slate-400" />
                          Última visita: {formatFecha(item.ultima_orden?.fecha)}
                        </p>

                        <p className="inline-flex items-center gap-2 md:col-span-2">
                          <FilePlus2 className="h-4 w-4 text-slate-400" />
                          Próximo recordatorio:{" "}
                          {item.proximo_recordatorio?.fecha_programada
                            ? formatFecha(item.proximo_recordatorio.fecha_programada)
                            : item.proximo_recordatorio?.kilometraje_programado ?? "-"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:w-48 lg:grid-cols-1">
                      {item.cliente?.id && (
                        <Link href={crearOrdenHref}>
                          <Button className="w-full">Crear orden</Button>
                        </Link>
                      )}

                      {item.cliente?.id && (
                        <Link href={crearPreOrdenHref}>
                          <Button variant="secondary" className="w-full">
                            Crear pre-orden
                          </Button>
                        </Link>
                      )}

                      {item.cliente?.id && (
                        <Link href={`/clientes/${item.cliente.id}`}>
                          <Button variant="ghost" className="w-full">
                            Ver cliente
                          </Button>
                        </Link>
                      )}

                      <Link href={`/vehiculos/${item.id}`}>
                        <Button variant="ghost" className="w-full">
                          Ver vehículo
                        </Button>
                      </Link>
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