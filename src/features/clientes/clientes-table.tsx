"use client";

import Link from "next/link";
import type { Cliente } from "@/types";

type ClientesTableProps = {
  clientes: Cliente[];
};

function formatBoolean(value: boolean) {
  return value ? "Sí" : "No";
}

function getInitials(nombres?: string, apellidos?: string) {
  const firstName = nombres?.trim()?.charAt(0) ?? "";
  const lastName = apellidos?.trim()?.charAt(0) ?? "";
  return `${firstName}${lastName}`.toUpperCase() || "--";
}

function fullName(cliente: Cliente) {
  return `${cliente.nombres} ${cliente.apellidos}`.trim();
}

export function ClientesTable({ clientes }: ClientesTableProps) {
  if (clientes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
        No hay clientes registrados todavía.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {clientes.map((cliente) => (
        <article
          key={cliente.id}
          className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 grid flex-1 gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-sm font-bold text-yellow-700">
                      {getInitials(cliente.nombres, cliente.apellidos)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-gray-900 break-words">
                          {fullName(cliente)}
                        </h3>

                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                            cliente.acepta_promociones
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-gray-200 bg-gray-50 text-gray-600"
                          }`}
                        >
                          Promociones: {formatBoolean(cliente.acepta_promociones)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-gray-500 break-words">
                        {cliente.cedula_ruc
                          ? `Cédula/RUC: ${cliente.cedula_ruc}`
                          : "Sin cédula o RUC registrado."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Teléfono
                    </p>
                    <a
                      href={`tel:${cliente.telefono}`}
                      className="mt-2 inline-block text-sm font-medium text-gray-900 transition hover:text-yellow-700 break-words"
                    >
                      {cliente.telefono}
                    </a>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      WhatsApp
                    </p>
                    {cliente.whatsapp ? (
                      <a
                        href={`https://wa.me/${cliente.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm font-medium text-gray-900 transition hover:text-green-700 break-words"
                      >
                        {cliente.whatsapp}
                      </a>
                    ) : (
                      <p className="mt-2 text-sm font-medium text-gray-400">-</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 sm:col-span-2 xl:col-span-1">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Correo
                    </p>
                    {cliente.email ? (
                      <a
                        href={`mailto:${cliente.email}`}
                        className="mt-2 inline-block text-sm font-medium text-gray-900 transition hover:text-yellow-700 break-words"
                      >
                        {cliente.email}
                      </a>
                    ) : (
                      <p className="mt-2 text-sm font-medium text-gray-400">-</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Estado contacto
                    </p>
                    <p className="mt-2 text-sm font-medium text-gray-900">
                      {cliente.email || cliente.whatsapp
                        ? "Completo"
                        : "Básico"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 xl:w-40">
                <Link
                  href={`/clientes/${cliente.id}`}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-yellow-300 bg-yellow-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-95"
                >
                  Ver detalle
                </Link>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}