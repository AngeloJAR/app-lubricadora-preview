import { Building2, ShieldCheck } from "lucide-react";
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
    { href: "/compras", label: "Compras" },
    
    { label: "Crecimiento", type: "section" },
    { href: "/fidelizacion", label: "Fidelización" },

    { label: "Sistema", type: "section" },
    { href: "/usuarios", label: "Usuarios" },
    { href: "/configuracion", label: "Configuración" },

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

function getRolLabel(rol: keyof typeof linksByRole) {
  if (rol === "admin") return "Administrador";
  if (rol === "tecnico") return "Técnico";
  return "Recepción";
}

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
    <aside className="flex h-full min-h-screen w-72 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center gap-3 rounded-3xl bg-slate-50 p-3 ring-1 ring-slate-100">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
            <Building2 className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-base font-bold tracking-tight text-slate-950">
              {nombreNegocio}
            </h2>
            <p className="truncate text-sm text-slate-500">Panel principal</p>
          </div>
        </div>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          <ShieldCheck className="h-3.5 w-3.5 text-yellow-600" />
          {getRolLabel(rol)}
        </div>
      </div>

      <SidebarNav links={links} onNavigate={onNavigate} />
    </aside>
  );
}