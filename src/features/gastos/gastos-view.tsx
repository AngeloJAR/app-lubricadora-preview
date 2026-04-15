"use client";

import { Card } from "@/components/ui/card";
import type { Gasto } from "@/types";
import { getGastos } from "./actions";
import { GastoForm } from "./gasto-form";
import { GastosTable } from "./gastos-table";
import { useCallback, useEffect, useState } from "react";

type GastosViewProps = {
  canManageGastos: boolean;
};

export function GastosView({ canManageGastos }: GastosViewProps) {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tipoGasto, setTipoGasto] = useState<"todos" | "fijo" | "variable">(
    "todos"
  );
  const [ambito, setAmbito] = useState<"todos" | "negocio" | "personal">(
    "todos"
  );
  const [metodoPago, setMetodoPago] = useState<
    "todos" | "efectivo" | "transferencia" | "deuna" | "tarjeta" | "mixto"
  >("todos");
  const [afectaCaja, setAfectaCaja] = useState<"todos" | "si" | "no">("todos");

  const loadGastos = useCallback(async () => {
    try {
      setError("");

      const data = await getGastos({
        from: from || undefined,
        to: to || undefined,
        tipo_gasto: tipoGasto,
        ambito,
        metodo_pago: metodoPago,
        afecta_caja: afectaCaja,
      });

      setGastos(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar los gastos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [from, to, tipoGasto, ambito, metodoPago, afectaCaja]);

  useEffect(() => {
    setLoading(true);
    loadGastos();
  }, [loadGastos]);

  return (
    <div className="grid gap-6">
      {canManageGastos ? (
        <Card
          title="Registrar gasto"
          description="Guarda gastos del negocio o personales y decide si deben afectar la caja."
        >
          <div className="grid gap-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-sm font-medium text-blue-700">Consejo</p>
              <p className="mt-1 text-sm text-blue-700/90">
                Usa este módulo para separar gastos del negocio y gastos
                personales. Solo los que marquen “afecta caja” descontarán dinero
                de la caja abierta.
              </p>
            </div>

            <GastoForm onCreated={loadGastos} />
          </div>
        </Card>
      ) : null}

      <Card
        title="Historial de gastos"
        description="Consulta los gastos registrados y filtra por tipo, ámbito, método de pago y si afectaron caja."
      >
        <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Desde
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Hasta
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tipo de gasto
            </label>
            <select
              value={tipoGasto}
              onChange={(e) =>
                setTipoGasto(e.target.value as "todos" | "fijo" | "variable")
              }
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            >
              <option value="todos">Todos</option>
              <option value="fijo">Fijos</option>
              <option value="variable">Variables</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Ámbito
            </label>
            <select
              value={ambito}
              onChange={(e) =>
                setAmbito(e.target.value as "todos" | "negocio" | "personal")
              }
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            >
              <option value="todos">Todos</option>
              <option value="negocio">Negocio</option>
              <option value="personal">Personal</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Método de pago
            </label>
            <select
              value={metodoPago}
              onChange={(e) =>
                setMetodoPago(
                  e.target.value as
                  | "todos"
                  | "efectivo"
                  | "transferencia"
                  | "deuna"
                  | "tarjeta"
                  | "mixto"
                )
              }
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            >
              <option value="todos">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="deuna">DeUna</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="mixto">Mixto</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              ¿Afectó caja?
            </label>
            <select
              value={afectaCaja}
              onChange={(e) =>
                setAfectaCaja(e.target.value as "todos" | "si" | "no")
              }
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            >
              <option value="todos">Todos</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
            Cargando gastos...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <GastosTable
            gastos={gastos}
            canManageGastos={canManageGastos}
          />
        )}
      </Card>
    </div>
  );
}