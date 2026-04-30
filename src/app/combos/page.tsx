import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/layout/app-shell";
import { CombosPageClient } from "@/features/combos/combos-page-client";
import { getCombosConDetalle } from "@/features/combos/actions";

export default async function CombosPage() {
  const combosDetalle = await getCombosConDetalle();

  async function refreshCombos() {
    "use server";
    revalidatePath("/combos");
  }

  return (
    <AppShell title="Combos">
      <div className="mb-4">
        <p className="text-gray-600">
          Crea y administra paquetes de servicios y productos para usarlos en
          tus órdenes.
        </p>
      </div>

      <CombosPageClient
        combosDetalle={combosDetalle}
        onRefresh={refreshCombos}
      />
    </AppShell>
  );
}