import { LogOut, ShieldCheck } from "lucide-react";
import { getConfiguracionTaller } from "@/features/configuracion/actions";
import { createClient } from "@/lib/supabase/server";

type TopbarProps = {
  title: string;
};

function getRolLabel(rol: string) {
  if (rol === "admin") return "Administrador";
  if (rol === "recepcion") return "Recepción";
  if (rol === "tecnico") return "Técnico";
  return "Usuario";
}

export async function Topbar({ title }: TopbarProps) {
  const supabase = await createClient();

  const [{ data: authData, error: authError }, configuracion] =
    await Promise.all([supabase.auth.getUser(), getConfiguracionTaller()]);

  let email = "Usuario";
  let rol = "";

  if (!authError && authData?.user) {
    const user = authData.user;
    email = user.email ?? "Usuario";

    const { data: perfil } = await supabase
      .from("usuarios_app")
      .select("rol")
      .eq("id", user.id)
      .maybeSingle();

    rol = perfil?.rol ?? "";
  }

  const nombreNegocio =
    configuracion?.nombre_negocio || "Sistema de gestión del taller";

  return (
    <header className="hidden border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur md:block">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Panel de gestión
          </p>

          <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-950">
            {title}
          </h1>

          <p className="mt-1 truncate text-sm text-slate-500">
            {nombreNegocio}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Sesión activa
              </p>
              <p className="max-w-64 truncate text-sm font-semibold text-slate-900">
                {email}
              </p>
              <p className="text-xs font-semibold text-yellow-700">
                {getRolLabel(rol)}
              </p>
            </div>
          </div>

          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}