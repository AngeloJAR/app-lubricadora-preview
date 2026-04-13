"use client";

import type { OrdenDetalle } from "@/types";
import { OrdenDetalleAdminView } from "./orden-detalle-admin-view";
import { OrdenDetalleTecnicoView } from "./orden-detalle-tecnico-view";


type OrdenDetalleViewProps = {
  orden: OrdenDetalle;
  canManageOrden: boolean;
  rol: "admin" | "recepcion" | "tecnico";
};

export function OrdenDetalleView({
  orden,
  canManageOrden,
  rol,
}: OrdenDetalleViewProps) {
  if (rol === "tecnico") {
    return <OrdenDetalleTecnicoView orden={orden} />;
  }

  return (
    <OrdenDetalleAdminView
      orden={orden}
      canManageOrden={canManageOrden}
      rol={rol}
    />
  );
}