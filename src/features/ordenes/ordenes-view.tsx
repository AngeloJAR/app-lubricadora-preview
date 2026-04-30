"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ClipboardList, Plus, RefreshCw, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import type { OrdenConRelaciones } from "@/types";
import { getOrdenes, getOrdenesTecnico } from "./actions";
import { OrdenForm } from "./orden-form";
import { OrdenesTable } from "./ordenes-table";

type OrdenesViewProps = {
  canCreateOrden: boolean;
  canViewTotales: boolean;
  rol: "admin" | "recepcion" | "tecnico";
};

export function OrdenesView({
  canCreateOrden,
  canViewTotales,
  rol,
}: OrdenesViewProps) {
  const [ordenes, setOrdenes] = useState<OrdenConRelaciones[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const mountedRef = useRef(true);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const loadOrdenes = useCallback(
    async (showFullLoading = false) => {
      try {
        setError("");

        if (showFullLoading) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const data =
          rol === "tecnico" ? await getOrdenesTecnico() : await getOrdenes();

        if (!mountedRef.current) return;

        setOrdenes(data as OrdenConRelaciones[]);
      } catch (err) {
        if (!mountedRef.current) return;

        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las órdenes."
        );
      } finally {
        if (!mountedRef.current) return;

        setLoading(false);
        setRefreshing(false);
      }
    },
    [rol]
  );

  const scheduleLoadOrdenes = useCallback(() => {
    if (!mountedRef.current) return;
    if (refreshTimeoutRef.current) return;

    refreshTimeoutRef.current = setTimeout(async () => {
      refreshTimeoutRef.current = null;
      await loadOrdenes(false);
    }, 1200);
  }, [loadOrdenes]);

  useEffect(() => {
    mountedRef.current = true;
    loadOrdenes(true);

    return () => {
      mountedRef.current = false;

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [loadOrdenes]);

  useEffect(() => {
    const channel = supabase
      .channel(`ordenes-realtime-${rol}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ordenes_trabajo",
        },
        () => {
          scheduleLoadOrdenes();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ordenes_tareas_tecnicos",
        },
        () => {
          if (rol === "tecnico") {
            scheduleLoadOrdenes();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ordenes_tecnicos",
        },
        () => {
          scheduleLoadOrdenes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, rol, scheduleLoadOrdenes]);

  async function handleCreated(nuevaOrden?: OrdenConRelaciones | null) {
    if (nuevaOrden && mountedRef.current) {
      setOrdenes((prev) => [
        nuevaOrden,
        ...prev.filter((item) => item.id !== nuevaOrden.id),
      ]);
    }

    await loadOrdenes(false);
  }

  return (
    <div className="grid gap-5">
      {canCreateOrden ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-yellow-50 p-3 text-yellow-600">
                <Plus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Nueva orden de trabajo
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Crea una orden para recepción, taller o seguimiento del cliente.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${
                showForm
                  ? "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                  : "border border-yellow-300 bg-yellow-500 text-white"
              }`}
            >
              {showForm ? (
                <>
                  <X className="h-4 w-4" />
                  Cerrar formulario
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Crear nueva orden
                </>
              )}
            </button>
          </div>

          {showForm ? (
            <div className="mt-5 border-t border-gray-200 pt-5">
              <OrdenForm
                onCreated={async (ordenCreada) => {
                  await handleCreated(ordenCreada);
                  setShowForm(false);
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <Card
        title={rol === "tecnico" ? "Mis órdenes" : "Listado de órdenes"}
        right={
          refreshing ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Actualizando
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
              <ClipboardList className="h-3.5 w-3.5" />
              {ordenes.length} orden(es)
            </span>
          )
        }
      >
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-600">
            Cargando órdenes...
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            {error}
          </div>
        ) : (
          <OrdenesTable
            ordenes={ordenes}
            canViewTotales={canViewTotales}
            rol={rol}
          />
        )}
      </Card>
    </div>
  );
}