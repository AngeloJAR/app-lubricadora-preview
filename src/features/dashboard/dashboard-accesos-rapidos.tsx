import Link from "next/link";

const accesos = [
  {
    title: "Finanzas",
    description: "Ventas, costos, gastos, utilidad y rentabilidad.",
    href: "/dashboard/finanzas",
  },
  {
    title: "Clientes",
    description: "Clientes recientes, inactivos y campaña de reactivación.",
    href: "/dashboard/clientes",
  },
  {
    title: "Mantenimientos",
    description: "Próximos mantenimientos y seguimiento.",
    href: "/dashboard/mantenimientos",
  },
  {
    title: "Gastos",
    description: "Registrar y revisar egresos del negocio.",
    href: "/gastos",
  },
  {
    title: "Pagos empleados",
    description: "Registrar sueldos, anticipos, bonos y descuentos.",
    href: "/pagos-empleados",
  },
  {
    title: "Órdenes",
    description: "Ir al módulo de órdenes del taller.",
    href: "/ordenes",
  },
];

export function DashboardAccesosRapidos() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {accesos.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-yellow-300 hover:shadow-md"
        >
          <p className="text-lg font-semibold text-gray-900">{item.title}</p>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            {item.description}
          </p>

          <span className="mt-4 inline-flex rounded-xl border border-yellow-300 bg-yellow-500 px-3 py-2 text-sm text-white transition hover:opacity-90">
            Ir a la sección
          </span>
        </Link>
      ))}
    </section>
  );
}