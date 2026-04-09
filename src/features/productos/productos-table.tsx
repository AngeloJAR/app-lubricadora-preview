"use client";

import { useEffect, useMemo, useState } from "react";
import type { Producto, ProductoFormData } from "@/types";
import { deleteProducto, updateProducto } from "./actions";
import { getConfiguracionTaller } from "@/features/configuracion/actions";

type ProductosTableProps = {
  productos: Producto[];
  canManageProductos: boolean;
};

type EstadoFiltro = "todos" | "activos" | "inactivos";
type RentabilidadFiltro = "todas" | "rentables" | "sin_ganancia" | "perdida";
type OrdenFiltro =
  | "nombre_asc"
  | "nombre_desc"
  | "stock_asc"
  | "stock_desc"
  | "precio_venta_asc"
  | "precio_venta_desc"
  | "ganancia_asc"
  | "ganancia_desc";

const IVA = 0.15;

const createInitialEditForm = (producto: Producto): ProductoFormData => ({
  nombre: producto.nombre ?? "",
  categoria: producto.categoria ?? "",
  marca: producto.marca ?? "",
  stock: String(producto.stock ?? 0),
  precio_compra: String(producto.precio_compra ?? 0),
  precio_venta: String(producto.precio_venta ?? 0),
  precio_compra_incluye_iva: Boolean(producto.precio_compra_incluye_iva),
  incluye_filtro: Boolean(producto.incluye_filtro),
  incluye_ambiental: Boolean(producto.incluye_ambiental),
  incluye_tarjeta: Boolean(producto.incluye_tarjeta),
  costo_filtro: String(producto.costo_filtro ?? 0),
  costo_ambiental: String(producto.costo_ambiental ?? 0),
  costo_tarjeta: String(producto.costo_tarjeta ?? 0),
  activo: Boolean(producto.activo),
  notas: producto.notas ?? "",
});

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

function formatMoney(value: number | string | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function calcularPrecioCompraMostrado(
  precioCompraBase: number,
  incluyeIVA: boolean
) {
  if (!incluyeIVA) return round2(precioCompraBase * (1 + IVA));
  return round2(precioCompraBase * (1 + IVA));
}

function calcularCostoReal(params: {
  precioCompraBase: number;
  incluyeFiltro: boolean;
  incluyeAmbiental: boolean;
  incluyeTarjeta: boolean;
  costoFiltro: number;
  costoAmbiental: number;
  costoTarjeta: number;
}) {
  let costoReal = params.precioCompraBase;

  if (params.incluyeFiltro) {
    costoReal -= params.costoFiltro;
  }

  if (params.incluyeAmbiental) {
    costoReal -= params.costoAmbiental;
  }

  if (params.incluyeTarjeta) {
    costoReal -= params.costoTarjeta;
  }

  return Math.max(0, round2(costoReal));
}

function calcularPrecioVenta(costoReal: number, margenGanancia: number) {
  return Math.ceil(costoReal * (1 + margenGanancia));
}

function getProductoCalculado(producto: Producto, margenGanancia: number) {
  const precioCompraSinIVA = toNumber(producto.precio_compra);
  const precioCompraIncluyeIVA = Boolean(producto.precio_compra_incluye_iva);
  const incluyeFiltro = Boolean(producto.incluye_filtro);
  const incluyeAmbiental = Boolean(producto.incluye_ambiental);
  const incluyeTarjeta = Boolean(producto.incluye_tarjeta);
  const costoFiltro = toNumber(producto.costo_filtro);
  const costoAmbiental = toNumber(producto.costo_ambiental);
  const costoTarjeta = toNumber(producto.costo_tarjeta);

  const costoRealCalculado = calcularCostoReal({
    precioCompraBase: precioCompraSinIVA,
    incluyeFiltro,
    incluyeAmbiental,
    incluyeTarjeta,
    costoFiltro,
    costoAmbiental,
    costoTarjeta,
  });

  const precioCompraConIVA = calcularPrecioCompraMostrado(
    precioCompraSinIVA,
    precioCompraIncluyeIVA
  );

  const precioVentaSinIVA = toNumber(producto.precio_venta);
  const precioVentaConIVA = round2(precioVentaSinIVA * (1 + IVA));
  const precioSugeridoSinIVA = calcularPrecioVenta(
    costoRealCalculado,
    margenGanancia
  );
  const precioSugeridoConIVA = round2(precioSugeridoSinIVA * (1 + IVA));
  const ganancia = round2(precioVentaSinIVA - costoRealCalculado);
  const margen =
    precioVentaSinIVA > 0 ? round2((ganancia / precioVentaSinIVA) * 100) : 0;
  const stock = toNumber(producto.stock);
  const stockBajo = stock <= 3;

  return {
    precioCompraSinIVA,
    precioCompraConIVA,
    costoReal: costoRealCalculado,
    precioVentaSinIVA,
    precioVentaConIVA,
    precioSugeridoSinIVA,
    precioSugeridoConIVA,
    ganancia,
    margen,
    stock,
    stockBajo,
  };
}

export function ProductosTable({
  productos,
  canManageProductos,
}: ProductosTableProps) {
  const [localProductos, setLocalProductos] = useState<Producto[]>(productos);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProductoFormData | null>(null);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [margenGanancia, setMargenGanancia] = useState(0.45);

  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("todos");
  const [rentabilidadFiltro, setRentabilidadFiltro] =
    useState<RentabilidadFiltro>("todas");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [marcaFiltro, setMarcaFiltro] = useState("todas");
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [orden, setOrden] = useState<OrdenFiltro>("nombre_asc");

  useEffect(() => {
    setLocalProductos(productos);
  }, [productos]);

  useEffect(() => {
    async function loadMargen() {
      try {
        const config = await getConfiguracionTaller();
        const margen = Number(config?.margen_ganancia ?? 45);
        setMargenGanancia(margen > 0 ? margen / 100 : 0.45);
      } catch {
        setMargenGanancia(0.45);
      }
    }

    loadMargen();
  }, []);

  const categorias = useMemo(() => {
    return Array.from(
      new Set(
        localProductos
          .map((producto) => (producto.categoria ?? "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [localProductos]);

  const marcas = useMemo(() => {
    return Array.from(
      new Set(
        localProductos
          .map((producto) => (producto.marca ?? "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [localProductos]);

  const resumen = useMemo(() => {
    let activos = 0;
    let inactivos = 0;
    let stockBajo = 0;
    let rentables = 0;
    let sinGanancia = 0;
    let perdida = 0;

    for (const producto of localProductos) {
      const calculado = getProductoCalculado(producto, margenGanancia);

      if (producto.activo) activos += 1;
      else inactivos += 1;

      if (calculado.stockBajo) stockBajo += 1;

      if (calculado.ganancia < 0) perdida += 1;
      else if (calculado.ganancia === 0) sinGanancia += 1;
      else rentables += 1;
    }

    return {
      total: localProductos.length,
      activos,
      inactivos,
      stockBajo,
      rentables,
      sinGanancia,
      perdida,
    };
  }, [localProductos, margenGanancia]);

  const productosFiltrados = useMemo(() => {
    const searchNormalized = search.trim().toLowerCase();

    const filtrados = localProductos.filter((producto) => {
      const nombre = (producto.nombre ?? "").toLowerCase();
      const categoria = (producto.categoria ?? "").toLowerCase();
      const marca = (producto.marca ?? "").toLowerCase();

      const coincideBusqueda =
        !searchNormalized ||
        nombre.includes(searchNormalized) ||
        categoria.includes(searchNormalized) ||
        marca.includes(searchNormalized);

      if (!coincideBusqueda) return false;

      if (estadoFiltro === "activos" && !producto.activo) return false;
      if (estadoFiltro === "inactivos" && producto.activo) return false;

      if (
        categoriaFiltro !== "todas" &&
        (producto.categoria ?? "") !== categoriaFiltro
      ) {
        return false;
      }

      if (marcaFiltro !== "todas" && (producto.marca ?? "") !== marcaFiltro) {
        return false;
      }

      const calculado = getProductoCalculado(producto, margenGanancia);

      if (soloStockBajo && !calculado.stockBajo) return false;

      if (rentabilidadFiltro === "rentables" && calculado.ganancia <= 0) {
        return false;
      }

      if (rentabilidadFiltro === "sin_ganancia" && calculado.ganancia !== 0) {
        return false;
      }

      if (rentabilidadFiltro === "perdida" && calculado.ganancia >= 0) {
        return false;
      }

      return true;
    });

    filtrados.sort((a, b) => {
      const calcA = getProductoCalculado(a, margenGanancia);
      const calcB = getProductoCalculado(b, margenGanancia);

      switch (orden) {
        case "nombre_desc":
          return (b.nombre ?? "").localeCompare(a.nombre ?? "", "es");
        case "stock_asc":
          return calcA.stock - calcB.stock;
        case "stock_desc":
          return calcB.stock - calcA.stock;
        case "precio_venta_asc":
          return calcA.precioVentaSinIVA - calcB.precioVentaSinIVA;
        case "precio_venta_desc":
          return calcB.precioVentaSinIVA - calcA.precioVentaSinIVA;
        case "ganancia_asc":
          return calcA.ganancia - calcB.ganancia;
        case "ganancia_desc":
          return calcB.ganancia - calcA.ganancia;
        case "nombre_asc":
        default:
          return (a.nombre ?? "").localeCompare(b.nombre ?? "", "es");
      }
    });

    return filtrados;
  }, [
    localProductos,
    search,
    estadoFiltro,
    categoriaFiltro,
    marcaFiltro,
    soloStockBajo,
    rentabilidadFiltro,
    orden,
    margenGanancia,
  ]);

  const productoEnEdicion = useMemo(() => {
    if (!editingId) return null;
    return localProductos.find((producto) => producto.id === editingId) ?? null;
  }, [editingId, localProductos]);

  function handleStartEdit(producto: Producto) {
    setEditingId(producto.id);
    setEditForm(createInitialEditForm(producto));
    setErrorById((prev) => ({
      ...prev,
      [producto.id]: "",
    }));
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  function updateEditField<K extends keyof ProductoFormData>(
    key: K,
    value: ProductoFormData[K]
  ) {
    setEditForm((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        [key]: value,
      };
    });
  }

  async function handleSave(productoId: string) {
    if (!editForm) return;

    setErrorById((prev) => ({
      ...prev,
      [productoId]: "",
    }));

    if (!editForm.nombre.trim()) {
      setErrorById((prev) => ({
        ...prev,
        [productoId]: "El nombre es obligatorio.",
      }));
      return;
    }

    if (!editForm.categoria.trim()) {
      setErrorById((prev) => ({
        ...prev,
        [productoId]: "La categoría es obligatoria.",
      }));
      return;
    }

    if (toNumber(editForm.stock) < 0) {
      setErrorById((prev) => ({
        ...prev,
        [productoId]: "El stock no puede ser negativo.",
      }));
      return;
    }

    if (toNumber(editForm.precio_compra) < 0) {
      setErrorById((prev) => ({
        ...prev,
        [productoId]: "El precio de compra no puede ser negativo.",
      }));
      return;
    }

    if (editForm.incluye_filtro && toNumber(editForm.costo_filtro) < 0) {
      setErrorById((prev) => ({
        ...prev,
        [productoId]: "El costo del filtro no puede ser negativo.",
      }));
      return;
    }

    if (editForm.incluye_ambiental && toNumber(editForm.costo_ambiental) < 0) {
      setErrorById((prev) => ({
        ...prev,
        [productoId]: "El costo del ambiental no puede ser negativo.",
      }));
      return;
    }

    if (editForm.incluye_tarjeta && toNumber(editForm.costo_tarjeta) < 0) {
      setErrorById((prev) => ({
        ...prev,
        [productoId]: "El costo de la tarjeta no puede ser negativo.",
      }));
      return;
    }

    try {
      setLoadingActionId(productoId);

      const precioCompraSinIVA = toNumber(editForm.precio_compra);
      const costoRealCalculado = calcularCostoReal({
        precioCompraBase: precioCompraSinIVA,
        incluyeFiltro: Boolean(editForm.incluye_filtro),
        incluyeAmbiental: Boolean(editForm.incluye_ambiental),
        incluyeTarjeta: Boolean(editForm.incluye_tarjeta),
        costoFiltro: toNumber(editForm.costo_filtro),
        costoAmbiental: toNumber(editForm.costo_ambiental),
        costoTarjeta: toNumber(editForm.costo_tarjeta),
      });

      const payload = {
        ...editForm,
        precio_venta: String(
          calcularPrecioVenta(costoRealCalculado, margenGanancia)
        ),
        costo_filtro: editForm.incluye_filtro ? editForm.costo_filtro : "0",
        costo_ambiental: editForm.incluye_ambiental
          ? editForm.costo_ambiental
          : "0",
        costo_tarjeta: editForm.incluye_tarjeta ? editForm.costo_tarjeta : "0",
      };

      await updateProducto(productoId, payload);

      setLocalProductos((prev) =>
        prev.map((producto) =>
          producto.id === productoId
            ? {
              ...producto,
              ...payload,
              stock: toNumber(payload.stock),
              precio_compra: toNumber(payload.precio_compra),
              precio_venta: toNumber(payload.precio_venta),
              costo_filtro: toNumber(payload.costo_filtro),
              costo_ambiental: toNumber(payload.costo_ambiental),
              costo_tarjeta: toNumber(payload.costo_tarjeta),
            }
            : producto
        )
      );

      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo actualizar el producto.";

      setErrorById((prev) => ({
        ...prev,
        [productoId]: message,
      }));
    } finally {
      setLoadingActionId(null);
    }
  }

  async function handleDelete(productoId: string) {
    const confirmed = window.confirm(
      "¿Seguro que quieres eliminar este producto?"
    );

    if (!confirmed) return;

    try {
      setLoadingActionId(productoId);
      setErrorById((prev) => ({
        ...prev,
        [productoId]: "",
      }));

      await deleteProducto(productoId);

      setLocalProductos((prev) =>
        prev.filter((producto) => producto.id !== productoId)
      );

      if (editingId === productoId) {
        setEditingId(null);
        setEditForm(null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo eliminar el producto.";

      setErrorById((prev) => ({
        ...prev,
        [productoId]: message,
      }));
    } finally {
      setLoadingActionId(null);
    }
  }

  if (localProductos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
        No hay productos registrados todavía.
      </div>
    );
  }

  const currentForm = editForm;
  const stockActual = toNumber(currentForm?.stock);
  const precioCompraSinIVA = toNumber(currentForm?.precio_compra);
  const precioCompraIncluyeIVA = Boolean(currentForm?.precio_compra_incluye_iva);
  const incluyeFiltro = Boolean(currentForm?.incluye_filtro);
  const incluyeAmbiental = Boolean(currentForm?.incluye_ambiental);
  const incluyeTarjeta = Boolean(currentForm?.incluye_tarjeta);
  const costoFiltro = toNumber(currentForm?.costo_filtro);
  const costoAmbiental = toNumber(currentForm?.costo_ambiental);
  const costoTarjeta = toNumber(currentForm?.costo_tarjeta);

  const precioCompraConIVA = calcularPrecioCompraMostrado(
    precioCompraSinIVA,
    precioCompraIncluyeIVA
  );

  const descuentoExtras = round2(
    (incluyeFiltro ? costoFiltro : 0) +
    (incluyeAmbiental ? costoAmbiental : 0) +
    (incluyeTarjeta ? costoTarjeta : 0)
  );

  const costoReal = calcularCostoReal({
    precioCompraBase: precioCompraSinIVA,
    incluyeFiltro,
    incluyeAmbiental,
    incluyeTarjeta,
    costoFiltro,
    costoAmbiental,
    costoTarjeta,
  });

  const precioSugeridoSinIVA = calcularPrecioVenta(costoReal, margenGanancia);
  const precioSugeridoConIVA = round2(precioSugeridoSinIVA * (1 + IVA));
  const ganancia = round2(precioSugeridoSinIVA - costoReal);
  const margen =
    precioSugeridoSinIVA > 0
      ? round2((ganancia / precioSugeridoSinIVA) * 100)
      : 0;
  const stockBajoEnEdicion = stockActual <= 3;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">Total</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {resumen.total}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">Activos</p>
            <p className="mt-1 text-xl font-semibold text-green-700">
              {resumen.activos}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Inactivos
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-700">
              {resumen.inactivos}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Stock bajo
            </p>
            <p className="mt-1 text-xl font-semibold text-red-700">
              {resumen.stockBajo}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Rentables
            </p>
            <p className="mt-1 text-xl font-semibold text-green-700">
              {resumen.rentables}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Con pérdida
            </p>
            <p className="mt-1 text-xl font-semibold text-red-700">
              {resumen.perdida}
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Buscar producto
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, categoría o marca..."
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Estado
            </label>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value as EstadoFiltro)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Categoría
            </label>
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
            >
              <option value="todas">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Marca
            </label>
            <select
              value={marcaFiltro}
              onChange={(e) => setMarcaFiltro(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
            >
              <option value="todas">Todas</option>
              {marcas.map((marca) => (
                <option key={marca} value={marca}>
                  {marca}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Ordenar por
            </label>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as OrdenFiltro)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
            >
              <option value="nombre_asc">Nombre A-Z</option>
              <option value="nombre_desc">Nombre Z-A</option>
              <option value="stock_asc">Stock menor a mayor</option>
              <option value="stock_desc">Stock mayor a menor</option>
              <option value="precio_venta_asc">Venta menor a mayor</option>
              <option value="precio_venta_desc">Venta mayor a menor</option>
              <option value="ganancia_asc">Ganancia menor a mayor</option>
              <option value="ganancia_desc">Ganancia mayor a menor</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={soloStockBajo}
              onChange={(e) => setSoloStockBajo(e.target.checked)}
            />
            Solo stock bajo
          </label>

          <select
            value={rentabilidadFiltro}
            onChange={(e) =>
              setRentabilidadFiltro(e.target.value as RentabilidadFiltro)
            }
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
          >
            <option value="todas">Toda rentabilidad</option>
            <option value="rentables">Solo rentables</option>
            <option value="sin_ganancia">Sin ganancia</option>
            <option value="perdida">Con pérdida</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setEstadoFiltro("todos");
              setRentabilidadFiltro("todas");
              setCategoriaFiltro("todas");
              setMarcaFiltro("todas");
              setSoloStockBajo(false);
              setOrden("nombre_asc");
            }}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Marca</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Compra c/IVA</th>
                <th className="px-4 py-3">Costo real s/IVA</th>
                <th className="px-4 py-3">Venta s/IVA</th>
                <th className="px-4 py-3">Ganancia</th>
                <th className="px-4 py-3">Estado</th>
                {canManageProductos ? (
                  <th className="px-4 py-3 text-right">Acciones</th>
                ) : null}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManageProductos ? 10 : 9}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No hay productos que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((producto) => {
                  const calculado = getProductoCalculado(producto, margenGanancia);
                  const isEditing = editingId === producto.id;
                  const isLoading = loadingActionId === producto.id;

                  const estadoTexto =
                    calculado.ganancia < 0
                      ? "Pérdida"
                      : calculado.ganancia === 0
                        ? "Sin ganancia"
                        : "Rentable";

                  const estadoClase =
                    calculado.ganancia < 0
                      ? "border-red-200 bg-red-50 text-red-700"
                      : calculado.ganancia === 0
                        ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                        : "border-green-200 bg-green-50 text-green-700";

                  return (
                    <tr
                      key={producto.id}
                      className={isEditing ? "bg-yellow-50/40" : undefined}
                    >
                      <td className="px-4 py-3">
                        <div className="min-w-55">
                          <p className="font-semibold text-gray-900">
                            {producto.nombre}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${producto.activo
                                  ? "border-green-200 bg-green-50 text-green-700"
                                  : "border-gray-200 bg-gray-50 text-gray-600"
                                }`}
                            >
                              {producto.activo ? "Activo" : "Inactivo"}
                            </span>

                            {calculado.stockBajo ? (
                              <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                                Stock bajo
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {producto.categoria}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {producto.marca || "Sin marca"}
                      </td>

                      <td className="px-4 py-3 font-medium text-gray-900">
                        {producto.stock}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatMoney(calculado.precioCompraConIVA)}
                          </p>
                          <p className="text-xs text-gray-500">
                            sin IVA: {formatMoney(calculado.precioCompraSinIVA)}
                          </p>
                        </div>
                      </td>

                      {/* <td className="px-4 py-3 text-gray-700">
                        {formatMoney(calculado.costoReal)}
                      </td> */}

                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatMoney(calculado.precioVentaSinIVA)}
                          </p>
                          <p className="text-xs text-gray-500">
                            con IVA: {formatMoney(calculado.precioVentaConIVA)}
                          </p>
                        </div>
                      </td>

                      <td
                        className={`px-4 py-3 font-semibold ${calculado.ganancia < 0
                            ? "text-red-600"
                            : calculado.ganancia === 0
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}
                      >
                        <div>
                          <p>{formatMoney(calculado.ganancia)}</p>
                          <p className="text-xs font-normal text-gray-500">
                            margen: {calculado.margen.toFixed(2)}%
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${estadoClase}`}
                        >
                          {estadoTexto}
                        </span>
                      </td>

                      {canManageProductos ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                isEditing
                                  ? handleCancelEdit()
                                  : handleStartEdit(producto)
                              }
                              className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                              {isEditing ? "Cerrar" : "Editar"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(producto.id)}
                              disabled={isLoading}
                              className="rounded-xl border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                            >
                              {isLoading ? "Eliminando..." : "Eliminar"}
                            </button>
                          </div>

                          {errorById[producto.id] ? (
                            <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                              {errorById[producto.id]}
                            </div>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canManageProductos && productoEnEdicion && editForm ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Editar producto
              </h3>
              <p className="text-sm text-gray-500">{productoEnEdicion.nombre}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSave(productoEnEdicion.id)}
                disabled={loadingActionId === productoEnEdicion.id}
                className="rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-sm font-medium text-white transition hover:brightness-95 disabled:opacity-60"
              >
                {loadingActionId === productoEnEdicion.id
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>

              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={loadingActionId === productoEnEdicion.id}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nombre
                  </label>
                  <input
                    value={editForm.nombre}
                    onChange={(e) => updateEditField("nombre", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Marca
                  </label>
                  <input
                    value={editForm.marca}
                    onChange={(e) => updateEditField("marca", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Categoría
                  </label>
                  <input
                    value={editForm.categoria}
                    onChange={(e) =>
                      updateEditField("categoria", e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.stock}
                    onChange={(e) => updateEditField("stock", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Precio compra facturado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.precio_compra}
                    onChange={(e) =>
                      updateEditField("precio_compra", e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                  />
                  <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={Boolean(editForm.precio_compra_incluye_iva)}
                      onChange={(e) =>
                        updateEditField(
                          "precio_compra_incluye_iva",
                          e.target.checked
                        )
                      }
                    />
                    El valor ingresado incluye IVA
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="mb-3 text-sm font-semibold text-gray-900">
                  Extras incluidos
                </p>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <input
                        type="checkbox"
                        checked={Boolean(editForm.incluye_filtro)}
                        onChange={(e) =>
                          updateEditField("incluye_filtro", e.target.checked)
                        }
                      />
                      Incluye filtro
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.costo_filtro}
                      onChange={(e) =>
                        updateEditField("costo_filtro", e.target.value)
                      }
                      disabled={!Boolean(editForm.incluye_filtro)}
                      className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none disabled:cursor-not-allowed disabled:bg-gray-100 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                      placeholder="Costo filtro"
                    />
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <input
                        type="checkbox"
                        checked={Boolean(editForm.incluye_ambiental)}
                        onChange={(e) =>
                          updateEditField("incluye_ambiental", e.target.checked)
                        }
                      />
                      Incluye ambiental
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.costo_ambiental}
                      onChange={(e) =>
                        updateEditField("costo_ambiental", e.target.value)
                      }
                      disabled={!Boolean(editForm.incluye_ambiental)}
                      className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none disabled:cursor-not-allowed disabled:bg-gray-100 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                      placeholder="Costo ambiental"
                    />
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <input
                        type="checkbox"
                        checked={Boolean(editForm.incluye_tarjeta)}
                        onChange={(e) =>
                          updateEditField("incluye_tarjeta", e.target.checked)
                        }
                      />
                      Incluye tarjeta
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.costo_tarjeta}
                      onChange={(e) =>
                        updateEditField("costo_tarjeta", e.target.value)
                      }
                      disabled={!Boolean(editForm.incluye_tarjeta)}
                      className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none disabled:cursor-not-allowed disabled:bg-gray-100 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                      placeholder="Costo tarjeta"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notas
                </label>
                <textarea
                  rows={4}
                  value={editForm.notas}
                  onChange={(e) => updateEditField("notas", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(editForm.activo)}
                  onChange={(e) => updateEditField("activo", e.target.checked)}
                />
                Producto activo
              </label>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Compra con IVA
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatMoney(precioCompraConIVA)}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Compra sin IVA
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatMoney(precioCompraSinIVA)}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Descuento extras
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatMoney(descuentoExtras)}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Costo real
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatMoney(costoReal)}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Venta sugerida sin IVA
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatMoney(precioSugeridoSinIVA)}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Venta sugerida con IVA
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatMoney(precioSugeridoConIVA)}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Ganancia estimada
                  </p>
                  <p
                    className={`mt-1 text-lg font-semibold ${ganancia < 0
                        ? "text-red-600"
                        : ganancia === 0
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                  >
                    {formatMoney(ganancia)}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Margen estimado
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {margen.toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">
                  Estado actual
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${Boolean(editForm.activo)
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-gray-200 bg-gray-50 text-gray-600"
                      }`}
                  >
                    {Boolean(editForm.activo) ? "Activo" : "Inactivo"}
                  </span>

                  {stockBajoEnEdicion ? (
                    <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                      Stock bajo
                    </span>
                  ) : null}
                </div>
              </div>

              {errorById[productoEnEdicion.id] ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorById[productoEnEdicion.id]}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}