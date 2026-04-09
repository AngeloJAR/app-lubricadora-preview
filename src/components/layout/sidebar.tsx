import { getConfiguracionTaller } from "@/features/configuracion/actions";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "./sidebar-nav";

type SidebarLink = {
  href?: string;
  label: string;
  type?: "section";
};

const linksByRole: Record<"admin" | "recepcion" | "tecnico", SidebarLink[]> = {
  admin: [
    { label: "General", type: "section" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/finanzas", label: "Resumen financiero" },
    { href: "/dashboard/clientes", label: "Resumen clientes" },
    { href: "/dashboard/mantenimientos", label: "Resumen mantenimientos" },
    { href: "/busqueda", label: "Búsqueda rápida" },

    { label: "Operación", type: "section" },
    { href: "/ordenes", label: "Órdenes" },
    { href: "/clientes", label: "Clientes" },
    { href: "/vehiculos", label: "Vehículos" },
    { href: "/recordatorios", label: "Recordatorios" },

    { label: "Catálogo", type: "section" },
    { href: "/servicios", label: "Servicios" },
    { href: "/productos", label: "Productos" },
    { href: "/combos", label: "Combos" },

    { label: "Finanzas", type: "section" },
    { href: "/caja", label: "Caja" },
    { href: "/gastos", label: "Gastos" },
    { href: "/pagos-empleados", label: "Pagos de empleados" },
    { href: "/cotizaciones", label: "Cotizaciones" },

    { label: "Crecimiento", type: "section" },
    { href: "/fidelizacion", label: "Fidelización" },

    { label: "Sistema", type: "section" },
    { href: "/usuarios", label: "Usuarios" },
    { href: "/configuracion", label: "Configuración" },
    { href: "/compras", label: "Compras" },
  ],
  recepcion: [
    { label: "General", type: "section" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/finanzas", label: "Resumen financiero" },
    { href: "/dashboard/clientes", label: "Resumen clientes" },
    { href: "/dashboard/mantenimientos", label: "Resumen mantenimientos" },
    { href: "/busqueda", label: "Búsqueda rápida" },

    { label: "Operación", type: "section" },
    { href: "/ordenes", label: "Órdenes" },
    { href: "/clientes", label: "Clientes" },
    { href: "/vehiculos", label: "Vehículos" },
    { href: "/recordatorios", label: "Recordatorios" },

    { label: "Catálogo", type: "section" },
    { href: "/servicios", label: "Servicios" },
    { href: "/productos", label: "Productos" },

    { label: "Finanzas", type: "section" },
    { href: "/caja", label: "Caja" },
    { href: "/gastos", label: "Gastos" },

    { label: "Crecimiento", type: "section" },
    { href: "/fidelizacion", label: "Fidelización" },
  ],
  tecnico: [
    { label: "General", type: "section" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/mis-ordenes", label: "Mis órdenes" },
    { href: "/ordenes/preorden", label: "Pre-órdenes" },
    { href: "/busqueda", label: "Búsqueda rápida" },
  ],
};

type SidebarProps = {
  onNavigate?: () => void;
};

export async function Sidebar({ onNavigate }: SidebarProps) {
  const supabase = await createClient();

  const [{ data: authData }, configuracion] = await Promise.all([
    supabase.auth.getUser(),
    getConfiguracionTaller(),
  ]);

  const user = authData.user;

  let rol: keyof typeof linksByRole = "recepcion";

  if (user) {
    const { data: perfil } = await supabase
      .from("usuarios_app")
      .select("rol, activo")
      .eq("id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (
      perfil?.rol === "admin" ||
      perfil?.rol === "recepcion" ||
      perfil?.rol === "tecnico"
    ) {
      rol = perfil.rol;
    }
  }

  const links = linksByRole[rol];
  const nombreNegocio = configuracion?.nombre_negocio || "Taller CRM";

  return (
    <aside className="flex h-full min-h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-xl font-bold">{nombreNegocio}</h2>
        <p className="text-sm text-gray-500">Panel principal</p>
        <p className="mt-1 text-xs uppercase text-gray-400">Rol: {rol}</p>
      </div>

      <SidebarNav links={links} onNavigate={onNavigate} />
    </aside>
  );
}