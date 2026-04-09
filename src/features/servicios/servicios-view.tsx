"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import type { Servicio } from "@/types";
import { getServicios, syncServiciosBase } from "./actions";
import { ServicioForm } from "./servicio-form";
import { ServiciosTable } from "./servicios-table";

type ServiciosViewProps = {
  canManageServicios: boolean;
};

export function ServiciosView({ canManageServicios }: ServiciosViewProps) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadServicios() {
    try {
      setError("");
      const data = await getServicios();
      setServicios(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar los servicios.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncBase() {
    try {
      setSyncLoading(true);
      setError("");
      setSuccess("");

      const result = await syncServiciosBase();

      setSuccess(
        result.inserted > 0
          ? `Se cargaron ${result.inserted} servicios base.`
          : "No había servicios nuevos para cargar."
      );

      await loadServicios();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron sincronizar los servicios base.";
      setError(message);
    } finally {
      setSyncLoading(false);
    }
  }

  useEffect(() => {
    loadServicios();
  }, []);

  return (
    <div className="grid gap-6">
      {canManageServicios ? (
        <Card
          title="Gestión de servicios"
          description="Crea servicios nuevos y carga una base inicial para empezar más rápido."
          right={
            <button
              type="button"
              onClick={handleSyncBase}
              disabled={syncLoading}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              {syncLoading ? "Cargando base..." : "Cargar servicios base"}
            </button>
          }
        >
          <div className="grid gap-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-sm font-medium text-blue-700">
                Consejo
              </p>
              <p className="mt-1 text-sm text-blue-700/90">
                Usa la carga base para crear rápidamente servicios comunes del
                taller y luego edítalos según tus precios y categorías.
              </p>
            </div>

            <ServicioForm onCreated={loadServicios} />
          </div>
        </Card>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <Card
        title="Listado de servicios"
        description="Consulta los servicios registrados, sus categorías y precios."
      >
        {loading ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
            Cargando servicios...
          </div>
        ) : (
          <ServiciosTable
            servicios={servicios}
            onChanged={loadServicios}
            canManageServicios={canManageServicios}
          />
        )}
      </Card>
    </div>
  );
}