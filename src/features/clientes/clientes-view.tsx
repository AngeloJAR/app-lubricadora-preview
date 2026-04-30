"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, UserPlus, Users } from "lucide-react";
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
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los clientes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClientes();
  }, []);

  return (
    <div className="grid gap-5">
      <Card
        title="Nuevo cliente"
        description="Registra la información básica del cliente."
        right={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
            <UserPlus className="h-5 w-5" />
          </div>
        }
      >
        <ClienteForm onCreated={loadClientes} />
      </Card>

      <Card
        title="Listado de clientes"
        description={`${clientes.length} cliente(s) registrado(s).`}
        right={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <Users className="h-5 w-5" />
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando clientes...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : (
          <ClientesTable clientes={clientes} />
        )}
      </Card>
    </div>
  );
}