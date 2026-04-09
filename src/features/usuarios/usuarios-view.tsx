"use client";

import { useState, useTransition } from "react";
import {
  createUsuario,
  deleteUsuario,
  toggleUsuarioActivo,
  updateUsuarioRol,
} from "./actions";

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "recepcion" | "tecnico";
  activo: boolean;
};

function getInitials(nombre: string) {
  const parts = nombre.trim().split(" ").filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const second = parts[1]?.charAt(0) ?? "";
  return `${first}${second}`.toUpperCase() || "--";
}

function getRolLabel(rol: Usuario["rol"]) {
  if (rol === "admin") return "Admin";
  if (rol === "recepcion") return "Recepción";
  return "Técnico";
}

function getRolBadgeClass(rol: Usuario["rol"]) {
  if (rol === "admin") {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  if (rol === "recepcion") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-yellow-200 bg-yellow-50 text-yellow-700";
}

export function UsuariosView({ usuarios }: { usuarios: Usuario[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "recepcion" as "admin" | "recepcion" | "tecnico",
  });

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        await createUsuario(form);
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear el usuario");
      }
    });
  }

  function onToggleActivo(id: string, activo: boolean) {
    setError("");
    setLoadingId(id);

    startTransition(async () => {
      try {
        await toggleUsuarioActivo(id, !activo);
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo actualizar");
        setLoadingId(null);
      }
    });
  }

  function onChangeRol(id: string, rol: "admin" | "recepcion" | "tecnico") {
    setError("");
    setLoadingId(id);

    startTransition(async () => {
      try {
        await updateUsuarioRol(id, rol);
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo actualizar el rol");
        setLoadingId(null);
      }
    });
  }

  function onDelete(id: string) {
    const ok = window.confirm("¿Eliminar este usuario?");
    if (!ok) return;

    setError("");
    setLoadingId(id);

    startTransition(async () => {
      try {
        await deleteUsuario(id);
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo eliminar");
        setLoadingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onCreate}
        className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-gray-900">Crear usuario</h2>
          <p className="text-sm text-gray-500">
            Registra administradores, recepción o técnicos para controlar el acceso al sistema.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Nombre</label>
            <input
              className="rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
              placeholder="Nombre completo"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Correo</label>
            <input
              type="email"
              className="rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              className="rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
              placeholder="Contraseña"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Rol</label>
            <select
              className="rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
              value={form.rol}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  rol: e.target.value as "admin" | "recepcion" | "tecnico",
                }))
              }
            >
              <option value="admin">Admin</option>
              <option value="recepcion">Recepción</option>
              <option value="tecnico">Técnico</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-sm font-medium text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {isPending ? "Guardando..." : "Crear usuario"}
          </button>
        </div>
      </form>

      <div className="grid gap-4">
        {usuarios.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
            No hay usuarios registrados todavía.
          </div>
        ) : (
          usuarios.map((u) => {
            const isLoading = isPending && loadingId === u.id;

            return (
              <article
                key={u.id}
                className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 grid flex-1 gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-sm font-bold text-yellow-700">
                          {getInitials(u.nombre)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold text-gray-900 break-words">
                              {u.nombre}
                            </h3>

                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getRolBadgeClass(
                                u.rol
                              )}`}
                            >
                              {getRolLabel(u.rol)}
                            </span>

                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                                u.activo
                                  ? "border-green-200 bg-green-50 text-green-700"
                                  : "border-gray-200 bg-gray-50 text-gray-600"
                              }`}
                            >
                              {u.activo ? "Activo" : "Inactivo"}
                            </span>
                          </div>

                          <p className="mt-2 text-sm leading-6 text-gray-500 break-words">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            Correo
                          </p>
                          <p className="mt-2 text-sm font-medium text-gray-900 break-words">
                            {u.email}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            Rol
                          </p>
                          <div className="mt-2">
                            <select
                              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                              value={u.rol}
                              onChange={(e) =>
                                onChangeRol(
                                  u.id,
                                  e.target.value as "admin" | "recepcion" | "tecnico"
                                )
                              }
                              disabled={isPending}
                            >
                              <option value="admin">Admin</option>
                              <option value="recepcion">Recepción</option>
                              <option value="tecnico">Técnico</option>
                            </select>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            Estado
                          </p>
                          <p className="mt-2 text-sm font-medium text-gray-900">
                            {u.activo ? "Usuario habilitado" : "Usuario desactivado"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 xl:w-40">
                      <button
                        type="button"
                        onClick={() => onToggleActivo(u.id, u.activo)}
                        disabled={isPending}
                        className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                      >
                        {isLoading
                          ? "Actualizando..."
                          : u.activo
                            ? "Desactivar"
                            : "Activar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(u.id)}
                        disabled={isPending}
                        className="rounded-xl border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                      >
                        {isLoading ? "Procesando..." : "Eliminar"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}