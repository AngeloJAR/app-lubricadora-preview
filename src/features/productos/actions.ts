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
    costoReal += toNumber(params.costoFiltro);
  }

  if (params.incluyeAmbiental) {
    costoReal += toNumber(params.costoAmbiental);
  }

  if (params.incluyeTarjeta) {
    costoReal += toNumber(params.costoTarjeta);
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

export async function getProductos() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("productos")
    .select(`
      *,
      producto_aplicaciones_vehiculo (
        vehiculo_marca,
        vehiculo_modelo,
        vehiculo_motor
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al obtener productos:", error.message);
    throw new Error("No se pudieron cargar los productos");
  }

  return data ?? [];
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
        descripcion: `${producto.nombre} está agotado.Reabastecer urgente.`,
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

  const { data: categoriaExiste, error: categoriaError } = await supabase
    .from("categorias_productos")
    .select("nombre")
    .eq("nombre", categoria)
    .eq("activo", true)
    .maybeSingle();

  if (categoriaError) {
    console.error("Error validando categoría:", categoriaError.message);
    throw new Error("No se pudo validar la categoría");
  }

  if (!categoriaExiste) {
    throw new Error("Selecciona una categoría válida");
  }
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
  const stockActual = Number(productoActual.stock ?? 0);
  const costoActual = Number(productoActual.precio_compra ?? 0);

  const nuevoStock = stockActual + cantidad;

  const costoPromedio =
    nuevoStock > 0
      ? (stockActual * costoActual + cantidad * costoUnitarioSinIVA) / nuevoStock
      : costoUnitarioSinIVA;

  const dataToUpdate = {
    stock: nuevoStock,
    precio_compra: Number(costoPromedio.toFixed(4)),
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

  if (!categoria) {
    throw new Error("La categoría es obligatoria");
  }

  const { data: categoriaExiste, error: categoriaError } = await supabase
    .from("categorias_productos")
    .select("nombre")
    .eq("nombre", categoria)
    .eq("activo", true)
    .maybeSingle();

  if (categoriaError) {
    console.error("Error validando categoría:", categoriaError.message);
    throw new Error("No se pudo validar la categoría");
  }

  if (!categoriaExiste) {
    throw new Error("Selecciona una categoría válida");
  }
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

export async function getCategoriasProductos() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categorias_productos")
    .select("nombre")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error al obtener categorías:", error.message);
    throw new Error("No se pudieron cargar las categorías");
  }

  const categorias = data?.map((item) => item.nombre) ?? [];

  return categorias.sort((a, b) => {
    if (a.toLowerCase() === "otros") return 1;
    if (b.toLowerCase() === "otros") return -1;

    return a.localeCompare(b, "es");
  });
}

export type ProductoAplicacionVehiculo = {
  id: string;
  producto_id: string;
  tipo_filtro: string;
  vehiculo_marca: string;
  vehiculo_modelo: string | null;
  vehiculo_motor: string | null;
  vehiculo_anio_desde: number | null;
  vehiculo_anio_hasta: number | null;
  codigo_referencia: string;
  notas: string | null;
  activo: boolean;
  producto: {
    id: string;
    nombre: string;
    categoria: string;
    marca: string | null;
    stock: number;
    precio_venta: number;
    activo: boolean;
  } | null;
};

export async function getAplicacionesFiltrosAire(): Promise<
  ProductoAplicacionVehiculo[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("producto_aplicaciones_vehiculo")
    .select(
      `
      id,
      producto_id,
      tipo_filtro,
      vehiculo_marca,
      vehiculo_modelo,
      vehiculo_motor,
      vehiculo_anio_desde,
      vehiculo_anio_hasta,
      codigo_referencia,
      notas,
      activo,
      producto: productos(
        id,
        nombre,
        categoria,
        marca,
        stock,
        precio_venta,
        activo
      )
        `
    )
    .eq("tipo_filtro", "aire")
    .eq("activo", true)
    .order("vehiculo_marca", { ascending: true })
    .order("vehiculo_modelo", { ascending: true });

  if (error) {
    console.error("Error cargando aplicaciones de filtros:", error.message);
    throw new Error("No se pudieron cargar las aplicaciones de filtros");
  }

  return (data ?? []).map((item) => ({
    ...item,
    producto: Array.isArray(item.producto)
      ? item.producto[0] ?? null
      : item.producto ?? null,
  })) as ProductoAplicacionVehiculo[];
}

export async function buscarFiltrosAire(params: {
  busqueda: string;
}): Promise<ProductoAplicacionVehiculo[]> {
  const supabase = await createClient();

  const busqueda = params.busqueda.trim();

  if (!busqueda) {
    return [];
  }

  const { data: equivalencias, error: equivalenciasError } = await supabase
    .from("producto_equivalencias_filtro")
    .select("producto_id")
    .eq("tipo_filtro", "aire")
    .eq("activo", true)
    .ilike("codigo_equivalente", `%${busqueda}%`);

  if (equivalenciasError) {
    console.error("Error buscando equivalencias de filtros:", {
      message: equivalenciasError.message,
      code: equivalenciasError.code,
      details: equivalenciasError.details,
      hint: equivalenciasError.hint,
    });

    throw new Error("No se pudieron buscar equivalencias de filtros");
  }

  const productoIdsPorEquivalencia = Array.from(
    new Set((equivalencias ?? []).map((item) => item.producto_id))
  );

  const filtrosOr = [
    `vehiculo_marca.ilike.%${busqueda}%`,
    `vehiculo_modelo.ilike.%${busqueda}%`,
    `vehiculo_motor.ilike.%${busqueda}%`,
    `codigo_referencia.ilike.%${busqueda}%`,
  ];

  if (productoIdsPorEquivalencia.length > 0) {
    filtrosOr.push(`producto_id.in.(${productoIdsPorEquivalencia.join(",")})`);
  }

  const { data, error } = await supabase
    .from("producto_aplicaciones_vehiculo")
    .select(
      `
      id,
      producto_id,
      tipo_filtro,
      vehiculo_marca,
      vehiculo_modelo,
      vehiculo_motor,
      vehiculo_anio_desde,
      vehiculo_anio_hasta,
      codigo_referencia,
      notas,
      activo,
      producto: productos(
        id,
        nombre,
        categoria,
        marca,
        stock,
        precio_venta,
        activo
      )
      `
    )
    .eq("tipo_filtro", "aire")
    .eq("activo", true)
    .or(filtrosOr.join(","))
    .order("stock", {
      referencedTable: "productos",
      ascending: false,
    })
    .order("vehiculo_marca", { ascending: true })
    .limit(30);

  if (error) {
    console.error("Error buscando filtros de aire:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    throw new Error(error.message || "No se pudieron buscar filtros de aire");
  }

  const resultados = (data ?? []).map((item) => ({
    ...item,
    producto: Array.isArray(item.producto)
      ? item.producto[0] ?? null
      : item.producto ?? null,
  })) as ProductoAplicacionVehiculo[];

  return resultados.sort((a, b) => {
    const stockA = Number(a.producto?.stock ?? 0);
    const stockB = Number(b.producto?.stock ?? 0);

    if (stockA > 0 && stockB <= 0) return -1;
    if (stockA <= 0 && stockB > 0) return 1;

    if (stockB !== stockA) return stockB - stockA;

    return `${a.vehiculo_marca} ${a.vehiculo_modelo ?? ""}`.localeCompare(
      `${b.vehiculo_marca} ${b.vehiculo_modelo ?? ""}`,
      "es"
    );
  });
}

export async function createAplicacionFiltroAire(payload: {
  producto_id: string;
  vehiculo_marca: string;
  vehiculo_modelo?: string;
  vehiculo_motor?: string;
  vehiculo_anio_desde?: string;
  vehiculo_anio_hasta?: string;
  codigo_referencia: string;
  notas?: string;
}) {
  const supabase = await requireAdmin();

  const productoId = payload.producto_id.trim();
  const vehiculoMarca = payload.vehiculo_marca.trim();
  const vehiculoModelo = payload.vehiculo_modelo?.trim() || null;
  const vehiculoMotor = payload.vehiculo_motor?.trim() || null;
  const codigoReferencia = payload.codigo_referencia.trim();
  const notas = payload.notas?.trim() || null;

  if (!productoId) {
    throw new Error("Selecciona un producto");
  }

  if (!vehiculoMarca) {
    throw new Error("La marca del vehículo es obligatoria");
  }

  if (!codigoReferencia) {
    throw new Error("El código de referencia es obligatorio");
  }

  if (!vehiculoModelo) {
    throw new Error("El modelo del vehículo es obligatorio");
  }

  const anioDesde = payload.vehiculo_anio_desde?.trim()
    ? Number(payload.vehiculo_anio_desde)
    : null;

  const anioHasta = payload.vehiculo_anio_hasta?.trim()
    ? Number(payload.vehiculo_anio_hasta)
    : null;

  const { data, error } = await supabase
    .from("producto_aplicaciones_vehiculo")
    .insert([
      {
        producto_id: productoId,
        tipo_filtro: "aire",
        vehiculo_marca: vehiculoMarca,
        vehiculo_modelo: vehiculoModelo,
        vehiculo_motor: vehiculoMotor,
        vehiculo_anio_desde: anioDesde,
        vehiculo_anio_hasta: anioHasta,
        codigo_referencia: codigoReferencia,
        notas,
        activo: true,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creando aplicación de filtro:", error.message);
    throw new Error(error.message || "No se pudo crear la aplicación del filtro");
  }

  return data;
}

export async function buscarCatalogoGeneral(params: {
  busqueda: string;
}) {
  const supabase = await createClient();

  const busqueda = params.busqueda.trim();

  if (!busqueda) return [];

  const { data: productos, error: productosError } = await supabase
    .from("productos")
    .select(`
      id,
      nombre,
      categoria,
      marca,
      stock,
      precio_venta,
      activo,
      notas
    `)
    .eq("activo", true)
    .or(
      [
        `nombre.ilike.%${busqueda}%`,
        `marca.ilike.%${busqueda}%`,
        `categoria.ilike.%${busqueda}%`,
        `notas.ilike.%${busqueda}%`,
      ].join(",")
    )
    .limit(30);

  if (productosError) {
    console.error("Error buscando productos:", productosError.message);
    throw new Error("No se pudieron buscar productos");
  }

  const productoIds = (productos ?? []).map((producto) => producto.id);

  const { data: aplicacionesDirectas, error: aplicacionesDirectasError } =
    await supabase
      .from("producto_aplicaciones_vehiculo")
      .select(`
        id,
        producto_id,
        tipo_filtro,
        vehiculo_marca,
        vehiculo_modelo,
        vehiculo_motor,
        vehiculo_anio_desde,
        vehiculo_anio_hasta,
        codigo_referencia,
        notas,
        activo,
        producto: productos(
          id,
          nombre,
          categoria,
          marca,
          stock,
          precio_venta,
          activo
        )
      `)
      .eq("activo", true)
      .or(
        [
          `vehiculo_marca.ilike.%${busqueda}%`,
          `vehiculo_modelo.ilike.%${busqueda}%`,
          `vehiculo_motor.ilike.%${busqueda}%`,
          `codigo_referencia.ilike.%${busqueda}%`,
          `notas.ilike.%${busqueda}%`,
        ].join(",")
      )
      .limit(30);

  if (aplicacionesDirectasError) {
    console.error("Error buscando aplicaciones:", aplicacionesDirectasError.message);
    throw new Error("No se pudieron buscar aplicaciones");
  }

  let aplicacionesPorProducto: typeof aplicacionesDirectas = [];

  if (productoIds.length > 0) {
    const { data, error } = await supabase
      .from("producto_aplicaciones_vehiculo")
      .select(`
        id,
        producto_id,
        tipo_filtro,
        vehiculo_marca,
        vehiculo_modelo,
        vehiculo_motor,
        vehiculo_anio_desde,
        vehiculo_anio_hasta,
        codigo_referencia,
        notas,
        activo,
        producto: productos(
          id,
          nombre,
          categoria,
          marca,
          stock,
          precio_venta,
          activo
        )
      `)
      .eq("activo", true)
      .in("producto_id", productoIds)
      .limit(30);

    if (error) {
      console.error("Error buscando aplicaciones por producto:", error.message);
      throw new Error("No se pudieron buscar aplicaciones del producto");
    }

    aplicacionesPorProducto = data ?? [];
  }

  const aplicacionesNormalizadas = [
    ...(aplicacionesDirectas ?? []),
    ...(aplicacionesPorProducto ?? []),
  ].map((aplicacion) => ({
    ...aplicacion,
    producto: Array.isArray(aplicacion.producto)
      ? aplicacion.producto[0] ?? null
      : aplicacion.producto ?? null,
  }));

  const productosConAplicacion = new Set(
    aplicacionesNormalizadas
      .map((aplicacion) => aplicacion.producto_id)
      .filter(Boolean)
  );

  const resultados = [
    ...aplicacionesNormalizadas.map((aplicacion) => ({
      tipo: "aplicacion" as const,
      id: aplicacion.id,
      producto: aplicacion.producto,
      aplicacion,
    })),

    ...(productos ?? [])
      .filter((producto) => !productosConAplicacion.has(producto.id))
      .map((producto) => ({
        tipo: "producto" as const,
        id: producto.id,
        producto,
        aplicacion: null,
      })),
  ];

  const unicos = new Map<string, (typeof resultados)[number]>();

  for (const item of resultados) {
    const productoId = item.producto?.id;
    if (!productoId) continue;

    const key =
      item.tipo === "aplicacion"
        ? `${productoId}-${item.aplicacion?.id}`
        : productoId;

    if (!unicos.has(key)) {
      unicos.set(key, item);
    }
  }

  return Array.from(unicos.values()).sort((a, b) => {
    const stockA = Number(a.producto?.stock ?? 0);
    const stockB = Number(b.producto?.stock ?? 0);

    if (stockA > 0 && stockB <= 0) return -1;
    if (stockA <= 0 && stockB > 0) return 1;

    return stockB - stockA;
  });
}