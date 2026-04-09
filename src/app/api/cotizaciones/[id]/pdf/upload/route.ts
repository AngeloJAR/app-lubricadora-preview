import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConfiguracionTaller } from "@/features/ordenes/pdf/pdf-data";
import { getCotizacionDetalle } from "@/features/cotizaciones/actions";
import { CotizacionPdfDocument } from "@/features/cotizaciones/pdf/cotizacion-pdf-document";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  try {
    const [{ id }, supabase] = await Promise.all([
      context.params,
      createClient(),
    ]);

    const admin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const [cotizacion, configuracion] = await Promise.all([
      getCotizacionDetalle(id),
      getConfiguracionTaller(supabase),
    ]);

    const pdfDocument = CotizacionPdfDocument({
      cotizacion,
      configuracion,
    });

    const pdfBuffer = await renderToBuffer(pdfDocument);
    const filePath = `cotizaciones/${cotizacion.id}/cotizacion-${cotizacion.numero}.pdf`;

    const { error: uploadError } = await admin.storage
      .from("documentos")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Error storage: ${uploadError.message}`);
    }

    const { data: publicData } = admin.storage
      .from("documentos")
      .getPublicUrl(filePath);

    const pdfUrl = publicData.publicUrl;

    const { error: updateError } = await admin
      .from("cotizaciones")
      .update({
        pdf_url: pdfUrl,
        pdf_storage_path: filePath,
        pdf_generated_at: new Date().toISOString(),
      })
      .eq("id", cotizacion.id);

    if (updateError) {
      throw new Error(`Error update cotizaciones: ${updateError.message}`);
    }

    return NextResponse.json(
      {
        ok: true,
        pdfUrl,
        filePath,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo subir el PDF";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}