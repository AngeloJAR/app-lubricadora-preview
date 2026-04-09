import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getOrdenesTecnico } from "@/features/ordenes/actions";
import { MisOrdenesView } from "@/features/ordenes/mis-ordenes-view";

export default async function MisOrdenesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell title="Mis órdenes">
        <p className="text-sm text-red-600">
          No se pudo obtener el usuario actual.
        </p>
      </AppShell>
    );
  }

  const ordenes = await getOrdenesTecnico(user.id);

  return (
    <AppShell title="Mis órdenes">
      <MisOrdenesView ordenes={ordenes} />
    </AppShell>
  );
}