"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { canjearPuntosCliente } from "./fidelizacion-actions";

type ClienteCanjePuntosCardProps = {
  clienteId: string;
  puntosDisponibles: number;
};

const opcionesCanje = [
  {
    puntos: 20,
    titulo: "Descuento de $2",
    motivo: "Canje de 20 puntos por descuento de $2",
  },
  {
    puntos: 40,
    titulo: "Lavado express",
    motivo: "Canje de 40 puntos por lavado express",
  },
  {
    puntos: 60,
    titulo: "Descuento en cambio de aceite",
    motivo: "Canje de 60 puntos por descuento en cambio de aceite",
  },
];

export function ClienteCanjePuntosCard({
  clienteId,
  puntosDisponibles,
}: ClienteCanjePuntosCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleCanje(puntos: number, motivo: string) {
    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        await canjearPuntosCliente({
          clienteId,
          puntos,
          motivo,
        });

        setSuccess("Canje realizado correctamente.");
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo realizar el canje.";
        setError(message);
      }
    });
  }

  return (
    <Card title="Canjear puntos">
      <div className="grid gap-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-500">Puntos disponibles</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {puntosDisponibles}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {opcionesCanje.map((opcion) => {
            const disabled = pending || puntosDisponibles < opcion.puntos;

            return (
              <div
                key={opcion.titulo}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <p className="text-base font-semibold text-gray-900">
                  {opcion.titulo}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Requiere {opcion.puntos} puntos
                </p>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleCanje(opcion.puntos, opcion.motivo)}
                  className="mt-4 w-full rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-sm font-medium text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? "Procesando..." : "Canjear"}
                </button>
              </div>
            );
          })}
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
      </div>
    </Card>
  );
}