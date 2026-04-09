"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getOportunidadesFidelizacion } from "./oportunidades-actions";
import type { ClienteOportunidadFidelizacion } from "@/types";

function getTipoClasses(tipo: ClienteOportunidadFidelizacion["tipo_oportunidad"]) {
  switch (tipo) {
    case "promo_disponible":
      return "border-green-200 bg-green-50 text-green-900";
    case "cerca_recompensa":
      return "border-yellow-200 bg-yellow-50 text-yellow-900";
    case "por_volver":
      return "border-purple-200 bg-purple-50 text-purple-900";
    case "con_puntos":
      return "border-blue-200 bg-blue-50 text-blue-900";
    default:
      return "border-gray-200 bg-gray-50 text-gray-900";
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

  if (!telefonoLimpio) {
    return "#";
  }

  return `https://wa.me/${telefonoLimpio}?text=${mensaje}`;
}

function formatearFecha(fechaIso: string | null) {
  if (!fechaIso) return "Sin visitas registradas";

  const fecha = new Date(fechaIso);

  return fecha.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function OportunidadesFidelizacionView() {
  const [oportunidades, setOportunidades] = useState<
    ClienteOportunidadFidelizacion[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<
    ClienteOportunidadFidelizacion["tipo_oportunidad"] | "todos"
  >("todos");

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

  const oportunidadesFiltradas = useMemo(() => {
    if (filtro === "todos") {
      return oportunidades;
    }

    return oportunidades.filter((item) => item.tipo_oportunidad === filtro);
  }, [oportunidades, filtro]);

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

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total oportunidades</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{resumen.total}</p>
        </div>

        <div className="rounded-3xl border border-green-200 bg-green-50 p-5 shadow-sm">
          <p className="text-sm text-green-700">Promo disponible</p>
          <p className="mt-2 text-3xl font-bold text-green-900">
            {resumen.promoDisponible}
          </p>
        </div>

        <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
          <p className="text-sm text-yellow-700">Cerca de recompensa</p>
          <p className="mt-2 text-3xl font-bold text-yellow-900">
            {resumen.cercaRecompensa}
          </p>
        </div>

        <div className="rounded-3xl border border-purple-200 bg-purple-50 p-5 shadow-sm">
          <p className="text-sm text-purple-700">Clientes por volver</p>
          <p className="mt-2 text-3xl font-bold text-purple-900">
            {resumen.porVolver}
          </p>
        </div>

        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-sm text-blue-700">Con puntos</p>
          <p className="mt-2 text-3xl font-bold text-blue-900">
            {resumen.conPuntos}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_240px] md:items-end">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Oportunidades de fidelización
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Clientes con promociones activas, puntos disponibles o posibilidad de reactivación.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Filtrar</label>
            <select
              value={filtro}
              onChange={(e) =>
                setFiltro(
                  e.target.value as
                    | "todos"
                    | "promo_disponible"
                    | "cerca_recompensa"
                    | "por_volver"
                    | "con_puntos"
                )
              }
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
            >
              <option value="todos">Todos</option>
              <option value="promo_disponible">Promo disponible</option>
              <option value="cerca_recompensa">Cerca de recompensa</option>
              <option value="por_volver">Cliente por volver</option>
              <option value="con_puntos">Con puntos</option>
            </select>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          Cargando oportunidades...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : oportunidadesFiltradas.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          No hay oportunidades para el filtro seleccionado.
        </div>
      ) : (
        <div className="grid gap-4">
          {oportunidadesFiltradas.map((item) => (
            <article
              key={`${item.tipo_oportunidad}-${item.cliente_id}`}
              className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 grid flex-1 gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getTipoClasses(
                            item.tipo_oportunidad
                          )}`}
                        >
                          {getTipoLabel(item.tipo_oportunidad)}
                        </span>
                      </div>

                      <h3 className="mt-3 text-xl font-semibold text-gray-900 break-words">
                        {item.nombres} {item.apellidos}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {item.telefono || "Sin teléfono"}
                      </p>

                      <p className="mt-3 text-sm leading-6 text-gray-700 break-words">
                        {item.descripcion}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          Puntos disponibles
                        </p>
                        <p className="mt-2 text-2xl font-bold text-gray-900">
                          {item.puntos_disponibles}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          Puntos ganados
                        </p>
                        <p className="mt-2 text-2xl font-bold text-gray-900">
                          {item.puntos_ganados}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          Total visitas
                        </p>
                        <p className="mt-2 text-2xl font-bold text-gray-900">
                          {item.total_visitas}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          Última visita
                        </p>
                        <p className="mt-2 text-sm font-semibold text-gray-900">
                          {formatearFecha(item.ultima_visita)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 xl:w-44">
                    <Link
                      href={`/clientes/${item.cliente_id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Ver cliente
                    </Link>

                    <Link
                      href={`/ordenes?cliente_id=${item.cliente_id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-800 transition hover:bg-yellow-100"
                    >
                      Crear orden
                    </Link>

                    <a
                      href={buildWhatsAppLink(
                        item.telefono,
                        `${item.nombres} ${item.apellidos}`.trim()
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-xl border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 transition hover:bg-green-100"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}