"use client";

import { useMemo, useState } from "react";
import { ComboForm } from "@/features/combos/combo-form";
import { ComboList } from "@/features/combos/combo-list";
import type { ComboDetalle } from "@/types";

type CombosPageClientProps = {
  combosDetalle: ComboDetalle[];
  onRefresh?: () => Promise<void> | void;
};

export function CombosPageClient({
  combosDetalle,
  onRefresh,
}: CombosPageClientProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const comboEditing = useMemo(() => {
    if (!editingId) return null;
    return combosDetalle.find((combo) => combo.id === editingId) ?? null;
  }, [editingId, combosDetalle]);

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,720px)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Gestión de combos
                </p>
                <h2 className="mt-1 text-xl font-semibold text-gray-900">
                  {comboEditing ? "Editar combo" : "Nuevo combo"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {comboEditing
                    ? "Actualiza el combo seleccionado."
                    : "Crea paquetes de servicios y productos para tus órdenes."}
                </p>
              </div>

              {comboEditing ? (
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </div>

          <div className="p-5">
            <ComboForm
              initialData={comboEditing}
              onSaved={async () => {
                setEditingId(null);
                await onRefresh?.();
              }}
              submitLabel={comboEditing ? "Guardar cambios" : "Guardar combo"}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Catálogo
            </p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">
              Lista de combos
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Revisa, activa, desactiva, edita o elimina combos.
            </p>
          </div>

          <div className="p-5">
            <ComboList
              initialCombos={combosDetalle}
              onRefresh={onRefresh}
              onEdit={(comboId: string) => setEditingId(comboId)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}