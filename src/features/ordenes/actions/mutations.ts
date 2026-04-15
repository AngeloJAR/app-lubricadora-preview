"use server";

import { createClient } from "@/lib/supabase/server";
import { registrarAuditoriaLog } from "@/lib/core/auditoria/logs";
import type { OrdenFormData } from "@/types";
import { registrarMovimientoStock } from "@/lib/core/stock/registrar-movimiento";

type OrdenItemInsert = {
    orden_id: string;
    tipo_item: "servicio" | "producto";
    servicio_id: string | null;
    producto_id: string | null;
    nombre_item: string;
    cantidad: number;
    precio_unitario: number;
    total: number;
};

function isOrdenItemInsert(
    value: OrdenItemInsert | null
): value is OrdenItemInsert {
    return value !== null;
}
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
    const { data: itemsOrden, error: itemsOrdenError } = await supabase
        .from("orden_items")
        .select("producto_id, cantidad, tipo_item")
        .eq("orden_id", ordenId);

    if (itemsOrdenError) {
        throw new Error("No se pudieron obtener los items de la orden");
    }

    for (const item of itemsOrden ?? []) {
        if (item.tipo_item === "producto" && item.producto_id) {
            await registrarMovimientoStock({
                supabase,
                producto_id: item.producto_id,
                tipo: "entrada",
                cantidad: Number(item.cantidad),
                motivo: "cancelacion",
                referencia_tipo: "orden",
                referencia_id: ordenId,
            });
        }
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
    if (total < 0) {
        throw new Error("El total no puede ser negativo");
    }
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
                total_pagado: 0,
                saldo_pendiente: total,
                estado_pago: "pendiente",
                fecha_pago: null,
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

    const itemsToInsert: OrdenItemInsert[] = payload.items
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
        .filter(isOrdenItemInsert);

    const { error: itemsError } = await supabase
        .from("orden_items")
        .insert(itemsToInsert);

    if (itemsError) {
        throw new Error(itemsError.message);
    }
    const tecnicosIdsUnicos = Array.from(
        new Set(
            [payload.tecnico_id, ...(payload.tecnicos_ids ?? [])].filter(
                (id): id is string => Boolean(id)
            )
        )
    );

    if (tecnicosIdsUnicos.length > 0) {
        const tecnicosRows = tecnicosIdsUnicos.map((tecnicoId) => ({
            orden_id: orden.id,
            tecnico_id: tecnicoId,
            es_principal: tecnicoId === payload.tecnico_id,
        }));

        const { error: tecnicosError } = await supabase
            .from("ordenes_tecnicos")
            .insert(tecnicosRows);

        if (tecnicosError) {
            throw new Error("No se pudieron guardar los técnicos asignados");
        }
    }
    for (const item of itemsToInsert) {
        if (item.tipo_item === "producto" && item.producto_id) {
            await registrarMovimientoStock({
                supabase,
                producto_id: item.producto_id,
                tipo: "salida",
                cantidad: Number(item.cantidad),
                motivo: "venta",
                referencia_tipo: "orden",
                referencia_id: orden.id,
            });
        }
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

    if (total < 0) {
        throw new Error("El total no puede ser negativo");
    }
    const { data: pagosActuales, error: pagosActualesError } = await supabase
        .from("orden_pagos")
        .select("monto")
        .eq("orden_id", ordenId);

    if (pagosActualesError) {
        throw new Error("No se pudieron obtener los pagos actuales de la orden");
    }

    const totalPagadoActual = (pagosActuales ?? []).reduce(
        (acc, item) => acc + Number(item.monto ?? 0),
        0
    );

    const saldoPendienteActualizado = Math.max(0, total - totalPagadoActual);

    const estadoPagoActualizado =
        totalPagadoActual <= 0
            ? "pendiente"
            : totalPagadoActual >= total
                ? "pagada"
                : "abonada";

    const fechaPagoActualizada =
        estadoPagoActualizado === "pagada" ? new Date().toISOString() : null;
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
            total_pagado: totalPagadoActual,
            saldo_pendiente: saldoPendienteActualizado,
            estado_pago: estadoPagoActualizado,
            fecha_pago: fechaPagoActualizada,
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
    const { data: itemsActuales } = await supabase
        .from("orden_items")
        .select("producto_id, cantidad, tipo_item")
        .eq("orden_id", ordenId);

    for (const item of itemsActuales ?? []) {
        if (item.tipo_item === "producto" && item.producto_id) {
            await registrarMovimientoStock({
                supabase,
                producto_id: item.producto_id,
                tipo: "entrada",
                cantidad: Number(item.cantidad),
                motivo: "ajuste_edicion",
                referencia_tipo: "orden",
                referencia_id: ordenId,
            });
        }
    }

    const { error: deleteItemsError } = await supabase
        .from("orden_items")
        .delete()
        .eq("orden_id", ordenId);

    if (deleteItemsError) {
        throw new Error("No se pudieron actualizar los items");
    }
    const itemsToInsert: OrdenItemInsert[] = payload.items
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
        .filter(isOrdenItemInsert);

    const { error: insertItemsError } = await supabase
        .from("orden_items")
        .insert(itemsToInsert);

    if (insertItemsError) {
        throw new Error(insertItemsError.message);
    }

    for (const item of itemsToInsert) {
        if (item.tipo_item === "producto" && item.producto_id) {
            await registrarMovimientoStock({
                supabase,
                producto_id: item.producto_id,
                tipo: "salida",
                cantidad: Number(item.cantidad),
                motivo: "venta",
                referencia_tipo: "orden",
                referencia_id: ordenId,
            });
        }
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