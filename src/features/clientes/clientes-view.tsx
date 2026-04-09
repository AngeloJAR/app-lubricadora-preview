"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import type { Cliente } from "@/types";
import { getClientes } from "./actions";
import { ClienteForm } from "./cliente-form";
import { ClientesTable } from "./clientes-table";

export function ClientesView() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadClientes() {
    try {
      setLoading(true);
      setError("");

      const data = await getClientes();
      setClientes(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los clientes.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClientes();
  }, []);

  return (
    <div className="grid gap-4">
      <Card title="Nuevo cliente">
        <ClienteForm onCreated={loadClientes} />
      </Card>

      <Card title="Listado de clientes">
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Cargando clientes...</div>
        ) : error ? (
          <div className="p-4 text-sm text-red-500">{error}</div>
        ) : (
          <ClientesTable clientes={clientes} />
        )}
      </Card>
    </div>
  );
}