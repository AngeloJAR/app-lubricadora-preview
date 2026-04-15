import type {
    OrdenEstado,
    OrdenEstadoPago,
    RolOrdenUI,
} from "@/lib/core/ordenes/reglas";
import {
    puedeCobrarOrden,
    puedeEditarOrden,
    puedeEntregarOrden,
    puedeFinalizarTrabajoOrden,
    puedeIniciarTrabajoOrden,
} from "@/lib/core/ordenes/reglas";

export function puedeVerTotalesOrden(rol: RolOrdenUI) {
    return rol === "admin" || rol === "recepcion";
}

export function puedeImprimirOrden(rol: RolOrdenUI) {
    return rol === "admin" || rol === "recepcion";
}

export function puedeEnviarWhatsappOrden(rol: RolOrdenUI) {
    return rol === "admin" || rol === "recepcion";
}

export function puedeEditarOrdenPorRolYEstado(
    rol: RolOrdenUI,
    estado: OrdenEstado
) {
    if (rol === "tecnico") return false;

    return puedeEditarOrden(estado);
}

export function puedeCobrarOrdenUI(
    rol: RolOrdenUI,
    estado: OrdenEstado,
    estadoPago: OrdenEstadoPago
) {
    if (rol !== "admin" && rol !== "recepcion") return false;

    return puedeCobrarOrden(estado, estadoPago);
}

export function puedeIniciarTrabajoOrdenUI(
    rol: RolOrdenUI,
    estado: OrdenEstado
) {
    if (rol !== "tecnico") return false;

    return puedeIniciarTrabajoOrden(estado);
}

export function puedeFinalizarTrabajoOrdenUI(
    rol: RolOrdenUI,
    estado: OrdenEstado
) {
    if (rol !== "tecnico") return false;

    return puedeFinalizarTrabajoOrden(estado);
}

export function esOrdenSoloLecturaUI(estado: OrdenEstado) {
    return estado === "entregada" || estado === "cancelada";
}

export function puedeEntregarOrdenUI(
    rol: RolOrdenUI,
    estado: OrdenEstado,
    estadoPago: OrdenEstadoPago
) {
    if (rol !== "admin" && rol !== "recepcion") return false;

    return puedeEntregarOrden(estado, estadoPago);
}

export function puedeVerAccionesAdminOrden(rol: RolOrdenUI) {
    return rol === "admin" || rol === "recepcion";
}

export function puedeVerAccionesTecnicoOrden(rol: RolOrdenUI) {
    return rol === "tecnico";
}

export function getEstadosDisponiblesOrdenUI(
    rol: RolOrdenUI,
    estadoActual: OrdenEstado
): OrdenEstado[] {
    if (rol === "tecnico") {
        const permitidosTecnico: Record<OrdenEstado, OrdenEstado[]> = {
            pendiente: ["pendiente", "en_proceso"],
            en_proceso: ["en_proceso", "completada"],
            completada: ["completada"],
            entregada: ["entregada"],
            cancelada: ["cancelada"],
        };

        return permitidosTecnico[estadoActual] ?? [estadoActual];
    }

    const permitidosAdminRecepcion: Record<OrdenEstado, OrdenEstado[]> = {
        pendiente: ["pendiente", "en_proceso", "cancelada"],
        en_proceso: ["pendiente", "en_proceso", "completada", "cancelada"],
        completada: [
            "pendiente",
            "en_proceso",
            "completada",
            "entregada",
            "cancelada",
        ],
        entregada: ["entregada"],
        cancelada: ["cancelada"],
    };

    return permitidosAdminRecepcion[estadoActual] ?? [estadoActual];
}