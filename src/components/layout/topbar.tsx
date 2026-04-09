import { getConfiguracionTaller } from "@/features/configuracion/actions";
import { createClient } from "@/lib/supabase/server";

type TopbarProps = {
  title: string;
};

function getRolLabel(rol: string) {
  switch (rol) {
    case "admin":
      return "Administrador";
    case "recepcion":
      return "Recepción";
    case "tecnico":
      return "Técnico";
    default:
      return "Usuario";
  }
}

export async function Topbar({ title }: TopbarProps) {
  const supabase = await createClient();

  const [{ data: authData, error: authError }, configuracion] =
    await Promise.all([
      supabase.auth.getUser(),
      getConfiguracionTaller(),
    ]);

  let email = "Usuario";
  let rol = "";

  if (!authError && authData?.user) {
    const user = authData.user;
    email = user.email ?? "Usuario";

    // 🔥 optimización: solo traemos rol, sin bloquear toda la UI si falla
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
    <header className="border-b border-gray-200 bg-white px-4 py-3 md:px-6 md:py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 md:block">
            Panel de gestión
          </p>

          <h1 className="hidden mt-1 text-2xl font-bold text-gray-900 md:block">
            {title}
          </h1>

          <p className="truncate text-sm text-gray-500 md:mt-1">
            {nombreNegocio}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 md:px-4 md:py-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-400">
              Sesión activa
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900 break-all">
              {email}
            </p>
            <p className="mt-1 text-xs font-medium text-yellow-700">
              {getRolLabel(rol)}
            </p>
          </div>

          <form action="/auth/logout" method="post" className="w-full sm:w-auto">
            <button
              type="submit"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto md:px-4 md:py-3"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}