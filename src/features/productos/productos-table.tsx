"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Filter,
  Loader2,
  PackageSearch,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Producto, ProductoFormData } from "@/types";
import { deleteProducto, getCategoriasProductos, updateProducto } from "./actions";
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

const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100";

function createInitialEditForm(producto: Producto): ProductoFormData {
  return {
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
  };
}

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

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

function calcularPrecioCompraConIVA(precioCompraBase: number) {
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
  const descuento =
    (params.incluyeFiltro ? params.costoFiltro : 0) +
    (params.incluyeAmbiental ? params.costoAmbiental : 0) +
    (params.incluyeTarjeta ? params.costoTarjeta : 0);

  return Math.max(0, round2(params.precioCompraBase - descuento));
}

function calcularPrecioVenta(costoReal: number, margenGanancia: number) {
  return Math.ceil(costoReal * (1 + margenGanancia));
}

function getProductoCalculado(producto: Producto, margenGanancia: number) {
  const precioCompraSinIVA = toNumber(producto.precio_compra);
  const costoReal = calcularCostoReal({
    precioCompraBase: precioCompraSinIVA,
    incluyeFiltro: Boolean(producto.incluye_filtro),
    incluyeAmbiental: Boolean(producto.incluye_ambiental),
    incluyeTarjeta: Boolean(producto.incluye_tarjeta),
    costoFiltro: toNumber(producto.costo_filtro),
    costoAmbiental: toNumber(producto.costo_ambiental),
    costoTarjeta: toNumber(producto.costo_tarjeta),
  });

  const precioVentaSinIVA = toNumber(producto.precio_venta);
  const ganancia = round2(precioVentaSinIVA - costoReal);
  const margen =
    precioVentaSinIVA > 0 ? round2((ganancia / precioVentaSinIVA) * 100) : 0;
  const stock = toNumber(producto.stock);

  return {
    precioCompraSinIVA,
    precioCompraConIVA: calcularPrecioCompraConIVA(precioCompraSinIVA),
    costoReal,
    precioVentaSinIVA,
    precioVentaConIVA: round2(precioVentaSinIVA * (1 + IVA)),
    precioSugeridoSinIVA: calcularPrecioVenta(costoReal, margenGanancia),
    ganancia,
    margen,
    stock,
    stockBajo: stock <= 3,
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
  const [categoriasValidas, setCategoriasValidas] = useState<string[]>([]);

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

  useEffect(() => {
    async function loadCategorias() {
      try {
        const data = await getCategoriasProductos();
        setCategoriasValidas(data);
      } catch {
        setCategoriasValidas([]);
      }
    }

    loadCategorias();
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
      const texto = [
        producto.nombre,
        producto.categoria,
        producto.marca,
        producto.stock,
        producto.precio_venta,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (searchNormalized && !texto.includes(searchNormalized)) return false;

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
      if (rentabilidadFiltro === "rentables" && calculado.ganancia <= 0)
        return false;
      if (rentabilidadFiltro === "sin_ganancia" && calculado.ganancia !== 0)
        return false;
      if (rentabilidadFiltro === "perdida" && calculado.ganancia >= 0)
        return false;

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

  const calculoEdicion = useMemo(() => {
    const currentForm = editForm;

    const stockActual = toNumber(currentForm?.stock);
    const precioCompraSinIVA = toNumber(currentForm?.precio_compra);
    const incluyeFiltro = Boolean(currentForm?.incluye_filtro);
    const incluyeAmbiental = Boolean(currentForm?.incluye_ambiental);
    const incluyeTarjeta = Boolean(currentForm?.incluye_tarjeta);
    const costoFiltro = toNumber(currentForm?.costo_filtro);
    const costoAmbiental = toNumber(currentForm?.costo_ambiental);
    const costoTarjeta = toNumber(currentForm?.costo_tarjeta);

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
    const ganancia = round2(precioSugeridoSinIVA - costoReal);
    const margen =
      precioSugeridoSinIVA > 0
        ? round2((ganancia / precioSugeridoSinIVA) * 100)
        : 0;

    return {
      stockActual,
      precioCompraSinIVA,
      precioCompraConIVA: calcularPrecioCompraConIVA(precioCompraSinIVA),
      descuentoExtras,
      costoReal,
      precioSugeridoSinIVA,
      precioSugeridoConIVA: round2(precioSugeridoSinIVA * (1 + IVA)),
      ganancia,
      margen,
      stockBajo: stockActual <= 3,
    };
  }, [editForm, margenGanancia]);

  function limpiarFiltros() {
    setSearch("");
    setEstadoFiltro("todos");
    setRentabilidadFiltro("todas");
    setCategoriaFiltro("todas");
    setMarcaFiltro("todas");
    setSoloStockBajo(false);
    setOrden("nombre_asc");
  }

  function handleStartEdit(producto: Producto) {
    setEditingId(producto.id);
    setEditForm(createInitialEditForm(producto));
    setErrorById((prev) => ({ ...prev, [producto.id]: "" }));
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
      return { ...prev, [key]: value };
    });
  }

  async function handleSave(productoId: string) {
    if (!editForm) return;

    setErrorById((prev) => ({ ...prev, [productoId]: "" }));

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

    try {
      setLoadingActionId(productoId);

      const payload = {
        ...editForm,
        precio_venta: String(calculoEdicion.precioSugeridoSinIVA),
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
      setErrorById((prev) => ({ ...prev, [productoId]: "" }));

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
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <PackageSearch className="mx-auto mb-3 h-8 w-8 text-slate-400" />
        <p className="text-sm font-bold text-slate-700">
          No hay productos registrados todavía.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-yellow-600" />
              <h3 className="text-sm font-black text-slate-900">
                Inventario de productos
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Busca, filtra y controla stock, precios y rentabilidad.
            </p>
          </div>

          <button
            type="button"
            onClick={limpiarFiltros}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Limpiar filtros
          </button>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <ResumenCard label="Total" value={resumen.total} />
          <ResumenCard label="Activos" value={resumen.activos} tone="green" />
          <ResumenCard label="Inactivos" value={resumen.inactivos} />
          <ResumenCard label="Stock bajo" value={resumen.stockBajo} tone="red" />
          <ResumenCard label="Rentables" value={resumen.rentables} tone="green" />
          <ResumenCard label="Con pérdida" value={resumen.perdida} tone="red" />
        </div>

        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Buscar
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Código, nombre, categoría o marca..."
                className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-yellow-500 focus:bg-white focus:ring-4 focus:ring-yellow-100"
              />
            </div>
          </div>

          <FiltroSelect
            label="Estado"
            value={estadoFiltro}
            onChange={(value) => setEstadoFiltro(value as EstadoFiltro)}
            className="lg:col-span-2"
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </FiltroSelect>

          <FiltroSelect
            label="Categoría"
            value={categoriaFiltro}
            onChange={setCategoriaFiltro}
            className="lg:col-span-2"
          >
            <option value="todas">Todas</option>
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </FiltroSelect>

          <FiltroSelect
            label="Marca"
            value={marcaFiltro}
            onChange={setMarcaFiltro}
            className="lg:col-span-2"
          >
            <option value="todas">Todas</option>
            {marcas.map((marca) => (
              <option key={marca} value={marca}>
                {marca}
              </option>
            ))}
          </FiltroSelect>

          <FiltroSelect
            label="Orden"
            value={orden}
            onChange={(value) => setOrden(value as OrdenFiltro)}
            className="lg:col-span-2"
          >
            <option value="nombre_asc">Nombre A-Z</option>
            <option value="nombre_desc">Nombre Z-A</option>
            <option value="stock_asc">Stock menor</option>
            <option value="stock_desc">Stock mayor</option>
            <option value="precio_venta_asc">Venta menor</option>
            <option value="precio_venta_desc">Venta mayor</option>
            <option value="ganancia_asc">Ganancia menor</option>
            <option value="ganancia_desc">Ganancia mayor</option>
          </FiltroSelect>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <label className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={soloStockBajo}
              onChange={(e) => setSoloStockBajo(e.target.checked)}
              className="accent-yellow-500"
            />
            Solo stock bajo
          </label>

          <select
            value={rentabilidadFiltro}
            onChange={(e) =>
              setRentabilidadFiltro(e.target.value as RentabilidadFiltro)
            }
            className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-yellow-500"
          >
            <option value="todas">Toda rentabilidad</option>
            <option value="rentables">Solo rentables</option>
            <option value="sin_ganancia">Sin ganancia</option>
            <option value="perdida">Con pérdida</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <p className="text-sm font-black text-slate-900">
            Productos encontrados: {productosFiltrados.length}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Compra</th>
                <th className="px-4 py-3">Costo real</th>
                <th className="px-4 py-3">Venta</th>
                <th className="px-4 py-3">Ganancia</th>
                <th className="px-4 py-3">Estado</th>
                {canManageProductos ? (
                  <th className="px-4 py-3 text-right">Acciones</th>
                ) : null}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManageProductos ? 8 : 7}
                    className="px-4 py-10 text-center text-sm text-slate-500"
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
                      ? "bg-red-100 text-red-700"
                      : calculado.ganancia === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-emerald-100 text-emerald-700";

                  return (
                    <tr
                      key={producto.id}
                      className={`transition hover:bg-slate-50 ${isEditing ? "bg-yellow-50/70" : ""
                        }`}
                    >
                      <td className="px-4 py-3">
                        <div className="min-w-64">
                          <p className="font-black text-slate-900">
                            {producto.nombre}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {[producto.categoria, producto.marca || "Sin marca"]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${producto.activo
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                                }`}
                            >
                              {producto.activo ? "Activo" : "Inactivo"}
                            </span>

                            {calculado.stockBajo ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                                Stock bajo
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-lg font-black text-slate-900">
                          {producto.stock}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">
                          {formatMoney(calculado.precioCompraConIVA)}
                        </p>
                        <p className="text-xs text-slate-500">
                          s/IVA {formatMoney(calculado.precioCompraSinIVA)}
                        </p>
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-900">
                        {formatMoney(calculado.costoReal)}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">
                          {formatMoney(calculado.precioVentaSinIVA)}
                        </p>
                        <p className="text-xs text-slate-500">
                          c/IVA {formatMoney(calculado.precioVentaConIVA)}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p
                          className={`font-black ${calculado.ganancia < 0
                            ? "text-red-600"
                            : calculado.ganancia === 0
                              ? "text-yellow-600"
                              : "text-emerald-600"
                            }`}
                        >
                          {formatMoney(calculado.ganancia)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {calculado.margen.toFixed(2)}%
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${estadoClase}`}
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
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                              {isEditing ? (
                                <>
                                  <X className="h-4 w-4" />
                                  Cerrar
                                </>
                              ) : (
                                <>
                                  <Edit3 className="h-4 w-4" />
                                  Editar
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(producto.id)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Eliminando...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4" />
                                  Eliminar
                                </>
                              )}
                            </button>
                          </div>

                          {errorById[producto.id] ? (
                            <div className="mt-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
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
      </section>

      {canManageProductos && productoEnEdicion && editForm ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Editar producto
              </h3>
              <p className="text-sm text-slate-500">
                {productoEnEdicion.nombre}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSave(productoEnEdicion.id)}
                disabled={loadingActionId === productoEnEdicion.id}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {loadingActionId === productoEnEdicion.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={loadingActionId === productoEnEdicion.id}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <EditField label="Nombre">
                  <input
                    value={editForm.nombre}
                    onChange={(e) => updateEditField("nombre", e.target.value)}
                    className={inputClass}
                  />
                </EditField>

                <EditField label="Marca">
                  <input
                    value={editForm.marca}
                    onChange={(e) => updateEditField("marca", e.target.value)}
                    className={inputClass}
                  />
                </EditField>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <EditField label="Categoría">
                  <select
                    value={editForm.categoria}
                    onChange={(e) => updateEditField("categoria", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Selecciona una categoría</option>

                    {categoriasValidas.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                </EditField>

                <EditField label="Stock">
                  <input
                    type="number"
                    min="0"
                    value={editForm.stock}
                    onChange={(e) => updateEditField("stock", e.target.value)}
                    className={inputClass}
                  />
                </EditField>

                <EditField label="Compra sin IVA">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.precio_compra}
                    onChange={(e) =>
                      updateEditField("precio_compra", e.target.value)
                    }
                    className={inputClass}
                  />
                </EditField>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-black text-slate-900">
                  Extras incluidos
                </p>

                <div className="grid gap-3 md:grid-cols-3">
                  <EditExtra
                    label="Filtro"
                    checked={Boolean(editForm.incluye_filtro)}
                    value={editForm.costo_filtro}
                    onCheckedChange={(value) =>
                      updateEditField("incluye_filtro", value)
                    }
                    onValueChange={(value) =>
                      updateEditField("costo_filtro", value)
                    }
                  />

                  <EditExtra
                    label="Ambiental"
                    checked={Boolean(editForm.incluye_ambiental)}
                    value={editForm.costo_ambiental}
                    onCheckedChange={(value) =>
                      updateEditField("incluye_ambiental", value)
                    }
                    onValueChange={(value) =>
                      updateEditField("costo_ambiental", value)
                    }
                  />

                  <EditExtra
                    label="Tarjeta"
                    checked={Boolean(editForm.incluye_tarjeta)}
                    value={editForm.costo_tarjeta}
                    onCheckedChange={(value) =>
                      updateEditField("incluye_tarjeta", value)
                    }
                    onValueChange={(value) =>
                      updateEditField("costo_tarjeta", value)
                    }
                  />
                </div>
              </div>

              <EditField label="Notas">
                <textarea
                  rows={4}
                  value={editForm.notas}
                  onChange={(e) => updateEditField("notas", e.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                />
              </EditField>

              <label className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(editForm.activo)}
                  onChange={(e) => updateEditField("activo", e.target.checked)}
                  className="accent-yellow-500"
                />
                Producto activo
              </label>
            </div>

            <aside className="grid content-start gap-3">
              <div className="rounded-3xl bg-slate-950 p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
                  Venta sugerida sin IVA
                </p>
                <p className="mt-1 text-3xl font-black">
                  {formatMoney(calculoEdicion.precioSugeridoSinIVA)}
                </p>
                <p className="mt-2 text-xs text-slate-300">
                  Con IVA: {formatMoney(calculoEdicion.precioSugeridoConIVA)}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <EditInfo
                  label="Compra con IVA"
                  value={formatMoney(calculoEdicion.precioCompraConIVA)}
                />
                <EditInfo
                  label="Compra sin IVA"
                  value={formatMoney(calculoEdicion.precioCompraSinIVA)}
                />
                <EditInfo
                  label="Extras"
                  value={formatMoney(calculoEdicion.descuentoExtras)}
                />
                <EditInfo
                  label="Costo real"
                  value={formatMoney(calculoEdicion.costoReal)}
                />
                <EditInfo
                  label="Ganancia"
                  value={formatMoney(calculoEdicion.ganancia)}
                />
                <EditInfo
                  label="Margen"
                  value={`${calculoEdicion.margen.toFixed(2)}%`}
                />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-900">
                  Estado actual
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${Boolean(editForm.activo)
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                      }`}
                  >
                    {Boolean(editForm.activo) ? "Activo" : "Inactivo"}
                  </span>

                  {calculoEdicion.stockBajo ? (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                      Stock bajo
                    </span>
                  ) : null}
                </div>
              </div>

              {errorById[productoEnEdicion.id] ? (
                <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {errorById[productoEnEdicion.id]}
                </div>
              ) : null}
            </aside>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ResumenCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "green" | "red";
}) {
  const styles =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "red"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-slate-200 bg-slate-50 text-slate-900";

  return (
    <div className={`rounded-2xl border p-3 ${styles}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function FiltroSelect({
  label,
  value,
  onChange,
  className = "",
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-bold text-slate-700">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-yellow-500 focus:bg-white"
      >
        {children}
      </select>
    </div>
  );
}

function EditField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function EditInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function EditExtra({
  label,
  checked,
  value,
  onCheckedChange,
  onValueChange,
}: {
  label: string;
  checked: boolean;
  value: string;
  onCheckedChange: (value: boolean) => void;
  onValueChange: (value: string) => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 transition ${checked
        ? "border-yellow-300 bg-yellow-50"
        : "border-slate-200 bg-white"
        }`}
    >
      <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="accent-yellow-500"
        />
        {label}
      </label>

      {checked ? (
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="mt-3 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
          placeholder="0.00"
        />
      ) : null}
    </div>
  );
}