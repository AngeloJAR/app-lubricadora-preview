import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getOrdenDetalle } from "@/features/ordenes/actions";
import { createClient } from "@/lib/supabase/server";

import {
  OrdenPdfButton,
  OrdenWhatsappButton,
} from "@/features/ordenes/components/actions";

type OrdenImprimirPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrdenImprimirPage({
  params,
}: OrdenImprimirPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("usuarios_app")
    .select("rol, activo")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();

  if (!perfil || (perfil.rol !== "admin" && perfil.rol !== "recepcion")) {
    redirect("/ordenes");
  }

  const { id } = await params;
  const orden = await getOrdenDetalle(id);

  return (
    <AppShell title="Documento de orden">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Documento {orden.numero}
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Desde aquí puedes generar el PDF o compartirlo por WhatsApp.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <OrdenPdfButton ordenId={orden.id} />
          <OrdenWhatsappButton orden={orden} />
        </div>
      </div>
    </AppShell>
  );
}