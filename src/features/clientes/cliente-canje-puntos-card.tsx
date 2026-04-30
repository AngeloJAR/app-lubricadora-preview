"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Gift, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        setError(
          err instanceof Error ? err.message : "No se pudo realizar el canje."
        );
      }
    });
  }

  return (
    <Card title="Canjear puntos" description="Aplica beneficios disponibles para este cliente.">
      <div className="grid gap-4">
        <div className="flex items-center gap-4 rounded-3xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
            <Sparkles className="h-6 w-6" />
          </div>

          <div>
            <p className="text-sm font-medium text-yellow-700">
              Puntos disponibles
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              {puntosDisponibles}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {opcionesCanje.map((opcion) => {
            const disabled = pending || puntosDisponibles < opcion.puntos;

            return (
              <div
                key={opcion.titulo}
                className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-yellow-200 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                  <Gift className="h-5 w-5" />
                </div>

                <p className="mt-3 text-base font-bold tracking-tight text-slate-950">
                  {opcion.titulo}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Requiere {opcion.puntos} puntos
                </p>

                <Button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleCanje(opcion.puntos, opcion.motivo)}
                  className="mt-4 w-full"
                >
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando
                    </>
                  ) : (
                    "Canjear"
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        ) : null}
      </div>
    </Card>
  );
}