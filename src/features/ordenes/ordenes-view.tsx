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
  const [error, setError] = useState("");

  const mountedRef = useRef(true);

  const supabase = useMemo(() => createClient(), []);

  const loadOrdenes = useCallback(async () => {
    try {
      setError("");
      setLoading(true);

      const data =
        rol === "tecnico" ? await getOrdenesTecnico() : await getOrdenes();

      if (!mountedRef.current) return;

      setOrdenes(data as OrdenConRelaciones[]);
    } catch (err) {
      if (!mountedRef.current) return;

      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las órdenes.";

      setError(message);
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
    }
  }, [rol]);

  useEffect(() => {
    mountedRef.current = true;
    loadOrdenes();

    return () => {
      mountedRef.current = false;
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
        async () => {
          if (!mountedRef.current) return;
          await loadOrdenes();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ordenes_tareas_tecnicos",
        },
        async () => {
          if (!mountedRef.current) return;
          if (rol === "tecnico") {
            await loadOrdenes();
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
        async () => {
          if (!mountedRef.current) return;
          await loadOrdenes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, rol, loadOrdenes]);

  async function handleCreated(nuevaOrden?: OrdenConRelaciones | null) {
    if (nuevaOrden && mountedRef.current) {
      setOrdenes((prev) => [
        nuevaOrden,
        ...prev.filter((item) => item.id !== nuevaOrden.id),
      ]);
    }

    await loadOrdenes();
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