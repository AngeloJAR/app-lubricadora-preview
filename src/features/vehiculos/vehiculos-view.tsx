"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import type { VehiculoConCliente } from "@/types";
import { getVehiculos } from "./actions";
import { VehiculoForm } from "./vehiculo-form";
import { VehiculosTable } from "./vehiculos-table";

export function VehiculosView() {
  const [vehiculos, setVehiculos] = useState<VehiculoConCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadVehiculos() {
    try {
      setError("");
      const data = await getVehiculos();
      setVehiculos(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar los vehículos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVehiculos();
  }, []);

  return (
    <div className="grid gap-4">
      <Card title="Nuevo vehículo">
        <VehiculoForm onCreated={loadVehiculos} />
      </Card>

      <Card title="Listado de vehículos">
        {loading ? (
          <p className="text-gray-600">Cargando vehículos...</p>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <VehiculosTable vehiculos={vehiculos} />
        )}
      </Card>
    </div>
  );
}