"use server";

import { createClient } from "@/lib/supabase/server";
import { registrarAuditoriaLog } from "@/lib/core/auditoria/logs";
import type { OrdenFormData } from "@/types";

export async function deleteOrdenCancelada(ordenId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("No autorizado");
    }

    const { data: perfil } = await supabase
        .from("usuarios_app")
        .select("rol, activo")
        .eq("id", user.id)
        .eq("activo", true)
        .maybeSingle();

    if (!perfil || perfil.rol !== "admin") {
        throw new Error("No tienes permisos para borrar la orden");
    }

    const { data: orden } = await supabase
        .from("ordenes_trabajo")
        .select("id, estado")
        .eq("id", ordenId)
        .single();

    if (!orden) {
        throw new Error("Orden no encontrada");
    }

    if (orden.estado !== "cancelada") {
        throw new Error("Solo se pueden borrar órdenes canceladas");
    }

    const { error: deleteItemsError } = await supabase
        .from("orden_items")
        .delete()
        .eq("orden_id", ordenId);

    if (deleteItemsError) {
        throw new Error("Error al borrar items de la orden");
    }

    const { error: deleteOrdenError } = await supabase
        .from("ordenes_trabajo")
        .delete()
        .eq("id", ordenId);

    if (deleteOrdenError) {
        throw new Error("Error al borrar la orden");
    }

    await registrarAuditoriaLog({
        supabase,
        usuario_id: user.id,
        entidad: "orden",
        entidad_id: ordenId,
        accion: "delete",
        descripcion: "Orden cancelada eliminada permanentemente",
    });

    return true;
}

export async function createOrden(payload: OrdenFormData) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("No autorizado");
    }

    if (!payload.items?.length) {
        throw new Error("Debes agregar al menos un item.");
    }

    const numero = `ORD-${Date.now()}`;

    const subtotal = payload.items.reduce(
        (acc, item) =>
            acc +
            Number(item.cantidad || 0) * Number(item.precio_unitario || 0),
        0
    );

    const descuento = Number(payload.descuento || 0);
    const descuentoPuntos = Number(payload.descuento_puntos || 0);
    const total = subtotal - descuento - descuentoPuntos;

    const { data: orden, error: ordenError } = await supabase
        .from("ordenes_trabajo")
        .insert([
            {
                numero,
                cliente_id: payload.cliente_id,
                vehiculo_id: payload.vehiculo_id,
                tecnico_id: payload.tecnico_id || null,
                kilometraje: payload.kilometraje?.trim()
                    ? Number(payload.kilometraje)
                    : null,
                subtotal,
                descuento,
                descuento_puntos: descuentoPuntos,
                puntos_usados: Number(payload.puntos_canjear || 0),
                total,
                notas: payload.notas || null,
                proximo_mantenimiento_fecha:
                    payload.proximo_mantenimiento_fecha?.trim() || null,
                proximo_mantenimiento_km: payload.proximo_mantenimiento_km?.trim()
                    ? Number(payload.proximo_mantenimiento_km)
                    : null,
            },
        ])
        .select()
        .single();

    if (ordenError || !orden) {
        throw new Error("No se pudo crear la orden");
    }

    const itemsToInsert = payload.items
        .map((item: OrdenFormData["items"][number]) => {
            if (!item) return null;

            return {
                orden_id: orden.id,
                tipo_item: item.tipo_item,
                servicio_id: item.servicio_id || null,
                producto_id: item.producto_id || null,
                nombre_item: item.nombre_item,
                cantidad: Number(item.cantidad || 1),
                precio_unitario: Number(item.precio_unitario || 0),
                total:
                    Number(item.cantidad || 1) *
                    Number(item.precio_unitario || 0),
            };
        })
        .filter(Boolean);

    const { error: itemsError } = await supabase
        .from("orden_items")
        .insert(itemsToInsert);

    if (itemsError) {
        throw new Error(itemsError.message);
    }

    await registrarAuditoriaLog({
        supabase,
        usuario_id: user.id,
        entidad: "orden",
        entidad_id: orden.id,
        accion: "crear",
        descripcion: `Orden creada ${numero}`,
    });

    return orden;
}
export async function updateOrden(
    ordenId: string,
    payload: OrdenFormData
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("No autorizado");
    }

    const { data: ordenActual, error: ordenActualError } = await supabase
        .from("ordenes_trabajo")
        .select("id, numero, estado")
        .eq("id", ordenId)
        .single();

    if (ordenActualError || !ordenActual) {
        throw new Error("No se pudo obtener la orden actual");
    }

    if (
        ordenActual.estado === "entregada" ||
        ordenActual.estado === "cancelada" ||
        ordenActual.estado === "completada"
    ) {
        throw new Error("No se puede editar esta orden.");
    }

    const subtotal = payload.items.reduce(
        (acc, item) =>
            acc +
            Number(item.cantidad || 0) * Number(item.precio_unitario || 0),
        0
    );

    const descuento = Number(payload.descuento || 0);
    const descuentoPuntos = Number(payload.descuento_puntos || 0);
    const total = subtotal - descuento - descuentoPuntos;

    const { error: updateError } = await supabase
        .from("ordenes_trabajo")
        .update({
            cliente_id: payload.cliente_id,
            vehiculo_id: payload.vehiculo_id,
            tecnico_id: payload.tecnico_id || null,
            kilometraje: payload.kilometraje?.trim()
                ? Number(payload.kilometraje)
                : null,
            subtotal,
            descuento,
            descuento_puntos: descuentoPuntos,
            puntos_usados: Number(payload.puntos_canjear || 0),
            total,
            notas: payload.notas || null,
            proximo_mantenimiento_fecha:
                payload.proximo_mantenimiento_fecha?.trim() || null,
            proximo_mantenimiento_km: payload.proximo_mantenimiento_km?.trim()
                ? Number(payload.proximo_mantenimiento_km)
                : null,
        })
        .eq("id", ordenId);

    if (updateError) {
        throw new Error("No se pudo actualizar la orden");
    }

    const { error: deleteItemsError } = await supabase
        .from("orden_items")
        .delete()
        .eq("orden_id", ordenId);

    if (deleteItemsError) {
        throw new Error("No se pudieron actualizar los items");
    }

    const itemsToInsert = payload.items
        .map((item: OrdenFormData["items"][number]) => {
            if (!item) return null;

            return {
                orden_id: ordenId,
                tipo_item: item.tipo_item,
                servicio_id: item.servicio_id || null,
                producto_id: item.producto_id || null,
                nombre_item: item.nombre_item,
                cantidad: Number(item.cantidad || 1),
                precio_unitario: Number(item.precio_unitario || 0),
                total:
                    Number(item.cantidad || 1) *
                    Number(item.precio_unitario || 0),
            };
        })
        .filter(Boolean);

    const { error: insertItemsError } = await supabase
        .from("orden_items")
        .insert(itemsToInsert);

    if (insertItemsError) {
        throw new Error(insertItemsError.message);
    }

    await registrarAuditoriaLog({
        supabase,
        usuario_id: user.id,
        entidad: "orden",
        entidad_id: ordenId,
        accion: "update",
        descripcion: "Orden actualizada",
    });

    return { success: true };
}