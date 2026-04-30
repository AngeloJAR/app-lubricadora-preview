"use client";

import Link from "next/link";
import {
  ArrowRight,
  DollarSign,
  Users,
  Wrench,
  Receipt,
  Wallet,
  ClipboardList,
} from "lucide-react";

const accesos = [
  {
    title: "Finanzas",
    description: "Ventas, costos, gastos y utilidad del negocio.",
    href: "/dashboard/finanzas",
    icon: DollarSign,
  },
  {
    title: "Clientes",
    description: "Clientes recientes, inactivos y fidelización.",
    href: "/dashboard/clientes",
    icon: Users,
  },
  {
    title: "Mantenimientos",
    description: "Seguimiento de próximos servicios.",
    href: "/dashboard/mantenimientos",
    icon: Wrench,
  },
  {
    title: "Gastos",
    description: "Control de egresos del negocio.",
    href: "/gastos",
    icon: Receipt,
  },
  {
    title: "Pagos empleados",
    description: "Sueldos, anticipos y bonos.",
    href: "/pagos-empleados",
    icon: Wallet,
  },
  {
    title: "Órdenes",
    description: "Gestión completa de órdenes.",
    href: "/ordenes",
    icon: ClipboardList,
  },
];

export function DashboardAccesosRapidos() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {accesos.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            {/* Icono */}
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-600">
              <Icon className="h-5 w-5" />
            </div>

            {/* Texto */}
            <div>
              <p className="text-base font-semibold text-slate-900">
                {item.title}
              </p>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                {item.description}
              </p>
            </div>

            {/* Acción */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-yellow-600">
                Entrar
              </span>

              <ArrowRight className="h-4 w-4 text-yellow-500 transition group-hover:translate-x-1" />
            </div>

            {/* Hover overlay sutil */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-transparent transition group-hover:ring-yellow-200" />
          </Link>
        );
      })}
    </section>
  );
}