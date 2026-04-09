"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import type { PagoEmpleado } from "@/types";
import { getPagosEmpleados } from "./actions";
import { PagoEmpleadoForm } from "./pago-empleado-form";
import { PagosEmpleadosTable } from "./pagos-empleados-table";

type EmpleadoOption = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
};

type PagosEmpleadosViewProps = {
  canManagePagos: boolean;
  empleados: EmpleadoOption[];
};

export function PagosEmpleadosView({
  canManagePagos,
  empleados,
}: PagosEmpleadosViewProps) {
  const [pagos, setPagos] = useState<PagoEmpleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [empleadoId, setEmpleadoId] = useState("");
  const [tipoPago, setTipoPago] = useState<
    "todos" | "sueldo" | "anticipo" | "bono" | "comision" | "descuento"
  >("todos");

  async function loadPagos() {
    try {
      setError("");
      const data = await getPagosEmpleados({
        from: from || undefined,
        to: to || undefined,
        empleado_id: empleadoId || undefined,
        tipo_pago: tipoPago,
      });
      setPagos(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los pagos de empleados.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPagos();
  }, [from, to, empleadoId, tipoPago]);

  return (
    <div className="grid gap-6">
      {canManagePagos ? (
        <Card
          title="Registrar pago de empleado"
          description="Guarda sueldos, anticipos, bonos, comisiones y descuentos."
        >
          <div className="grid gap-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-sm font-medium text-blue-700">Consejo</p>
              <p className="mt-1 text-sm text-blue-700/90">
                Registra cada pago con fecha y período para que el dashboard
                financiero muestre mejor los egresos del personal.
              </p>
            </div>

            <PagoEmpleadoForm empleados={empleados} onCreated={loadPagos} />
          </div>
        </Card>
      ) : null}

      <Card
        title="Historial de pagos"
        description="Consulta los pagos registrados para cada empleado."
      >
        <div className="mb-4 grid gap-4 md:grid-cols-4">
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
              Empleado
            </label>
            <select
              value={empleadoId}
              onChange={(e) => setEmpleadoId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            >
              <option value="">Todos</option>
              {empleados.map((empleado) => (
                <option key={empleado.id} value={empleado.id}>
                  {empleado.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tipo de pago
            </label>
            <select
              value={tipoPago}
              onChange={(e) =>
                setTipoPago(
                  e.target.value as
                    | "todos"
                    | "sueldo"
                    | "anticipo"
                    | "bono"
                    | "comision"
                    | "descuento"
                )
              }
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            >
              <option value="todos">Todos</option>
              <option value="sueldo">Sueldos</option>
              <option value="anticipo">Anticipos</option>
              <option value="bono">Bonos</option>
              <option value="comision">Comisiones</option>
              <option value="descuento">Descuentos</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
            Cargando pagos...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <PagosEmpleadosTable
            pagos={pagos}
            canManagePagos={canManagePagos}
          />
        )}
      </Card>
    </div>
  );
}