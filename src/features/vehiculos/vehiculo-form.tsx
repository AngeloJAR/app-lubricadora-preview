"use client";

import { useEffect, useState } from "react";
import { createVehiculo, getClientesForSelect } from "./actions";
import type { Cliente, VehiculoFormData } from "@/types";

const initialState: VehiculoFormData = {
  cliente_id: "",
  placa: "",
  marca: "",
  modelo: "",
  anio: "",
  color: "",
  combustible: "",
  transmision: "",
  kilometraje_actual: "",
  vin_chasis: "",
  notas: "",
};

type VehiculoFormProps = {
  onCreated?: () => Promise<void> | void;
};

export function VehiculoForm({ onCreated }: VehiculoFormProps) {
  const [form, setForm] = useState<VehiculoFormData>(initialState);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadClientes() {
      try {
        const data = await getClientesForSelect();
        setClientes(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los clientes";
        setError(message);
      } finally {
        setLoadingClientes(false);
      }
    }

    loadClientes();
  }, []);

  function updateField<K extends keyof VehiculoFormData>(
    key: K,
    value: VehiculoFormData[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.cliente_id) {
      setError("Debes seleccionar un cliente.");
      return;
    }

    if (!form.placa.trim()) {
      setError("La placa es obligatoria.");
      return;
    }

    if (!form.marca.trim()) {
      setError("La marca es obligatoria.");
      return;
    }

    if (!form.modelo.trim()) {
      setError("El modelo es obligatorio.");
      return;
    }

    try {
      setLoading(true);
      await createVehiculo(form);
      setSuccess("Vehículo creado correctamente.");
      setForm(initialState);

      if (onCreated) {
        await onCreated();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ocurrió un error inesperado.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Cliente</label>
        <select
          value={form.cliente_id}
          onChange={(e) => updateField("cliente_id", e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          disabled={loadingClientes}
        >
          <option value="">
            {loadingClientes ? "Cargando clientes..." : "Selecciona un cliente"}
          </option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nombres} {cliente.apellidos} - {cliente.telefono}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Placa</label>
          <input
            value={form.placa}
            onChange={(e) => updateField("placa", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 uppercase outline-none focus:border-black"
            placeholder="ABC-1234"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Marca</label>
          <input
            value={form.marca}
            onChange={(e) => updateField("marca", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Toyota"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Modelo</label>
          <input
            value={form.modelo}
            onChange={(e) => updateField("modelo", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Corolla"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Año</label>
          <input
            type="number"
            value={form.anio}
            onChange={(e) => updateField("anio", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="2020"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Color</label>
          <input
            value={form.color}
            onChange={(e) => updateField("color", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Blanco"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Combustible</label>
          <input
            value={form.combustible}
            onChange={(e) => updateField("combustible", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Gasolina"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Transmisión</label>
          <input
            value={form.transmision}
            onChange={(e) => updateField("transmision", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Manual"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Kilometraje actual</label>
          <input
            type="number"
            value={form.kilometraje_actual}
            onChange={(e) => updateField("kilometraje_actual", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="120000"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">VIN / Chasis</label>
          <input
            value={form.vin_chasis}
            onChange={(e) => updateField("vin_chasis", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="Número de chasis"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notas</label>
        <textarea
          value={form.notas}
          onChange={(e) => updateField("notas", e.target.value)}
          className="min-h-[100px] w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          placeholder="Observaciones del vehículo..."
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={loading || loadingClientes}
          className="rounded-xl bg-yellow-500 border border-yellow-300 text-white px-4 py-2 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar vehículo"}
        </button>
      </div>
    </form>
  );
}