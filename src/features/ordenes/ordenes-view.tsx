"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [error, setError] = useState("");

  const mountedRef = useRef(true);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const loadOrdenes = useCallback(async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) {
        setLoadingRefresh(true);
      } else {
        setLoading(true);
      }

      const data =
        rol === "tecnico" ? await getOrdenesTecnico() : await getOrdenes();

      if (!mountedRef.current) return;

      setOrdenes(data as OrdenConRelaciones[]);
    } catch (err) {
      if (!mountedRef.current) return;

      const message =
        err instanceof Error ? err.message : "No se pudieron cargar las órdenes.";

      setError(message);
    } finally {
      if (!mountedRef.current) return;

      if (isRefresh) {
        setLoadingRefresh(false);
      } else {
        setLoading(false);
      }
    }
  }, [rol]);

  const scheduleRefresh = useCallback(() => {
    if (!mountedRef.current) return;

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      loadOrdenes(true);
    }, 300);
  }, [loadOrdenes]);

  useEffect(() => {
    mountedRef.current = true;
    loadOrdenes();

    return () => {
      mountedRef.current = false;

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
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
          scheduleRefresh();
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
          scheduleRefresh();
        }
      )
      .subscribe((status) => {
        console.log("Realtime órdenes:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rol, scheduleRefresh, supabase]);

  async function handleCreated(nuevaOrden?: OrdenConRelaciones | null) {
    if (nuevaOrden && mountedRef.current) {
      setOrdenes((prev) => {
        const sinDuplicados = prev.filter((item) => item.id !== nuevaOrden.id);
        return [nuevaOrden, ...sinDuplicados];
      });
    }

    await loadOrdenes(true);
  }

  return (
    <div className="grid gap-4">
      {canCreateOrden ? (
        <Card title="Nueva orden de trabajo">
          <div className="overflow-hidden">
            <OrdenForm onCreated={handleCreated} />
          </div>
        </Card>
      ) : null}

      <Card title={rol === "tecnico" ? "Mis órdenes" : "Listado de órdenes"}>
        {loading ? (
          <p className="text-gray-600">Cargando órdenes...</p>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="grid gap-3">
            {loadingRefresh ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                Actualizando órdenes...
              </div>
            ) : null}

            <OrdenesTable
              ordenes={ordenes}
              canViewTotales={canViewTotales}
              rol={rol}
            />
          </div>
        )}
      </Card>
    </div>
  );
}