"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

import type {
  CrearFacturaCompraInput,
  CrearPagoProveedorInput,
  CrearProveedorInput,
  FacturaCompra,
  PagoProveedor,
  ProductoLite,
  Proveedor,
} from "@/types";

function toNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function normalizeUnidadCompra(
  value?: string | null
): "unidad" | "caja" | "galon" | "cuarto" {
  if (
    value === "unidad" ||
    value === "caja" ||
    value === "galon" ||
    value === "cuarto"
  ) {
    return value;
  }

  return "unidad";
}

function normalizeMetodoPagoProveedor(
  value?: PagoProveedor["metodo_pago"] | null
): PagoProveedor["metodo_pago"] {
  if (
    value === "efectivo" ||
    value === "transferencia" ||
    value === "deuna" ||
    value === "tarjeta" ||
    value === "otro"
  ) {
    return value;
  }

  return "efectivo";
}

function resolveCuentaFromMetodoPagoProveedor(
  metodo: PagoProveedor["metodo_pago"]
): "caja" | "banco" | "deuna" | "tarjeta_por_cobrar" {
  if (metodo === "efectivo") return "caja";
  if (metodo === "deuna") return "deuna";
  if (metodo === "tarjeta") return "tarjeta_por_cobrar";
  return "banco";
}

function normalizeCuentaDinero(
  value?: string | null
): "caja" | "banco" | "deuna" | "tarjeta_por_cobrar" {
  if (
    value === "caja" ||
    value === "banco" ||
    value === "deuna" ||
    value === "tarjeta_por_cobrar"
  ) {
    return value;
  }

  return "banco";
}

function normalizeOrigenFondo(
  value?: string | null
): "negocio" | "prestamo" | "personal" | "socio" {
  if (
    value === "negocio" ||
    value === "prestamo" ||
    value === "personal" ||
    value === "socio"
  ) {
    return value;
  }

  return "negocio";
}

function normalizeNaturalezaMovimiento(
  value?: string | null
): "ingreso_operativo" | "gasto_operativo" | "aporte" | "prestamo_recibido" | "pago_prestamo" | "retiro_dueno" | "transferencia_interna" {
  if (
    value === "ingreso_operativo" ||
    value === "gasto_operativo" ||
    value === "aporte" ||
    value === "prestamo_recibido" ||
    value === "pago_prestamo" ||
    value === "retiro_dueno" ||
    value === "transferencia_interna"
  ) {
    return value;
  }

  return "gasto_operativo";
}




function metodoPagoProveedorToCaja(
  metodo: PagoProveedor["metodo_pago"]
): "efectivo" | "transferencia" | "tarjeta" | "mixto" {
  if (metodo === "efectivo") return "efectivo";
  if (metodo === "tarjeta") return "tarjeta";
  return "transferencia";
}

function calcularEstadoPago(
  total: number,
  totalPagado: number
): "pendiente" | "parcial" | "pagado" {
  if (totalPagado <= 0) return "pendiente";
  if (totalPagado >= total) return "pagado";
  return "parcial";
}

async function requireAdminOrRecepcion() {
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

  if (
    error ||
    !perfil ||
    (perfil.rol !== "admin" && perfil.rol !== "recepcion")
  ) {
    throw new Error("No autorizado");
  }

  return { supabase, user, perfil };
}

async function getCajaAbiertaInterna() {
  const { supabase } = await requireAdminOrRecepcion();

  const { data, error } = await supabase
    .from("cajas")
    .select("id, estado")
    .eq("estado", "abierta")
    .order("fecha_apertura", { ascending: false })
    .maybeSingle();

  if (error) {
    console.error("Error obteniendo caja abierta para compras:", error.message);
    throw new Error("No se pudo verificar la caja abierta");
  }

  return data ?? null;
}
async function revertirStockCompraParcial(
  supabase: Awaited<ReturnType<typeof createClient>>,
  movimientosAplicados: Array<{
    producto_id: string;
    stock_anterior: number;
    movimiento_id?: string | null;
  }>
) {
  for (const movimiento of movimientosAplicados.reverse()) {
    const { error: restoreError } = await supabase
      .from("productos")
      .update({
        stock: movimiento.stock_anterior,
      })
      .eq("id", movimiento.producto_id);

    if (restoreError) {
      console.error(
        "Error revertirStockCompraParcial restaurando producto:",
        restoreError
      );
    }

    if (movimiento.movimiento_id) {
      const { error: deleteMovError } = await supabase
        .from("producto_movimientos")
        .delete()
        .eq("id", movimiento.movimiento_id);

      if (deleteMovError) {
        console.error(
          "Error revertirStockCompraParcial eliminando movimiento:",
          deleteMovError
        );
      }
    }
  }
}

export async function getProveedores(): Promise<Proveedor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("proveedores")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error getProveedores:", error);
    throw new Error("No se pudieron obtener los proveedores.");
  }

  return (data ?? []) as Proveedor[];
}

export async function createProveedor(
  input: CrearProveedorInput
): Promise<Proveedor> {
  const { supabase } = await requireAdminOrRecepcion();

  const nombre = input.nombre.trim();

  if (!nombre) {
    throw new Error("El nombre del proveedor es obligatorio.");
  }

  const { data, error } = await supabase
    .from("proveedores")
    .insert({
      nombre,
      email: normalizeText(input.email),
      telefono: normalizeText(input.telefono),
      ruc: normalizeText(input.ruc),
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Error createProveedor:", error);
    throw new Error("No se pudo crear el proveedor.");
  }

  revalidatePath("/compras");
  return data as Proveedor;
}

export async function getProductosLite(): Promise<ProductoLite[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("productos")
    .select(
      "id, nombre, categoria, marca, stock, precio_compra, precio_venta, activo"
    )
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error getProductosLite:", error);
    throw new Error("No se pudieron obtener los productos.");
  }

  return ((data ?? []) as ProductoLite[]).map((item) => ({
    ...item,
    stock: toNumber(item.stock, 0),
    precio_compra: toNumber(item.precio_compra, 0),
    precio_venta: toNumber(item.precio_venta, 0),
  }));
}

export async function getFacturasCompra(
  options?: {
    incluirPagadas?: boolean;
  }
): Promise<
  Array<
    FacturaCompra & {
      proveedor: Pick<Proveedor, "id" | "nombre" | "ruc"> | null;
    }
  >
> {
  const supabase = await createClient();

  let query = supabase
    .from("facturas_compra")
    .select(`
      *,
      proveedor:proveedores (
        id,
        nombre,
        ruc
      )
    `);

  if (!options?.incluirPagadas) {
    query = query.in("estado_pago", ["pendiente", "parcial"]);
  }

  const { data, error } = await query
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error getFacturasCompra:", error);
    throw new Error("No se pudieron obtener las facturas de compra.");
  }

  return ((data ?? []) as Array<
    FacturaCompra & {
      proveedor:
      | Pick<Proveedor, "id" | "nombre" | "ruc">
      | Pick<Proveedor, "id" | "nombre" | "ruc">[]
      | null;
    }
  >).map((row) => ({
    ...row,
    subtotal: toNumber(row.subtotal, 0),
    iva: toNumber(row.iva, 0),
    total: toNumber(row.total, 0),
    total_pagado: toNumber(row.total_pagado, 0),
    saldo_pendiente: toNumber(row.saldo_pendiente, toNumber(row.total, 0)),
    proveedor: Array.isArray(row.proveedor)
      ? row.proveedor[0] ?? null
      : row.proveedor,
  }));
}

export async function getProductoAliasProveedor(
  proveedorId: string
): Promise<Array<{ id: string; nombre_original: string; producto_id: string }>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("producto_alias_proveedor")
    .select("id, nombre_original, producto_id")
    .eq("proveedor_id", proveedorId)
    .order("nombre_original", { ascending: true });

  if (error) {
    console.error("Error getProductoAliasProveedor:", error);
    throw new Error("No se pudieron obtener los alias del proveedor.");
  }

  return data ?? [];
}

export async function getProductoAliasProveedorMap(proveedorId: string) {
  const supabase = await createClient();

  if (!proveedorId) {
    return {} as Record<string, string>;
  }

  const { data, error } = await supabase
    .from("producto_alias_proveedor")
    .select("nombre_original, producto_id")
    .eq("proveedor_id", proveedorId);

  if (error) {
    console.error("Error getProductoAliasProveedorMap:", error);
    throw new Error("No se pudieron obtener los alias del proveedor.");
  }

  return (data ?? []).reduce<Record<string, string>>((acc, item) => {
    const key = item.nombre_original?.trim().toLowerCase();
    const productoId = item.producto_id?.trim();

    if (key && productoId) {
      acc[key] = productoId;
    }

    return acc;
  }, {});
}

export async function createProductoAliasProveedor(params: {
  proveedor_id: string;
  nombre_original: string;
  producto_id: string;
}) {
  const supabase = await createClient();

  const nombreOriginal = params.nombre_original.trim();

  if (!params.proveedor_id) {
    throw new Error("Proveedor inválido.");
  }

  if (!nombreOriginal) {
    throw new Error("El nombre original del producto es obligatorio.");
  }

  if (!params.producto_id) {
    throw new Error("El producto es obligatorio.");
  }

  const { data, error } = await supabase
    .from("producto_alias_proveedor")
    .upsert(
      {
        proveedor_id: params.proveedor_id,
        nombre_original: nombreOriginal,
        producto_id: params.producto_id,
      },
      {
        onConflict: "proveedor_id,nombre_original",
      }
    )
    .select("*")
    .single();

  if (error || !data) {
    console.error("Error createProductoAliasProveedor:", error);
    throw new Error("No se pudo guardar el alias del proveedor.");
  }

  revalidatePath("/compras");
  return data;
}

export async function createFacturaCompra(input: CrearFacturaCompraInput) {
  const { supabase, user } = await requireAdminOrRecepcion();

  if (!input.proveedor_id) {
    throw new Error("Debes seleccionar un proveedor.");
  }

  if (!input.numero_factura.trim()) {
    throw new Error("El número de factura es obligatorio.");
  }

  if (!input.fecha) {
    throw new Error("La fecha de la factura es obligatoria.");
  }

  if (!input.items || input.items.length === 0) {
    throw new Error("Debes agregar al menos un item a la factura.");
  }

  const itemsNormalizados = input.items.map((item) => {
    const cantidad = toNumber(item.cantidad, 0);
    const costo_unitario = toNumber(item.costo_unitario, 0);
    if (cantidad <= 0) {
      throw new Error(
        `La cantidad debe ser mayor a 0 en el item: ${item.descripcion_original || "sin descripción"}.`
      );
    }

    if (costo_unitario < 0) {
      throw new Error(
        `El costo unitario no puede ser negativo en el item: ${item.descripcion_original || "sin descripción"}.`
      );
    }
    const unidad_compra = normalizeUnidadCompra(item.unidad_compra);
    const factor_conversion = Math.max(
      1,
      toNumber(item.factor_conversion, 1)
    );

    const cantidad_base =
      item.cantidad_base !== undefined
        ? toNumber(item.cantidad_base, 0)
        : cantidad * factor_conversion;

    const subtotalCalculado =
      item.subtotal !== undefined
        ? toNumber(item.subtotal, 0)
        : cantidad * costo_unitario;

    const ivaCalculado =
      item.iva !== undefined ? toNumber(item.iva, 0) : 0;

    const totalCalculado =
      item.total !== undefined
        ? toNumber(item.total, 0)
        : subtotalCalculado + ivaCalculado;

    return {
      descripcion_original: item.descripcion_original.trim(),
      producto_id: item.producto_id ?? null,
      cantidad,
      costo_unitario,
      unidad_compra,
      factor_conversion,
      cantidad_base,
      subtotal: subtotalCalculado,
      iva: ivaCalculado,
      total: totalCalculado,
    };
  });

  const hayDescripcionVacia = itemsNormalizados.some(
    (item) => !item.descripcion_original
  );

  if (hayDescripcionVacia) {
    throw new Error("Todos los items deben tener descripción.");
  }

  const subtotal =
    input.subtotal !== undefined
      ? toNumber(input.subtotal, 0)
      : itemsNormalizados.reduce((acc, item) => acc + item.subtotal, 0);

  const iva =
    input.iva !== undefined
      ? toNumber(input.iva, 0)
      : itemsNormalizados.reduce((acc, item) => acc + item.iva, 0);

  const total =
    input.total !== undefined
      ? toNumber(input.total, 0)
      : itemsNormalizados.reduce((acc, item) => acc + item.total, 0);

  const { data: factura, error: facturaError } = await supabase
    .from("facturas_compra")
    .insert({
      proveedor_id: input.proveedor_id,
      numero_factura: input.numero_factura.trim(),
      fecha: input.fecha,
      subtotal,
      iva,
      total,
      estado: "pendiente",
      estado_pago: "pendiente",
      total_pagado: 0,
      saldo_pendiente: total,
      archivo_url: normalizeText(input.archivo_url),
      archivo_nombre: normalizeText(input.archivo_nombre),
      origen: input.origen ?? "manual",
      hash_documento: normalizeText(input.hash_documento),
      observaciones: normalizeText(input.observaciones),
    })
    .select("*")
    .single();

  if (facturaError || !factura) {
    console.error("Error createFacturaCompra factura:", facturaError);

    if (facturaError?.code === "23505") {
      throw new Error(
        "Ya existe una factura con ese número para este proveedor."
      );
    }

    throw new Error("No se pudo crear la factura de compra.");
  }

  const itemsInsert = itemsNormalizados.map((item) => ({
    factura_compra_id: factura.id,
    descripcion_original: item.descripcion_original,
    producto_id: item.producto_id,
    cantidad: item.cantidad,
    costo_unitario: item.costo_unitario,
    unidad_compra: item.unidad_compra,
    factor_conversion: item.factor_conversion,
    cantidad_base: item.cantidad_base,
    subtotal: item.subtotal,
    iva: item.iva,
    total: item.total,
  }));

  const { error: itemsError } = await supabase
    .from("facturas_compra_items")
    .insert(itemsInsert);

  if (itemsError) {
    console.error("Error createFacturaCompra items:", itemsError);

    await supabase.from("facturas_compra").delete().eq("id", factura.id);

    throw new Error("No se pudieron guardar los items de la factura.");
  }

  const itemsConProducto = itemsNormalizados.filter(
    (item) => item.producto_id && item.cantidad_base > 0
  );

  const movimientosAplicados: Array<{
    producto_id: string;
    stock_anterior: number;
    movimiento_id?: string | null;
  }> = [];

  try {
    for (const item of itemsConProducto) {
      const productoId = item.producto_id!;

      const { data: productoActual, error: productoError } = await supabase
        .from("productos")
        .select("id, stock, precio_compra")
        .eq("id", productoId)
        .single();

      if (productoError || !productoActual) {
        console.error(
          "Error createFacturaCompra producto stock:",
          productoError
        );

        throw new Error(
          `No se pudo obtener el stock del producto para ${item.descripcion_original}.`
        );
      }

      const stockActual = toNumber(productoActual.stock, 0);
      const cantidadBase = toNumber(item.cantidad_base, 0);
      const subtotalItem = toNumber(item.subtotal, 0);

      const nuevoStock = stockActual + cantidadBase;

      const costoUnitarioBase =
        cantidadBase > 0 ? subtotalItem / cantidadBase : 0;

      const { error: updateStockError } = await supabase
        .from("productos")
        .update({
          stock: nuevoStock,
          precio_compra: Number(costoUnitarioBase.toFixed(4)),
        })
        .eq("id", productoId);

      if (updateStockError) {
        console.error(
          "Error createFacturaCompra actualizando stock:",
          updateStockError
        );

        throw new Error(
          `No se pudo actualizar el stock para ${item.descripcion_original}.`
        );
      }

      const { data: movimientoCreado, error: movimientoError } = await supabase
        .from("producto_movimientos")
        .insert({
          producto_id: productoId,
          tipo: "entrada",
          cantidad: cantidadBase,
          costo_unitario: Number(costoUnitarioBase.toFixed(4)),
          precio_unitario: 0,
          total: subtotalItem,
          referencia_tipo: "factura_compra",
          referencia_id: factura.id,
        })
        .select("id")
        .single();

      if (movimientoError) {
        console.error(
          "Error createFacturaCompra movimiento producto:",
          movimientoError
        );

        throw new Error(
          `No se pudo registrar el movimiento de stock para ${item.descripcion_original}.`
        );
      }

      movimientosAplicados.push({
        producto_id: productoId,
        stock_anterior: stockActual,
        movimiento_id: movimientoCreado?.id ?? null,
      });
    }
  } catch (error) {
    await revertirStockCompraParcial(supabase, movimientosAplicados);

    await supabase
      .from("facturas_compra_items")
      .delete()
      .eq("factura_compra_id", factura.id);

    await supabase.from("facturas_compra").delete().eq("id", factura.id);

    throw error;
  }


  const aliasPendientes = itemsNormalizados.filter(
    (item) => item.producto_id && item.descripcion_original
  );

  if (aliasPendientes.length > 0) {
    const aliasRows = aliasPendientes.map((item) => ({
      proveedor_id: input.proveedor_id,
      nombre_original: item.descripcion_original,
      producto_id: item.producto_id!,
    }));

    const { error: aliasError } = await supabase
      .from("producto_alias_proveedor")
      .upsert(aliasRows, {
        onConflict: "proveedor_id,nombre_original",
      });

    if (aliasError) {
      console.error("Error createFacturaCompra alias:", aliasError);
    }
  }

  revalidatePath("/compras");

  return factura;
}

export async function getFacturaCompraDetalle(facturaId: string) {
  const supabase = await createClient();

  const { data: factura, error: facturaError } = await supabase
    .from("facturas_compra")
    .select(`
      *,
      proveedor:proveedores (
        id,
        nombre,
        email,
        telefono,
        ruc
      )
    `)
    .eq("id", facturaId)
    .single();

  if (facturaError || !factura) {
    console.error("Error getFacturaCompraDetalle factura:", facturaError);
    throw new Error("No se pudo obtener la factura.");
  }

  const { data: items, error: itemsError } = await supabase
    .from("facturas_compra_items")
    .select(`
      *,
      producto:productos (
        id,
        nombre,
        categoria,
        marca
      )
    `)
    .eq("factura_compra_id", facturaId)
    .order("created_at", { ascending: true });

  if (itemsError) {
    console.error("Error getFacturaCompraDetalle items:", itemsError);
    throw new Error("No se pudieron obtener los items de la factura.");
  }

  return {
    ...factura,
    subtotal: toNumber(factura.subtotal, 0),
    iva: toNumber(factura.iva, 0),
    total: toNumber(factura.total, 0),
    total_pagado: toNumber(factura.total_pagado, 0),
    saldo_pendiente: toNumber(
      factura.saldo_pendiente,
      toNumber(factura.total, 0)
    ),
    proveedor: Array.isArray(factura.proveedor)
      ? factura.proveedor[0] ?? null
      : factura.proveedor,
    items: (items ?? []).map((item) => ({
      ...item,
      cantidad: toNumber(item.cantidad, 0),
      costo_unitario: toNumber(item.costo_unitario, 0),
      subtotal: toNumber(item.subtotal, 0),
      iva: toNumber(item.iva, 0),
      total: toNumber(item.total, 0),
      producto: Array.isArray(item.producto)
        ? item.producto[0] ?? null
        : item.producto,
    })),
  };
}

export async function getPagosProveedorByFactura(
  facturaCompraId: string
): Promise<PagoProveedor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pagos_proveedor")
    .select("*")
    .eq("factura_compra_id", facturaCompraId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error getPagosProveedorByFactura:", error);
    throw new Error("No se pudieron obtener los pagos del proveedor.");
  }

  return ((data ?? []) as PagoProveedor[]).map((row) => ({
    ...row,
    monto: toNumber(row.monto, 0),
  }));
}

export async function createPagoProveedor(input: CrearPagoProveedorInput) {
  const { supabase, user } = await requireAdminOrRecepcion();

  if (!input.factura_compra_id) {
    throw new Error("La factura es obligatoria.");
  }

  if (!input.proveedor_id) {
    throw new Error("El proveedor es obligatorio.");
  }

  if (!input.fecha?.trim()) {
    throw new Error("La fecha del pago es obligatoria.");
  }

  const monto = toNumber(input.monto, 0);
  if (monto <= 0) {
    throw new Error("El monto del pago debe ser mayor a 0.");
  }

  const metodo_pago = normalizeMetodoPagoProveedor(input.metodo_pago);
  const cuenta = normalizeCuentaDinero(
    input.cuenta ?? resolveCuentaFromMetodoPagoProveedor(metodo_pago)
  );
  const origen_fondo = normalizeOrigenFondo(input.origen_fondo);
  const naturaleza = normalizeNaturalezaMovimiento(input.naturaleza);

  const afecta_caja =
    cuenta === "caja" ? Boolean(input.afecta_caja ?? true) : false;

  const observaciones = normalizeText(input.observaciones);

  const { data: factura, error: facturaError } = await supabase
    .from("facturas_compra")
    .select("id, proveedor_id, numero_factura, total, total_pagado, saldo_pendiente, estado_pago")
    .eq("id", input.factura_compra_id)
    .single();

  if (facturaError || !factura) {
    console.error("Error createPagoProveedor factura:", facturaError);
    throw new Error("No se pudo obtener la factura de compra.");
  }

  if (factura.proveedor_id !== input.proveedor_id) {
    throw new Error("La factura no pertenece al proveedor seleccionado.");
  }

  const totalFactura = toNumber(factura.total, 0);
  const totalPagadoActual = toNumber(factura.total_pagado, 0);
  const saldoPendienteActual = toNumber(
    factura.saldo_pendiente,
    Math.max(0, totalFactura - totalPagadoActual)
  );

  if (saldoPendienteActual <= 0) {
    throw new Error("La factura ya está pagada.");
  }

  if (monto > saldoPendienteActual) {
    throw new Error(
      `El monto supera el saldo pendiente de la factura ($${saldoPendienteActual.toFixed(
        2
      )}).`
    );
  }

  let cajaAbierta: Awaited<ReturnType<typeof getCajaAbiertaInterna>> = null;

  if (cuenta === "caja" && afecta_caja) {
    cajaAbierta = await getCajaAbiertaInterna();

    if (!cajaAbierta) {
      throw new Error(
        "No hay una caja abierta. Abre caja antes de registrar un pago desde caja."
      );
    }
  }
  const { data: pagoReciente } = await supabase
    .from("pagos_proveedor")
    .select("id, monto, created_at")
    .eq("factura_compra_id", input.factura_compra_id)
    .gte("created_at", new Date(Date.now() - 5000).toISOString())
    .maybeSingle();

  if (pagoReciente && Number(pagoReciente.monto) === monto) {
    throw new Error("Posible pago duplicado detectado");
  }
  const { data: pago, error: pagoError } = await supabase
    .from("pagos_proveedor")
    .insert({
      factura_compra_id: input.factura_compra_id,
      proveedor_id: input.proveedor_id,
      fecha: input.fecha.trim(),
      monto,
      metodo_pago,
      cuenta,
      origen_fondo,
      naturaleza,
      afecta_caja,
      caja_id: cuenta === "caja" && afecta_caja ? cajaAbierta?.id ?? null : null,
      observaciones,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (pagoError || !pago) {
    console.error("Error createPagoProveedor pago:", pagoError);
    throw new Error("No se pudo registrar el pago al proveedor.");
  }

  if (cuenta === "caja" && afecta_caja && cajaAbierta) {
    const { error: cajaError } = await supabase
      .from("caja_movimientos")
      .insert({
        caja_id: cajaAbierta.id,
        tipo: "egreso",
        categoria: "pago_proveedor",
        monto,
        descripcion: `Pago proveedor · Factura ${factura.numero_factura}`,
        referencia_tipo: "pago_proveedor",
        referencia_id: pago.id,
        metodo_pago: metodoPagoProveedorToCaja(metodo_pago),
        cuenta,
        origen_fondo,
        naturaleza,
        cuenta_destino: null,
        creado_por: user.id,
      });

    if (cajaError) {
      console.error("Error createPagoProveedor caja_movimientos:", cajaError);

      await supabase.from("pagos_proveedor").delete().eq("id", pago.id);

      throw new Error(
        "No se pudo registrar el movimiento en caja. El pago fue revertido."
      );
    }
  }

  const nuevoTotalPagado = toNumber(totalPagadoActual + monto, 0);
  const nuevoSaldoPendiente = Math.max(
    0,
    toNumber(totalFactura - nuevoTotalPagado, 0)
  );
  const nuevoEstadoPago = calcularEstadoPago(totalFactura, nuevoTotalPagado);

  const { error: updateFacturaError } = await supabase
    .from("facturas_compra")
    .update({
      total_pagado: nuevoTotalPagado,
      saldo_pendiente: nuevoSaldoPendiente,
      estado_pago: nuevoEstadoPago,
    })
    .eq("id", input.factura_compra_id);

  if (updateFacturaError) {
    console.error(
      "Error createPagoProveedor actualizando factura:",
      updateFacturaError
    );

    await supabase.from("pagos_proveedor").delete().eq("id", pago.id);

    if (cuenta === "caja" && afecta_caja) {
      await supabase
        .from("caja_movimientos")
        .delete()
        .eq("referencia_tipo", "pago_proveedor")
        .eq("referencia_id", pago.id);
    }

    throw new Error(
      "No se pudo actualizar el estado de pago de la factura. El pago fue revertido."
    );
  }

  revalidatePath("/compras");
  revalidatePath("/caja");

  return {
    ...pago,
    monto,
  } as PagoProveedor;
}

export async function replaceProductoDesdeFactura(params: {
  producto_id: string;
  descripcion_original: string;
  costo_unitario: number;
}) {
  const { supabase } = await requireAdminOrRecepcion();
  if (!params.producto_id) {
    throw new Error("Debes seleccionar un producto.");
  }

  const nombre = params.descripcion_original.trim();

  if (!nombre) {
    throw new Error("La descripción de la factura está vacía.");
  }

  const { data: productoActual, error: productoError } = await supabase
    .from("productos")
    .select(
      "id, nombre, categoria, marca, stock, precio_compra, precio_venta, activo, notas"
    )
    .eq("id", params.producto_id)
    .single();

  if (productoError || !productoActual) {
    console.error(
      "Error replaceProductoDesdeFactura producto actual:",
      productoError
    );
    throw new Error("No se pudo obtener el producto seleccionado.");
  }

  const { data, error } = await supabase
    .from("productos")
    .update({
      nombre,
      precio_compra: Number(params.costo_unitario || 0),
    })
    .eq("id", params.producto_id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("Error replaceProductoDesdeFactura update:", error);
    throw new Error(
      "No se pudo reemplazar el producto con los datos de la factura."
    );
  }

  revalidatePath("/compras");
  revalidatePath("/productos");

  return data;
}

export async function createProductoDesdeFactura(params: {
  descripcion_original: string;
  costo_unitario: number;
  categoria: string;
  marca?: string | null;
}) {
  const { supabase } = await requireAdminOrRecepcion();
  const nombre = params.descripcion_original.trim();
  const categoria = params.categoria.trim();
  const marca = params.marca?.trim() || null;

  if (!nombre) {
    throw new Error("La descripción del item está vacía.");
  }

  if (!categoria) {
    throw new Error("Debes seleccionar una categoría.");
  }

  const { data, error } = await supabase
    .from("productos")
    .insert({
      nombre,
      categoria,
      marca,
      stock: 0,
      precio_compra: Number(params.costo_unitario || 0),
      precio_venta: 0,
      activo: true,
      notas: "Creado desde importación de factura",
    })
    .select(
      "id, nombre, categoria, marca, stock, precio_compra, precio_venta, activo"
    )
    .single();

  if (error || !data) {
    console.error("Error createProductoDesdeFactura:", error);
    throw new Error("No se pudo crear el producto desde la factura.");
  }

  revalidatePath("/compras");
  revalidatePath("/productos");

  return data;
}
