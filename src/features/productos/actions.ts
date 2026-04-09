"use server";

import { createClient } from "@/lib/supabase/server";
import type { Producto, ProductoFormData } from "@/types";

const IVA_RATE = 0.15;

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return 0;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function calcularPrecioCompraSinIVA(
  precioInput: number,
  incluyeIVA: boolean
): number {
  if (incluyeIVA) {
    return round2(precioInput / (1 + IVA_RATE));
  }

  return round2(precioInput);
}

function calcularPrecioCompraConIVA(
  precioInput: number,
  incluyeIVA: boolean
): number {
  if (incluyeIVA) {
    return round2(precioInput);
  }

  return round2(precioInput * (1 + IVA_RATE));
}

function calcularCostoReal(params: {
  precioCompraSinIVA: number;
  incluyeFiltro?: boolean;
  incluyeAmbiental?: boolean;
  incluyeTarjeta?: boolean;
  costoFiltro?: string | number | null;
  costoAmbiental?: string | number | null;
  costoTarjeta?: string | number | null;
}) {
  let costoReal = params.precioCompraSinIVA;

  if (params.incluyeFiltro) {
    costoReal -= toNumber(params.costoFiltro);
  }

  if (params.incluyeAmbiental) {
    costoReal -= toNumber(params.costoAmbiental);
  }

  if (params.incluyeTarjeta) {
    costoReal -= toNumber(params.costoTarjeta);
  }

  return Math.max(0, round2(costoReal));
}

function calcularPrecioVentaSinIVA(costoReal: number, margenGanancia: number) {
  return Math.ceil(costoReal * (1 + margenGanancia));
}

function calcularPrecioVentaConIVA(precioVentaSinIVA: number) {
  return Math.ceil(precioVentaSinIVA * (1 + IVA_RATE));
}

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

async function getMargenGananciaDecimal() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("configuracion_taller")
    .select("margen_ganancia")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error al obtener margen de ganancia:", error.message);
    return 0.45;
  }

  const margen = Number(data?.margen_ganancia ?? 45);

  return margen > 0 ? margen / 100 : 0.45;
}

export async function getProductos(): Promise<Producto[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al obtener productos:", error.message);
    throw new Error("No se pudieron cargar los productos");
  }

  return (data ?? []) as Producto[];
}

export async function getAlertasStock() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("productos")
    .select("id, nombre, stock, categoria")
    .eq("activo", true);

  if (error) {
    console.error("Error al obtener productos para alertas:", error.message);
    throw new Error("No se pudieron obtener alertas de inventario");
  }

  const alertas: {
    tipo: "error" | "warning" | "info";
    titulo: string;
    descripcion: string;
  }[] = [];

  for (const producto of data ?? []) {
    const stock = Number(producto.stock ?? 0);

    if (stock === 0) {
      alertas.push({
        tipo: "error",
        titulo: "Producto sin stock",
        descripcion: `${producto.nombre} está agotado. Reabastecer urgente.`,
      });
    } else if (stock > 0 && stock <= 5) {
      alertas.push({
        tipo: "warning",
        titulo: "Stock bajo",
        descripcion: `${producto.nombre} tiene solo ${stock} unidades.`,
      });
    }
  }

  return alertas;
}

export async function createProducto(payload: ProductoFormData) {
  const supabase = await requireAdmin();

  const nombre = payload.nombre.trim();
  const categoria = payload.categoria.trim();
  const marca = payload.marca.trim() || null;
  const stockNuevo = payload.stock.trim() ? Number(payload.stock) : 0;

  const precioCompraInput = payload.precio_compra.trim()
    ? Number(payload.precio_compra)
    : 0;

  const precioCompraIncluyeIVA = payload.precio_compra_incluye_iva;

  const precioCompraSinIVA = calcularPrecioCompraSinIVA(
    precioCompraInput,
    precioCompraIncluyeIVA
  );

  const precioCompraConIVA = calcularPrecioCompraConIVA(
    precioCompraInput,
    precioCompraIncluyeIVA
  );

  const incluyeFiltro = Boolean(payload.incluye_filtro);
  const incluyeAmbiental = Boolean(payload.incluye_ambiental);
  const incluyeTarjeta = Boolean(payload.incluye_tarjeta);

  const costoFiltro = toNumber(payload.costo_filtro);
  const costoAmbiental = toNumber(payload.costo_ambiental);
  const costoTarjeta = toNumber(payload.costo_tarjeta);

  const costoReal = calcularCostoReal({
    precioCompraSinIVA,
    incluyeFiltro,
    incluyeAmbiental,
    incluyeTarjeta,
    costoFiltro,
    costoAmbiental,
    costoTarjeta,
  });

  const margenGanancia = await getMargenGananciaDecimal();

  const precioVenta = calcularPrecioVentaSinIVA(costoReal, margenGanancia);
  calcularPrecioVentaConIVA(precioVenta); // se calcula si luego lo necesitas mostrar o auditar

  const activo = payload.activo;
  const notas = payload.notas.trim() || null;

  const { data: existente, error: searchError } = await supabase
    .from("productos")
    .select("*")
    .eq("nombre", nombre)
    .eq("categoria", categoria)
    .eq("marca", marca)
    .maybeSingle();

  if (searchError) {
    console.error("Error al buscar producto existente:", searchError.message);
    throw new Error("No se pudo validar el producto");
  }

  if (existente) {
    const stockActualizado = Number(existente.stock) + stockNuevo;

    const { data, error } = await supabase
      .from("productos")
      .update({
        stock: stockActualizado,
        precio_compra: precioCompraSinIVA,
        precio_venta: precioVenta,
        costo_real: costoReal,
        precio_compra_incluye_iva: precioCompraIncluyeIVA,
        incluye_filtro: incluyeFiltro,
        incluye_ambiental: incluyeAmbiental,
        incluye_tarjeta: incluyeTarjeta,
        costo_filtro: costoFiltro,
        costo_ambiental: costoAmbiental,
        costo_tarjeta: costoTarjeta,
        activo,
        notas,
      })
      .eq("id", existente.id)
      .select()
      .single();

    if (error) {
      console.error("Error al actualizar stock del producto:", error.message);
      throw new Error("No se pudo actualizar el stock del producto");
    }

    if (stockNuevo > 0) {
      const totalCompraInicialConIVA = round2(stockNuevo * precioCompraConIVA);

      const { error: movimientoError } = await supabase
        .from("producto_movimientos")
        .insert([
          {
            producto_id: data.id,
            tipo: "entrada",
            cantidad: stockNuevo,
            costo_unitario: precioCompraSinIVA,
            precio_unitario: precioVenta,
            total: totalCompraInicialConIVA,
          },
        ]);

      if (movimientoError) {
        console.error(
          "Error al registrar movimiento del producto existente:",
          movimientoError.message
        );

        await supabase
          .from("productos")
          .update({
            stock: Number(existente.stock),
            precio_compra: Number(existente.precio_compra),
            precio_venta: Number(existente.precio_venta),
            costo_real: Number(
              (existente as { costo_real?: number }).costo_real ?? 0
            ),
            precio_compra_incluye_iva: Boolean(
              (existente as { precio_compra_incluye_iva?: boolean })
                .precio_compra_incluye_iva
            ),
            incluye_filtro: Boolean(
              (existente as { incluye_filtro?: boolean }).incluye_filtro
            ),
            incluye_ambiental: Boolean(
              (existente as { incluye_ambiental?: boolean }).incluye_ambiental
            ),
            incluye_tarjeta: Boolean(
              (existente as { incluye_tarjeta?: boolean }).incluye_tarjeta
            ),
            costo_filtro: Number(
              (existente as { costo_filtro?: number }).costo_filtro ?? 0
            ),
            costo_ambiental: Number(
              (existente as { costo_ambiental?: number }).costo_ambiental ?? 0
            ),
            costo_tarjeta: Number(
              (existente as { costo_tarjeta?: number }).costo_tarjeta ?? 0
            ),
            activo: existente.activo,
            notas: existente.notas,
          })
          .eq("id", existente.id);

        throw new Error(
          "No se pudo registrar el movimiento de inventario. El cambio fue revertido."
        );
      }
    }

    return data as Producto;
  }

  const { data, error } = await supabase
    .from("productos")
    .insert([
      {
        nombre,
        categoria,
        marca,
        stock: stockNuevo,
        precio_compra: precioCompraSinIVA,
        precio_venta: precioVenta,
        costo_real: costoReal,
        precio_compra_incluye_iva: precioCompraIncluyeIVA,
        incluye_filtro: incluyeFiltro,
        incluye_ambiental: incluyeAmbiental,
        incluye_tarjeta: incluyeTarjeta,
        costo_filtro: costoFiltro,
        costo_ambiental: costoAmbiental,
        costo_tarjeta: costoTarjeta,
        activo,
        notas,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error al crear producto:", error.message);
    throw new Error(error.message || "No se pudo crear el producto");
  }

  if (stockNuevo > 0) {
    const totalCompraInicialConIVA = round2(stockNuevo * precioCompraConIVA);

    const { error: movimientoError } = await supabase
      .from("producto_movimientos")
      .insert([
        {
          producto_id: data.id,
          tipo: "entrada",
          cantidad: stockNuevo,
          costo_unitario: precioCompraSinIVA,
          precio_unitario: precioVenta,
          total: totalCompraInicialConIVA,
        },
      ]);

    if (movimientoError) {
      console.error(
        "Error al registrar movimiento inicial del producto:",
        movimientoError.message
      );

      const { error: rollbackError } = await supabase
        .from("productos")
        .delete()
        .eq("id", data.id);

      if (rollbackError) {
        console.error(
          "Error al revertir producto tras fallo del movimiento inicial:",
          rollbackError.message
        );
      }

      throw new Error(
        "No se pudo registrar el movimiento inicial del producto. El alta fue revertida."
      );
    }
  }

  return data as Producto;
}

export async function agregarStockProducto(
  productoId: string,
  payload: {
    cantidad: string;
    precio_compra?: string;
    precio_venta?: string;
  }
) {
  const supabase = await requireAdmin();

  const cantidad = Number(payload.cantidad);

  if (!cantidad || cantidad <= 0) {
    throw new Error("La cantidad debe ser mayor a 0");
  }

  const { data: productoActual, error: productoError } = await supabase
    .from("productos")
    .select("*")
    .eq("id", productoId)
    .single();

  if (productoError || !productoActual) {
    console.error("Error al obtener producto:", productoError?.message);
    throw new Error("No se pudo encontrar el producto");
  }

  const costoInput =
    payload.precio_compra && payload.precio_compra.trim() !== ""
      ? Number(payload.precio_compra)
      : Boolean(productoActual.precio_compra_incluye_iva)
        ? Number(productoActual.precio_compra ?? 0) * (1 + IVA_RATE)
        : Number(productoActual.precio_compra ?? 0);

  const costoUnitarioSinIVA = calcularPrecioCompraSinIVA(
    costoInput,
    Boolean(productoActual.precio_compra_incluye_iva)
  );

  const costoUnitarioConIVA = calcularPrecioCompraConIVA(
    costoInput,
    Boolean(productoActual.precio_compra_incluye_iva)
  );

  const costoReal = calcularCostoReal({
    precioCompraSinIVA: costoUnitarioSinIVA,
    incluyeFiltro: Boolean(productoActual.incluye_filtro),
    incluyeAmbiental: Boolean(productoActual.incluye_ambiental),
    incluyeTarjeta: Boolean(productoActual.incluye_tarjeta),
    costoFiltro: Number(productoActual.costo_filtro ?? 0),
    costoAmbiental: Number(productoActual.costo_ambiental ?? 0),
    costoTarjeta: Number(productoActual.costo_tarjeta ?? 0),
  });

  const margenGanancia = await getMargenGananciaDecimal();
  const precioUnitario = calcularPrecioVentaSinIVA(costoReal, margenGanancia);
  calcularPrecioVentaConIVA(precioUnitario); // reservado por si luego lo muestras o guardas
  const totalEntrada = round2(cantidad * costoUnitarioConIVA);

  const dataToUpdate = {
    stock: Number(productoActual.stock) + cantidad,
    precio_compra: costoUnitarioSinIVA,
    precio_venta: precioUnitario,
    costo_real: costoReal,
  };

  const { data, error } = await supabase
    .from("productos")
    .update(dataToUpdate)
    .eq("id", productoId)
    .select()
    .single();

  if (error) {
    console.error("Error al agregar stock:", error.message);
    throw new Error("No se pudo agregar stock al producto");
  }

  const { error: movimientoError } = await supabase
    .from("producto_movimientos")
    .insert([
      {
        producto_id: productoId,
        tipo: "entrada",
        motivo: "Reposición de stock",
        cantidad,
        costo_unitario: costoUnitarioSinIVA,
        precio_unitario: precioUnitario,
        total: totalEntrada,
        referencia_tipo: "reposicion_manual",
        referencia_id: productoId,
      },
    ]);

  if (movimientoError) {
    console.error(
      "Error al registrar movimiento de entrada:",
      movimientoError.message
    );

    const { error: rollbackError } = await supabase
      .from("productos")
      .update({
        stock: Number(productoActual.stock),
        precio_compra: Number(productoActual.precio_compra),
        precio_venta: Number(productoActual.precio_venta),
        costo_real: Number(productoActual.costo_real ?? 0),
      })
      .eq("id", productoId);

    if (rollbackError) {
      console.error(
        "Error al revertir stock tras fallo del movimiento:",
        rollbackError.message
      );
    }

    throw new Error(
      "No se pudo registrar el movimiento de inventario. El cambio fue revertido."
    );
  }

  return data as Producto;
}

export async function updateProducto(
  productoId: string,
  payload: ProductoFormData
) {
  const supabase = await requireAdmin();

  const nombre = payload.nombre.trim();
  const categoria = payload.categoria.trim();
  const marca = payload.marca.trim() || null;
  const stock = Number(payload.stock);

  const precioCompraInput = payload.precio_compra.trim()
    ? Number(payload.precio_compra)
    : 0;

  const precioCompraIncluyeIVA = payload.precio_compra_incluye_iva;

  const precioCompraSinIVA = calcularPrecioCompraSinIVA(
    precioCompraInput,
    precioCompraIncluyeIVA
  );

  const incluyeFiltro = Boolean(payload.incluye_filtro);
  const incluyeAmbiental = Boolean(payload.incluye_ambiental);
  const incluyeTarjeta = Boolean(payload.incluye_tarjeta);

  const costoFiltro = toNumber(payload.costo_filtro);
  const costoAmbiental = toNumber(payload.costo_ambiental);
  const costoTarjeta = toNumber(payload.costo_tarjeta);

  const costoReal = calcularCostoReal({
    precioCompraSinIVA,
    incluyeFiltro,
    incluyeAmbiental,
    incluyeTarjeta,
    costoFiltro,
    costoAmbiental,
    costoTarjeta,
  });

  const margenGanancia = await getMargenGananciaDecimal();
  const precioVenta = calcularPrecioVentaSinIVA(costoReal, margenGanancia);
  const activo = payload.activo;
  const notas = payload.notas.trim() || null;

  if (!nombre) {
    throw new Error("El nombre es obligatorio");
  }

  if (!categoria) {
    throw new Error("La categoría es obligatoria");
  }

  if (stock < 0) {
    throw new Error("El stock no puede ser negativo");
  }

  const { data, error } = await supabase
    .from("productos")
    .update({
      nombre,
      categoria,
      marca,
      stock,
      precio_compra: precioCompraSinIVA,
      precio_venta: precioVenta,
      costo_real: costoReal,
      precio_compra_incluye_iva: precioCompraIncluyeIVA,
      incluye_filtro: incluyeFiltro,
      incluye_ambiental: incluyeAmbiental,
      incluye_tarjeta: incluyeTarjeta,
      costo_filtro: costoFiltro,
      costo_ambiental: costoAmbiental,
      costo_tarjeta: costoTarjeta,
      activo,
      notas,
    })
    .eq("id", productoId)
    .select()
    .single();

  if (error) {
    console.error("Error al actualizar producto:", error.message);
    throw new Error(error.message || "No se pudo actualizar el producto");
  }

  return data as Producto;
}

export async function deleteProducto(productoId: string) {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from("productos")
    .delete()
    .eq("id", productoId);

  if (error) {
    console.error("Error al eliminar producto:", error.message);
    throw new Error(error.message || "No se pudo eliminar el producto");
  }

  return { success: true };
}

export async function getProductosParaReposicion() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("productos")
    .select("id, nombre, stock, activo")
    .eq("activo", true)
    .lte("stock", 3)
    .order("stock", { ascending: true });

  if (error) {
    console.error("Error obteniendo reposición:", error.message);
    throw new Error("No se pudo obtener productos para reposición");
  }

  return data ?? [];
}

// function generarMensajeReposicion(
//   productos: {
//     nombre: string;
//     stock: number;
//   }[]
// ) {
//   if (productos.length === 0) {
//     return "No necesito reposición por ahora.";
//   }

//   let mensaje = "Hola, necesito reposición de los siguientes productos:\n\n";

//   for (const p of productos) {
//     const stockActual = Number(p.stock ?? 0);
//     const cantidadSugerida = stockActual <= 0 ? 3 : 2;

//     mensaje += `• ${p.nombre} → pedir ${cantidadSugerida}\n`;
//   }

//   mensaje += "\nGracias.";

//   return mensaje;
// }