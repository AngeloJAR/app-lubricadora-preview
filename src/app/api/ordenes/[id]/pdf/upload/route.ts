import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

export const dynamic = "force-dynamic";

export async function POST(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const admin = createAdminClient();

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
      return NextResponse.json(
        { error: "No se pudo validar el perfil del usuario" },
        { status: 500 }
      );
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

    const pdfBuffer = await renderToBuffer(pdfDocument);
    const filePath = `ordenes/${orden.id}/orden-${orden.numero}.pdf`;

    const { error: uploadError } = await admin.storage
      .from("documentos")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Error storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicData } = admin.storage
      .from("documentos")
      .getPublicUrl(filePath);

    const pdfUrl = publicData.publicUrl;

    const { error: updateError } = await admin
      .from("ordenes_trabajo")
      .update({
        pdf_url: pdfUrl,
        pdf_storage_path: filePath,
        pdf_generated_at: new Date().toISOString(),
      })
      .eq("id", orden.id);

    if (updateError) {
      return NextResponse.json(
        { error: `Error update ordenes_trabajo: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        pdfUrl,
        filePath,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: unknown) {
    console.error("POST /api/ordenes/[id]/pdf/upload error:", error);

    const message =
      error instanceof Error ? error.message : "No se pudo subir el PDF";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}