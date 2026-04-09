"use server";

import { createClient } from "@/lib/supabase/server";
import type {
    Combo,
    ComboDetalle,
    ComboFormData,
    ComboItem,
    Producto,
    Servicio,
} from "@/types";

async function requireAdmin() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("No autorizado");
    }

    const { data: perfil, error } = await supabase
        .from("usuarios_app")
        .select("rol, activo")
        .eq("id", user.id)
        .eq("activo", true)
        .maybeSingle();

    if (error || !perfil || perfil.rol !== "admin") {
        throw new Error("No autorizado");
    }

    return supabase;
}

function normalizeNullableText(value: string | null | undefined) {
    const text = value?.trim();
    return text ? text : null;
}

function normalizeNumber(value: string | number | null | undefined) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    const text = String(value ?? "").trim();

    if (!text) {
        return 0;
    }

    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
}

function validateComboItems(items: ComboFormData["items"]) {
    if (!items.length) {
        throw new Error("Debes agregar al menos un item al combo");
    }

    const invalidItem = items.some((item) => {
        const cantidad = normalizeNumber(item.cantidad);
        const precioUnitario = normalizeNumber(item.precio_unitario);

        if (item.tipo_item !== "servicio" && item.tipo_item !== "producto") {
            return true;
        }

        if (!item.nombre_item.trim()) {
            return true;
        }

        if (cantidad <= 0) {
            return true;
        }

        if (precioUnitario < 0) {
            return true;
        }

        if (item.tipo_item === "servicio" && !item.servicio_id) {
            return true;
        }

        if (item.tipo_item === "producto" && !item.producto_id) {
            return true;
        }

        return false;
    });

    if (invalidItem) {
        throw new Error("Revisa los items del combo");
    }
}

export async function getServiciosActivosForCombo(): Promise<Servicio[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("servicios")
        .select("*")
        .eq("activo", true)
        .order("nombre", { ascending: true });

    if (error) {
        console.error("Error al obtener servicios activos:", error.message);
        throw new Error("No se pudieron cargar los servicios");
    }

    return (data ?? []) as Servicio[];
}

export async function getProductosActivosForCombo(): Promise<Producto[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("activo", true)
        .order("nombre", { ascending: true });

    if (error) {
        console.error("Error al obtener productos activos:", error.message);
        throw new Error("No se pudieron cargar los productos");
    }

    return (data ?? []) as Producto[];
}

export async function getCombos(): Promise<Combo[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("combos")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error al obtener combos:", error.message);
        throw new Error("No se pudieron cargar los combos");
    }

    return (data ?? []) as Combo[];
}

export async function getCombosActivos(): Promise<Combo[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("combos")
        .select("*")
        .eq("activo", true)
        .order("nombre", { ascending: true });

    if (error) {
        console.error("Error al obtener combos activos:", error.message);
        throw new Error("No se pudieron cargar los combos");
    }

    return (data ?? []) as Combo[];
}

export async function getComboDetalle(comboId: string): Promise<ComboDetalle> {
    const supabase = await createClient();

    const { data: combo, error: comboError } = await supabase
        .from("combos")
        .select("*")
        .eq("id", comboId)
        .single();

    if (comboError || !combo) {
        console.error("Error al obtener combo:", comboError?.message);
        throw new Error("No se pudo obtener el combo");
    }

    const { data: items, error: itemsError } = await supabase
        .from("combo_items")
        .select("*")
        .eq("combo_id", comboId)
        .order("orden", { ascending: true })
        .order("created_at", { ascending: true });

    if (itemsError) {
        console.error("Error al obtener items del combo:", itemsError.message);
        throw new Error("No se pudieron cargar los items del combo");
    }

    return {
        ...(combo as Combo),
        items: (items ?? []) as ComboItem[],
    };
}
export async function createCombo(payload: ComboFormData): Promise<ComboDetalle> {
    const supabase = await requireAdmin();

    const nombre = payload.nombre.trim();
    const categoria = payload.categoria.trim();
    const descripcion = normalizeNullableText(payload.descripcion);
    const precioCombo = normalizeNumber(payload.precio_combo);
    const activo = payload.activo;

    if (!nombre) {
        throw new Error("El nombre del combo es obligatorio");
    }

    if (!categoria) {
        throw new Error("La categoría del combo es obligatoria");
    }

    validateComboItems(payload.items);

    const { data: combo, error: comboError } = await supabase
        .from("combos")
        .insert([
            {
                nombre,
                categoria,
                descripcion,
                precio_combo: precioCombo,
                activo,
            },
        ])
        .select()
        .single();

    if (comboError || !combo) {
        console.error("Error al crear combo:", comboError?.message);
        throw new Error(comboError?.message || "No se pudo crear el combo");
    }

    const rows = payload.items.map((item, index) => ({
        combo_id: combo.id,
        tipo_item: item.tipo_item,
        servicio_id: item.tipo_item === "servicio" ? item.servicio_id || null : null,
        producto_id: item.tipo_item === "producto" ? item.producto_id || null : null,
        nombre_item: item.nombre_item.trim(),
        cantidad: normalizeNumber(item.cantidad),
        precio_unitario: normalizeNumber(item.precio_unitario),
        orden: index,
    }));

    const { data: comboItems, error: itemsError } = await supabase
        .from("combo_items")
        .insert(rows)
        .select();

    if (itemsError) {
        console.error("Error al crear items del combo:", itemsError.message);

        const { error: rollbackError } = await supabase
            .from("combos")
            .delete()
            .eq("id", combo.id);

        if (rollbackError) {
            console.error(
                "Error al revertir combo tras fallo de items:",
                rollbackError.message
            );
        }

        throw new Error(
            "No se pudieron guardar los items del combo. El alta fue revertida."
        );
    }

    return {
        ...(combo as Combo),
        items: (comboItems ?? []) as ComboItem[],
    };
}

export async function updateCombo(
    comboId: string,
    payload: ComboFormData
): Promise<ComboDetalle> {
    const supabase = await requireAdmin();

    const nombre = payload.nombre.trim();
    const categoria = payload.categoria.trim();
    const descripcion = normalizeNullableText(payload.descripcion);
    const precioCombo = normalizeNumber(payload.precio_combo);
    const activo = payload.activo;

    if (!nombre) {
        throw new Error("El nombre del combo es obligatorio");
    }

    if (!categoria) {
        throw new Error("La categoría del combo es obligatoria");
    }

    validateComboItems(payload.items);

    const { data: combo, error: comboError } = await supabase
        .from("combos")
        .update({
            nombre,
            categoria,
            descripcion,
            precio_combo: precioCombo,
            activo,
        })
        .eq("id", comboId)
        .select()
        .single();

    if (comboError || !combo) {
        console.error("Error al actualizar combo:", comboError?.message);
        throw new Error(comboError?.message || "No se pudo actualizar el combo");
    }

    const { error: deleteItemsError } = await supabase
        .from("combo_items")
        .delete()
        .eq("combo_id", comboId);

    if (deleteItemsError) {
        console.error(
            "Error al limpiar items anteriores del combo:",
            deleteItemsError.message
        );
        throw new Error("No se pudieron actualizar los items del combo");
    }

    const rows = payload.items.map((item, index) => ({
        combo_id: comboId,
        tipo_item: item.tipo_item,
        servicio_id: item.tipo_item === "servicio" ? item.servicio_id || null : null,
        producto_id: item.tipo_item === "producto" ? item.producto_id || null : null,
        nombre_item: item.nombre_item.trim(),
        cantidad: normalizeNumber(item.cantidad),
        precio_unitario: normalizeNumber(item.precio_unitario),
        orden: index,
    }));

    const { data: comboItems, error: itemsError } = await supabase
        .from("combo_items")
        .insert(rows)
        .select();

    if (itemsError) {
        console.error("Error al reinsertar items del combo:", itemsError.message);
        throw new Error("El combo se actualizó, pero falló la carga de sus items");
    }

    return {
        ...(combo as Combo),
        items: (comboItems ?? []) as ComboItem[],
    };
}

export async function toggleComboActivo(
    comboId: string,
    activo: boolean
): Promise<Combo> {
    const supabase = await requireAdmin();

    const { data, error } = await supabase
        .from("combos")
        .update({ activo })
        .eq("id", comboId)
        .select()
        .single();

    if (error || !data) {
        console.error("Error al cambiar estado del combo:", error?.message);
        throw new Error("No se pudo cambiar el estado del combo");
    }

    return data as Combo;
}

export async function deleteCombo(comboId: string) {
    const supabase = await requireAdmin();

    const { error } = await supabase.from("combos").delete().eq("id", comboId);

    if (error) {
        console.error("Error al eliminar combo:", error.message);
        throw new Error(error.message || "No se pudo eliminar el combo");
    }

    return { success: true };
}

export async function getComboForOrden(comboId: string) {
    const supabase = await createClient();

    const { data: combo, error: comboError } = await supabase
        .from("combos")
        .select("*")
        .eq("id", comboId)
        .eq("activo", true)
        .single();

    if (comboError || !combo) {
        console.error("Error al obtener combo para orden:", comboError?.message);
        throw new Error("No se pudo obtener el combo");
    }

    const { data: items, error: itemsError } = await supabase
        .from("combo_items")
        .select("*")
        .eq("combo_id", comboId)
        .order("orden", { ascending: true })
        .order("created_at", { ascending: true });

    if (itemsError) {
        console.error(
            "Error al obtener items del combo para orden:",
            itemsError.message
        );
        throw new Error("No se pudieron cargar los items del combo");
    }

    return {
        combo,
        items: items ?? [],
    };
}

export async function getCombosConDetalle(): Promise<ComboDetalle[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("combos")
        .select(`
      *,
      combo_items (
        id,
        tipo_item,
        nombre_item,
        cantidad,
        precio_unitario,
        orden,
        servicio_id,
        producto_id
      )
    `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error al obtener combos con detalle:", error.message);
        throw new Error("No se pudieron cargar los combos");
    }

    type ComboItemOrdenable = {
        orden: number | null;
    };

    return (data ?? []).map((combo) => ({
        ...combo,
        items: (combo.combo_items ?? []).sort(
            (a: ComboItemOrdenable, b: ComboItemOrdenable) =>
                (a.orden ?? 0) - (b.orden ?? 0)
        ),
    })) as ComboDetalle[];
}