"use client";

import Link from "next/link";
import { CheckCircle2, Eye, Mail, MessageCircle, Phone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function InfoBox({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  href?: string;
  icon: typeof Phone;
}) {
  const content = (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:bg-white">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>

      <p className="mt-2 break-words text-sm font-semibold text-slate-900">
        {value || "-"}
      </p>
    </div>
  );

  if (!href || !value) return content;

  return (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
      {content}
    </a>
  );
}

export function ClientesTable({ clientes }: ClientesTableProps) {
  if (clientes.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
          <UserRound className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-500">
          No hay clientes registrados todavía.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {clientes.map((cliente) => {
        const telefonoWhatsapp = cliente.whatsapp?.replace(/\D/g, "");

        return (
          <article
            key={cliente.id}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-yellow-200 hover:shadow-md"
          >
            <div className="p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 grid flex-1 gap-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-sm font-bold text-yellow-700">
                      {getInitials(cliente.nombres, cliente.apellidos)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-xl font-bold tracking-tight text-slate-950">
                          {fullName(cliente)}
                        </h3>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${
                            cliente.acepta_promociones
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Promociones: {formatBoolean(cliente.acepta_promociones)}
                        </span>
                      </div>

                      <p className="mt-2 break-words text-sm leading-6 text-slate-500">
                        {cliente.cedula_ruc
                          ? `Cédula/RUC: ${cliente.cedula_ruc}`
                          : "Sin cédula o RUC registrado."}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <InfoBox
                      label="Teléfono"
                      value={cliente.telefono}
                      href={cliente.telefono ? `tel:${cliente.telefono}` : undefined}
                      icon={Phone}
                    />

                    <InfoBox
                      label="WhatsApp"
                      value={cliente.whatsapp}
                      href={telefonoWhatsapp ? `https://wa.me/${telefonoWhatsapp}` : undefined}
                      icon={MessageCircle}
                    />

                    <InfoBox
                      label="Correo"
                      value={cliente.email}
                      href={cliente.email ? `mailto:${cliente.email}` : undefined}
                      icon={Mail}
                    />

                    <InfoBox
                      label="Contacto"
                      value={cliente.email || cliente.whatsapp ? "Completo" : "Básico"}
                      icon={UserRound}
                    />
                  </div>
                </div>

                <div className="grid gap-2 xl:w-40">
                  <Link href={`/clientes/${cliente.id}`}>
                    <Button className="w-full">
                      <Eye className="h-4 w-4" />
                      Ver detalle
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}