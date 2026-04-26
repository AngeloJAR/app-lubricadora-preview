import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login"];
const BYPASS_PATHS = ["/auth/logout"];

const ADMIN_ONLY_PATHS = [
  "/usuarios",
  "/configuracion",
];

const ADMIN_RECEPCION_ONLY_PATHS = [
  "/caja",
  "/gastos",
  "/compras",
  "/pagos-empleados",
];

const ADMIN_RECEPCION_FULL_APP_PATHS = [
  "/ordenes",
  "/clientes",
  "/vehiculos",
  "/servicios",
  "/productos",
  "/recordatorios",
  "/fidelizacion",
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (BYPASS_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          response.cookies.set({
            name,
            value,
            ...(options as object),
          });
        },
        remove(name: string, options: Record<string, unknown>) {
          response.cookies.set({
            name,
            value: "",
            ...(options as object),
          });
        },
      },
    }
  );


  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!user) {
    return response;
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("usuarios_app")
    .select("rol, activo")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();

  if (pathname === "/login") {
    if (perfil?.rol) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return response;
  }

  if (perfilError || !perfil?.rol) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const rol = perfil.rol;

  if (rol === "tecnico") {
    const allowedTecnicoPaths = [
      "/dashboard",
      "/mis-ordenes",
      "/ordenes/preorden",
      "/busqueda",
    ];

    const isAllowed = allowedTecnicoPaths.some((path) =>
      pathname.startsWith(path)
    );

    if (!isAllowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (ADMIN_ONLY_PATHS.some((path) => pathname.startsWith(path))) {
    if (rol !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (ADMIN_RECEPCION_ONLY_PATHS.some((path) => pathname.startsWith(path))) {
    if (rol !== "admin" && rol !== "recepcion") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};