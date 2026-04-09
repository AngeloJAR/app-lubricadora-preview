"use client";

import { useState, useTransition } from "react";
import { createProveedor } from "./actions";

export function ProveedorForm() {
  const [isPending, startTransition] = useTransition();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ruc, setRuc] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function resetForm() {
    setNombre("");
    setEmail("");
    setTelefono("");
    setRuc("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        await createProveedor({
          nombre,
          email,
          telefono,
          ruc,
        });

        resetForm();
        setSuccess("Proveedor creado correctamente.");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo crear el proveedor."
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="grid gap-2">
        <label className="text-sm font-medium">Nombre</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-lg border px-3 py-2"
          placeholder="Proveedor"
          required
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">RUC</label>
        <input
          value={ruc}
          onChange={(e) => setRuc(e.target.value)}
          className="rounded-lg border px-3 py-2"
          placeholder="1799999999001"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border px-3 py-2"
          placeholder="correo@proveedor.com"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Teléfono</label>
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="rounded-lg border px-3 py-2"
          placeholder="0999999999"
        />
      </div>

      {(error || success) && (
        <div className="md:col-span-2">
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <p className="text-sm text-green-600">{success}</p>
          )}
        </div>
      )}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar proveedor"}
        </button>
      </div>
    </form>
  );
}