"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CalendarClock,
  Gift,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  TicketPercent,
  UserRound,
  UsersRound,
} from "lucide-react";
import { getOportunidadesFidelizacion } from "./oportunidades-actions";
import type { ClienteOportunidadFidelizacion } from "@/types";

type FiltroOportunidad =
  | ClienteOportunidadFidelizacion["tipo_oportunidad"]
  | "todos";

const filtros: {
  value: FiltroOportunidad;
  label: string;
}[] = [
  { value: "todos", label: "Todos" },
  { value: "promo_disponible", label: "Promo disponible" },
  { value: "cerca_recompensa", label: "Cerca de recompensa" },
  { value: "por_volver", label: "Cliente por volver" },
  { value: "con_puntos", label: "Con puntos" },
];

function getTipoClasses(tipo: ClienteOportunidadFidelizacion["tipo_oportunidad"]) {
  switch (tipo) {
    case "promo_disponible":
      return {
        card: "border-emerald-200 bg-emerald-50 text-emerald-900",
        badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
        icon: "bg-emerald-500 text-white",
      };
    case "cerca_recompensa":
      return {
        card: "border-amber-200 bg-amber-50 text-amber-900",
        badge: "border-amber-200 bg-amber-100 text-amber-800",
        icon: "bg-amber-500 text-white",
      };
    case "por_volver":
      return {
        card: "border-purple-200 bg-purple-50 text-purple-900",
        badge: "border-purple-200 bg-purple-100 text-purple-800",
        icon: "bg-purple-500 text-white",
      };
    case "con_puntos":
      return {
        card: "border-blue-200 bg-blue-50 text-blue-900",
        badge: "border-blue-200 bg-blue-100 text-blue-800",
        icon: "bg-blue-500 text-white",
      };
    default:
      return {
        card: "border-slate-200 bg-slate-50 text-slate-900",
        badge: "border-slate-200 bg-slate-100 text-slate-800",
        icon: "bg-slate-500 text-white",
      };
  }
}

function getTipoIcon(tipo: ClienteOportunidadFidelizacion["tipo_oportunidad"]) {
  switch (tipo) {
    case "promo_disponible":
      return Gift;
    case "cerca_recompensa":
      return Award;
    case "por_volver":
      return CalendarClock;
    case "con_puntos":
      return Star;
    default:
      return Sparkles;
  }
}

function getTipoLabel(tipo: ClienteOportunidadFidelizacion["tipo_oportunidad"]) {
  switch (tipo) {
    case "promo_disponible":
      return "Promo disponible";
    case "cerca_recompensa":
      return "Cerca de recompensa";
    case "por_volver":
      return "Cliente por volver";
    case "con_puntos":
      return "Tiene puntos";
    default:
      return "Oportunidad";
  }
}

function buildWhatsAppLink(telefono: string, nombre: string) {
  const telefonoLimpio = telefono.replace(/\D/g, "");
  const mensaje = encodeURIComponent(
    `Hola ${nombre}, te contactamos desde el taller porque tienes una oportunidad disponible en tu fidelización.`
  );

  if (!telefonoLimpio) return "#";

  return `https://wa.me/${telefonoLimpio}?text=${mensaje}`;
}

function formatearFecha(fechaIso: string | null) {
  if (!fechaIso) return "Sin visitas";

  const fecha = new Date(fechaIso);

  return fecha.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function ResumenCard({
  title,
  value,
  icon: Icon,
  className,
}: {
  title: string;
  value: number;
  icon: typeof UsersRound;
  className: string;
}) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium opacity-80">{title}</p>
        <div className="rounded-2xl bg-white/70 p-2 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-4 text-3xl font-bold">{value}</p>
    </div>
  );
}

export function OportunidadesFidelizacionView() {
  const [oportunidades, setOportunidades] = useState<
    ClienteOportunidadFidelizacion[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<FiltroOportunidad>("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const data = await getOportunidadesFidelizacion();
        setOportunidades(data);
      } catch (err) {
        console.error("Error cargando oportunidades de fidelización:", err);
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las oportunidades"
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const resumen = useMemo(() => {
    return {
      total: oportunidades.length,
      promoDisponible: oportunidades.filter(
        (item) => item.tipo_oportunidad === "promo_disponible"
      ).length,
      cercaRecompensa: oportunidades.filter(
        (item) => item.tipo_oportunidad === "cerca_recompensa"
      ).length,
      porVolver: oportunidades.filter(
        (item) => item.tipo_oportunidad === "por_volver"
      ).length,
      conPuntos: oportunidades.filter(
        (item) => item.tipo_oportunidad === "con_puntos"
      ).length,
    };
  }, [oportunidades]);

  const oportunidadesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return oportunidades.filter((item) => {
      const coincideFiltro =
        filtro === "todos" || item.tipo_oportunidad === filtro;

      const nombreCompleto = `${item.nombres} ${item.apellidos}`.toLowerCase();

      const coincideBusqueda =
        !texto ||
        nombreCompleto.includes(texto) ||
        item.telefono?.toLowerCase().includes(texto) ||
        item.descripcion?.toLowerCase().includes(texto);

      return coincideFiltro && coincideBusqueda;
    });
  }, [oportunidades, filtro, busqueda]);

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-yellow-200">
              <Sparkles className="h-4 w-4" />
              Fidelización de clientes
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Oportunidades para traer clientes de vuelta
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Revisa clientes con promociones, puntos acumulados o posibles
              oportunidades para contactarlos por WhatsApp.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 text-center shadow-sm">
            <p className="text-sm text-slate-300">Clientes encontrados</p>
            <p className="mt-1 text-4xl font-bold text-yellow-300">
              {oportunidadesFiltradas.length}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ResumenCard
          title="Total oportunidades"
          value={resumen.total}
          icon={UsersRound}
          className="border-slate-200 bg-white text-slate-900"
        />

        <ResumenCard
          title="Promo disponible"
          value={resumen.promoDisponible}
          icon={Gift}
          className="border-emerald-200 bg-emerald-50 text-emerald-900"
        />

        <ResumenCard
          title="Cerca recompensa"
          value={resumen.cercaRecompensa}
          icon={Award}
          className="border-amber-200 bg-amber-50 text-amber-900"
        />

        <ResumenCard
          title="Por volver"
          value={resumen.porVolver}
          icon={CalendarClock}
          className="border-purple-200 bg-purple-50 text-purple-900"
        />

        <ResumenCard
          title="Con puntos"
          value={resumen.conPuntos}
          icon={Star}
          className="border-blue-200 bg-blue-50 text-blue-900"
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Lista de oportunidades
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Filtra por tipo o busca por cliente, teléfono o descripción.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[280px_240px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar cliente..."
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
              />
            </div>

            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as FiltroOportunidad)}
              className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
            >
              {filtros.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Cargando oportunidades...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : oportunidadesFiltradas.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <TicketPercent className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            No hay oportunidades para mostrar.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Prueba cambiando el filtro o la búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {oportunidadesFiltradas.map((item) => {
            const Icon = getTipoIcon(item.tipo_oportunidad);
            const tipoClasses = getTipoClasses(item.tipo_oportunidad);
            const nombreCompleto = `${item.nombres} ${item.apellidos}`.trim();

            return (
              <article
                key={`${item.tipo_oportunidad}-${item.cliente_id}`}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="grid gap-0 xl:grid-cols-[1fr_220px]">
                  <div className="grid gap-5 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${tipoClasses.icon}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tipoClasses.badge}`}
                          >
                            {getTipoLabel(item.tipo_oportunidad)}
                          </span>
                        </div>

                        <h3 className="mt-3 break-words text-xl font-bold text-slate-900">
                          {nombreCompleto || "Cliente sin nombre"}
                        </h3>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <UserRound className="h-4 w-4" />
                            {item.telefono || "Sin teléfono"}
                          </span>
                        </div>

                        <p className="mt-3 break-words text-sm leading-6 text-slate-600">
                          {item.descripcion}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Puntos disponibles
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">
                          {item.puntos_disponibles}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Puntos ganados
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">
                          {item.puntos_ganados}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Total visitas
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">
                          {item.total_visitas}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Última visita
                        </p>
                        <p className="mt-2 text-sm font-bold text-slate-900">
                          {formatearFecha(item.ultima_visita)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid content-center gap-2 border-t border-slate-100 bg-slate-50 p-5 xl:border-l xl:border-t-0">
                    <Link
                      href={`/clientes/${item.cliente_id}`}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Ver cliente
                    </Link>

                    <Link
                      href={`/ordenes?cliente_id=${item.cliente_id}`}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-yellow-300 bg-yellow-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-yellow-500"
                    >
                      Crear orden
                    </Link>

                    <a
                      href={buildWhatsAppLink(item.telefono, nombreCompleto)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}