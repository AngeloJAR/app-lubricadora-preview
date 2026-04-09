import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { OrdenPdfDocument } from "@/features/ordenes/pdf/orden-pdf-document";
import {
  getConfiguracionTaller,
  getOrdenDetallePdf,
} from "@/features/ordenes/pdf/pdf-data";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isAllowedRole(rol?: string) {
  return rol === "admin" || rol === "recepcion" || rol === "tecnico";
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const [{ id }, supabase] = await Promise.all([
      context.params,
      createClient(),
    ]);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: perfil, error: perfilError } = await supabase
      .from("usuarios_app")
      .select("rol, activo")
      .eq("id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (perfilError) {
      throw new Error("No se pudo validar el perfil del usuario");
    }

    if (!perfil || !isAllowedRole(perfil.rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const [orden, configuracion] = await Promise.all([
      getOrdenDetallePdf(id, user.id, perfil.rol, supabase),
      getConfiguracionTaller(supabase),
    ]);

    const pdfDocument = OrdenPdfDocument({
      orden,
      configuracion,
      titulo: "Nota de servicio",
    });

    const stream = (await renderToStream(
      pdfDocument
    )) as unknown as ReadableStream;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="orden-${orden.numero}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo generar el PDF";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}