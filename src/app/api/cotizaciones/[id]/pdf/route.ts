import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getConfiguracionTaller } from "@/features/ordenes/pdf/pdf-data";
import { CotizacionPdfDocument } from "@/features/cotizaciones/pdf/cotizacion-pdf-document";
import { getCotizacionDetalle } from "@/features/cotizaciones/actions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

    const [cotizacion, configuracion] = await Promise.all([
      getCotizacionDetalle(id),
      getConfiguracionTaller(supabase),
    ]);

    const pdfDocument = CotizacionPdfDocument({
      cotizacion,
      configuracion,
    });

    const stream = (await renderToStream(
      pdfDocument
    )) as unknown as ReadableStream;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="cotizacion-${cotizacion.numero}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo generar el PDF";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}