"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  createOrden,
  createPreOrdenTecnico,
  getClientesForOrden,
  getProductosActivos,
  getProductosUltimaOrdenVehiculo,
  getServiciosActivos,
  getSugerenciasFidelizacionOrden,
  getTecnicosActivos,
  getVehiculosByCliente,
  getServiciosSugeridosPorHistorial,
} from "./actions";

import {
  calcularDescuentoPuntosFormulario,
  calcularTotalFormulario,
} from "@/features/ordenes/domain/orden-form-calculos";

import {
  buildServicioItem,
  isEmptyInitialItem,
  hasProductoEnItems,
  hasServicioEnItems,
  buildInitialItemSearches,
} from "@/features/ordenes/domain/orden-form-items";

import type {
  Cliente,
  Combo,
  OrdenConRelaciones,
  OrdenFormData,
  Producto,
  Servicio,
  SugerenciaFidelizacionOrden,
  Vehiculo,
} from "@/types";

import { getCombosActivos, getComboForOrden } from "@/features/combos/actions";
import { getClienteFidelizacionResumen } from "@/features/clientes/fidelizacion-actions";

import { OrdenClienteVehiculoSection } from "@/features/ordenes/components/orden-cliente-vehiculo-section";
import { OrdenTotalesSection } from "@/features/ordenes/components/orden-totales-section";
import { OrdenMensajesSection } from "@/features/ordenes/components/orden-mensajes-section";

import { OrdenItemsSection } from "@/features/ordenes/components/orden-items-section";

type TecnicoOption = {
  id: string;
  nombre: string;
};

type ItemTipo = "servicio" | "producto";

type ItemSearchState = {
  servicio: string;
  producto: string;
};

const emptyItem = {
  servicio_id: "",
  producto_id: "",
  tipo_item: "servicio" as const,
  nombre_item: "",
  cantidad: "1",
  precio_unitario: "0",
  total: "0",
};

const initialState: OrdenFormData = {
  cliente_id: "",
  vehiculo_id: "",
  tecnico_id: "",
  tecnicos_ids: [],
  kilometraje: "",
  descuento: "0",
  descuento_puntos: "0",
  puntos_canjear: "0",
  notas: "",
  proximo_mantenimiento_fecha: "",
  proximo_mantenimiento_km: "",
  items: [{ ...emptyItem }],
};

type OrdenFormProps = {
  onCreated?: (ordenCreada?: OrdenConRelaciones | null) => Promise<void> | void;
  clienteIdInicial?: string;
  vehiculoIdInicial?: string;
  modo?: "normal" | "preorden_tecnico";
};

type ServicioSugerido = {
  servicio_id: string;
  nombre: string;
  veces: number;
};

type ProductoRecordadoVehiculo = {
  producto_id: string;
  nombre_item: string;
  cantidad: number;
  precio_unitario: number;
  orden_id: string;
  orden_numero: string;
  fecha: string;
};

type ProductosRecordadosVehiculoState = {
  aceite: ProductoRecordadoVehiculo | null;
  filtro: ProductoRecordadoVehiculo | null;
};

function formatCurrency(value: number | string | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}


function uniqueServiciosById(items: Servicio[]) {
  const map = new Map<string, Servicio>();

  for (const item of items) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}

function formatFechaCorta(fecha?: string | null) {
  if (!fecha) return "-";

  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return fecha;

  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}


function getProductoKeywordsByServicio(servicioNombre: string) {
  const nombre = normalizeText(servicioNombre);

  if (nombre.includes("cambio de aceite")) {
    return [
      "aceite",
      "filtro",
      "filtro aceite",
      "arandela",
      "empaque",
    ];
  }

  if (nombre.includes("lavado")) {
    return [
      "shampoo",
      "silicona",
      "desengrasante",
      "ambiental",
      "cera",
    ];
  }

  if (nombre.includes("alineacion") || nombre.includes("alineación")) {
    return [];
  }

  if (nombre.includes("balanceo")) {
    return [
      "plomo",
      "peso",
      "valvula",
      "válvula",
    ];
  }

  if (nombre.includes("frenos")) {
    return [
      "pastilla",
      "zapatas",
      "liquido de frenos",
      "líquido de frenos",
      "disco",
    ];
  }

  if (nombre.includes("radiador") || nombre.includes("coolant")) {
    return [
      "refrigerante",
      "coolant",
      "anticongelante",
    ];
  }

  return [];
}

function getProductosSugeridosPorServicio(
  servicioNombre: string,
  productos: Producto[]
) {
  const keywords = getProductoKeywordsByServicio(servicioNombre);

  if (keywords.length === 0) {
    return [];
  }

  return productos
    .filter((producto) => {
      const texto = normalizeText(
        `${producto.nombre} ${producto.marca ?? ""}`
      );

      return keywords.some((keyword) => texto.includes(normalizeText(keyword)));
    })
    .slice(0, 6);
}

export function OrdenForm({
  onCreated,
  clienteIdInicial,
  vehiculoIdInicial,
  modo = "normal",
}: OrdenFormProps) {
  const searchParams = useSearchParams();

  const [form, setForm] = useState<OrdenFormData>(initialState);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [tecnicos, setTecnicos] = useState<TecnicoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [combos, setCombos] = useState<Combo[]>([]);
  const [comboLoading, setComboLoading] = useState(false);
  const [puntosCliente, setPuntosCliente] = useState(0);
  const [serviciosSugeridos, setServiciosSugeridos] = useState<ServicioSugerido[]>([]);

  const [productosRecordadosVehiculo, setProductosRecordadosVehiculo] =
    useState<ProductosRecordadosVehiculoState>({
      aceite: null,
      filtro: null,
    });

  const [sugerenciasFidelizacion, setSugerenciasFidelizacion] = useState<
    SugerenciaFidelizacionOrden[]
  >([]);
  const [loadingSugerencias, setLoadingSugerencias] = useState(false);
  const [errorSugerencias, setErrorSugerencias] = useState("");
  const [promoSeleccionadaId, setPromoSeleccionadaId] = useState("");

  const [itemSearches, setItemSearches] = useState<ItemSearchState[]>(
    buildInitialItemSearches(initialState.items)
  );

  const esPreOrdenTecnico = modo === "preorden_tecnico";

  const clienteSeleccionado = useMemo(
    () => clientes.find((cliente) => cliente.id === form.cliente_id) ?? null,
    [clientes, form.cliente_id]
  );

  const vehiculoSeleccionado = useMemo(
    () => vehiculos.find((vehiculo) => vehiculo.id === form.vehiculo_id) ?? null,
    [vehiculos, form.vehiculo_id]
  );

  const serviciosBaseRapidos = useMemo(() => {
    const keywords = [
      "cambio de aceite",
      "lavado",
      "lavado express",
      "alineacion",
      "alineación",
      "balanceo",
    ];

    return servicios.filter((servicio) => {
      const texto = normalizeText(
        `${servicio.nombre} ${servicio.descripcion ?? ""} ${servicio.categoria ?? ""}`
      );

      return keywords.some((keyword) => texto.includes(normalizeText(keyword)));
    });
  }, [servicios]);

  const serviciosRapidos = useMemo(() => {
    const sugeridos = serviciosSugeridos
      .map((sugerido) => servicios.find((servicio) => servicio.id === sugerido.servicio_id))
      .filter((servicio): servicio is Servicio => Boolean(servicio));

    if (sugeridos.length > 0) {
      return uniqueServiciosById([...sugeridos, ...serviciosBaseRapidos]).slice(0, 6);
    }

    return uniqueServiciosById(serviciosBaseRapidos).slice(0, 6);
  }, [servicios, serviciosBaseRapidos, serviciosSugeridos]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [clientesData, serviciosData, productosData, combosData] =
          await Promise.all([
            getClientesForOrden(),
            getServiciosActivos(),
            getProductosActivos(),
            getCombosActivos(),
          ]);

        setClientes(clientesData);
        setServicios(serviciosData);
        setProductos(productosData);
        setCombos(combosData);

        if (!esPreOrdenTecnico) {
          const tecnicosData = await getTecnicosActivos();

          setTecnicos(
            (tecnicosData ?? []).map(
              (tecnico: { id: string; nombre?: string | null }) => ({
                id: tecnico.id,
                nombre: tecnico.nombre?.trim() || "Técnico sin nombre",
              })
            )
          );
        } else {
          setTecnicos([]);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudieron cargar los datos";
        setError(message);
      } finally {
        setLoadingData(false);
      }
    }

    loadInitialData();
  }, [esPreOrdenTecnico]);

  useEffect(() => {
    const clienteIdQuery = searchParams.get("cliente_id") || "";
    const vehiculoIdQuery = searchParams.get("vehiculo_id") || "";

    if (!clienteIdQuery && !vehiculoIdQuery && !clienteIdInicial && !vehiculoIdInicial) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      cliente_id: clienteIdQuery || clienteIdInicial || prev.cliente_id,
      vehiculo_id: vehiculoIdQuery || vehiculoIdInicial || prev.vehiculo_id,
    }));
  }, [searchParams, clienteIdInicial, vehiculoIdInicial]);

  useEffect(() => {
    async function loadVehiculos() {
      if (!form.cliente_id) {
        setVehiculos([]);
        setForm((prev) => ({
          ...prev,
          vehiculo_id: "",
          kilometraje: "",
        }));
        return;
      }

      try {
        const data = await getVehiculosByCliente(form.cliente_id);
        setVehiculos(data);

        const vehiculoIdQuery = searchParams.get("vehiculo_id") || "";
        const vehiculoInicial = vehiculoIdQuery || vehiculoIdInicial || "";

        if (vehiculoInicial && data.some((v) => v.id === vehiculoInicial)) {
          setForm((prev) => ({
            ...prev,
            vehiculo_id: vehiculoInicial,
          }));
          return;
        }

        if (
          prevVehiculoValido(data, form.vehiculo_id)
        ) {
          return;
        }

        if (data.length === 1) {
          setForm((prev) => ({
            ...prev,
            vehiculo_id: data[0].id,
            kilometraje: data[0].kilometraje_actual
              ? String(data[0].kilometraje_actual)
              : prev.kilometraje,
          }));
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudieron cargar los vehículos";
        setError(message);
      }
    }

    loadVehiculos();
  }, [form.cliente_id, form.vehiculo_id, searchParams, vehiculoIdInicial]);

  useEffect(() => {
    async function loadPuntos() {
      if (!form.cliente_id) {
        setPuntosCliente(0);
        setForm((prev) => ({
          ...prev,
          puntos_canjear: "0",
        }));
        return;
      }

      try {
        const resumen = await getClienteFidelizacionResumen(form.cliente_id);
        setPuntosCliente(resumen.puntosDisponibles);
      } catch (err) {
        console.error("Error cargando puntos cliente:", err);
      }
    }

    loadPuntos();
  }, [form.cliente_id]);

  useEffect(() => {
    async function loadSugerencias() {
      if (!form.cliente_id) {
        setSugerenciasFidelizacion([]);
        setErrorSugerencias("");
        setPromoSeleccionadaId("");
        return;
      }

      try {
        setLoadingSugerencias(true);
        setErrorSugerencias("");

        const response = await getSugerenciasFidelizacionOrden(form.cliente_id);
        setSugerenciasFidelizacion(response.sugerencias);
      } catch (err) {
        console.error("Error cargando sugerencias de fidelización:", err);
        setErrorSugerencias("No se pudieron cargar las sugerencias automáticas");
        setSugerenciasFidelizacion([]);
      } finally {
        setLoadingSugerencias(false);
      }
    }

    loadSugerencias();
  }, [form.cliente_id]);

  useEffect(() => {
    async function loadSugeridos() {
      if (!form.cliente_id) {
        setServiciosSugeridos([]);
        return;
      }

      try {
        const data = await getServiciosSugeridosPorHistorial(form.cliente_id);
        setServiciosSugeridos(data);
      } catch (err) {
        console.error("Error cargando servicios sugeridos:", err);
        setServiciosSugeridos([]);
      }
    }

    loadSugeridos();
  }, [form.cliente_id]);

  useEffect(() => {
    async function loadProductosRecordadosVehiculo() {
      if (!form.vehiculo_id) {
        setProductosRecordadosVehiculo({
          aceite: null,
          filtro: null,
        });
        return;
      }

      try {
        const data = await getProductosUltimaOrdenVehiculo(form.vehiculo_id);
        setProductosRecordadosVehiculo(data);
      } catch (err) {
        console.error("Error cargando productos recordados del vehículo:", err);
        setProductosRecordadosVehiculo({
          aceite: null,
          filtro: null,
        });
      }
    }

    loadProductosRecordadosVehiculo();
  }, [form.vehiculo_id]);


  function prevVehiculoValido(lista: Vehiculo[], vehiculoId: string) {
    return Boolean(vehiculoId && lista.some((vehiculo) => vehiculo.id === vehiculoId));
  }

  function updateField<K extends keyof OrdenFormData>(
    key: K,
    value: OrdenFormData[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function toggleTecnico(tecnicoId: string, checked: boolean) {
    setForm((prev) => {
      const actuales = prev.tecnicos_ids ?? [];

      if (checked) {
        return {
          ...prev,
          tecnicos_ids: Array.from(new Set([...actuales, tecnicoId])),
        };
      }

      return {
        ...prev,
        tecnicos_ids: actuales.filter((id) => id !== tecnicoId),
      };
    });
  }

  function updateItem(index: number, field: string, value: string) {
    setForm((prev) => {
      const nextItems = [...prev.items];
      const current = { ...nextItems[index], [field]: value };

      if (field === "tipo_item") {
        current.servicio_id = "";
        current.producto_id = "";
        current.nombre_item = "";
        current.precio_unitario = "0";
        current.total = String(Number(current.cantidad || "0") * 0);
      }

      if (field === "servicio_id" && current.tipo_item === "servicio") {
        const servicio = servicios.find((s) => s.id === value);

        if (servicio) {
          current.nombre_item = servicio.nombre;
          current.precio_unitario = String(servicio.precio_base);
          current.total = String(
            Number(current.cantidad || "1") * Number(servicio.precio_base)
          );
        }
      }

      if (field === "producto_id" && current.tipo_item === "producto") {
        const producto = productos.find((p) => p.id === value);

        if (producto) {
          current.nombre_item = producto.nombre;
          current.precio_unitario = String(producto.precio_venta);

          const cantidadActual = Number(current.cantidad || "1");
          const stockProducto = Number(producto.stock || 0);
          const cantidadAjustada =
            cantidadActual > stockProducto ? stockProducto : cantidadActual;

          current.cantidad = String(cantidadAjustada <= 0 ? 1 : cantidadAjustada);
          current.total = String(
            Number(current.cantidad || "1") * Number(producto.precio_venta)
          );
        }
      }

      if (field === "cantidad" || field === "precio_unitario") {
        if (current.tipo_item === "producto" && current.producto_id) {
          const producto = productos.find((p) => p.id === current.producto_id);

          if (producto) {
            const cantidad = Number(current.cantidad || "0");
            if (cantidad > Number(producto.stock)) {
              current.cantidad = String(producto.stock);
            }
          }
        }

        current.total = String(
          Number(current.cantidad || "0") * Number(current.precio_unitario || "0")
        );
      }

      nextItems[index] = current;

      return {
        ...prev,
        items: nextItems,
      };
    });

    if (field === "tipo_item") {
      setItemSearches((prev) => {
        const next = [...prev];
        next[index] = { servicio: "", producto: "" };
        return next;
      });
    }

    if (field === "servicio_id") {
      const servicio = servicios.find((s) => s.id === value);
      setItemSearches((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          servicio: servicio?.nombre ?? "",
        };
        return next;
      });
    }

    if (field === "producto_id") {
      const producto = productos.find((p) => p.id === value);
      setItemSearches((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          producto: producto?.nombre ?? "",
        };
        return next;
      });
    }
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }],
    }));

    setItemSearches((prev) => [
      ...prev,
      {
        servicio: "",
        producto: "",
      },
    ]);
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));

    setItemSearches((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateItemSearch(index: number, tipo: ItemTipo, value: string) {
    setItemSearches((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [tipo]: value,
      };
      return next;
    });
  }

  function selectServicioForItem(index: number, servicioId: string) {
    updateItem(index, "servicio_id", servicioId);
  }

  function selectProductoForItem(index: number, productoId: string) {
    updateItem(index, "producto_id", productoId);
  }

  function addServicioRapido(servicio: Servicio) {
    const newItem = buildServicioItem(servicio);

    setForm((prev) => {
      const hasOnlyEmptyInitialItem =
        prev.items.length === 1 &&
        !prev.items[0].nombre_item.trim() &&
        !prev.items[0].servicio_id &&
        !prev.items[0].producto_id;

      return {
        ...prev,
        items: hasOnlyEmptyInitialItem ? [newItem] : [...prev.items, newItem],
      };
    });

    setItemSearches((prev) => {
      const newSearch = {
        servicio: servicio.nombre,
        producto: "",
      };

      const hasOnlyEmptyInitialItem =
        form.items.length === 1 &&
        !form.items[0].nombre_item.trim() &&
        !form.items[0].servicio_id &&
        !form.items[0].producto_id;

      return hasOnlyEmptyInitialItem ? [newSearch] : [...prev, newSearch];
    });

    setSuccess(`Servicio "${servicio.nombre}" agregado.`);
    setError("");
  }

  function addProductoDesdeSugerencia(producto: Producto) {
    const newItem = {
      tipo_item: "producto" as const,
      servicio_id: "",
      producto_id: producto.id,
      nombre_item: producto.nombre,
      cantidad: "1",
      precio_unitario: String(producto.precio_venta ?? 0),
      total: String(Number(producto.precio_venta ?? 0)),
    };

    setForm((prev) => {
      const hasOnlyEmptyInitialItem =
        prev.items.length === 1 &&
        !prev.items[0].nombre_item.trim() &&
        !prev.items[0].servicio_id &&
        !prev.items[0].producto_id;

      return {
        ...prev,
        items: hasOnlyEmptyInitialItem ? [newItem] : [...prev.items, newItem],
      };
    });

    setItemSearches((prev) => {
      const newSearch = {
        servicio: "",
        producto: producto.nombre,
      };

      const hasOnlyEmptyInitialItem =
        form.items.length === 1 &&
        !form.items[0].nombre_item.trim() &&
        !form.items[0].servicio_id &&
        !form.items[0].producto_id;

      return hasOnlyEmptyInitialItem ? [newSearch] : [...prev, newSearch];
    });

    setSuccess(`Producto "${producto.nombre}" agregado.`);
    setError("");
  }

  function addProductoRecordado(productoId: string) {
    const producto = productos.find((item) => item.id === productoId);

    if (!producto) {
      setError("El producto recordado no está disponible en el catálogo actual.");
      setSuccess("");
      return;
    }

    const yaExiste = form.items.some(
      (item) => item.tipo_item === "producto" && item.producto_id === producto.id
    );

    if (yaExiste) {
      setError("");
      setSuccess(`"${producto.nombre}" ya está agregado en la orden.`);
      return;
    }

    const newItem = {
      tipo_item: "producto" as const,
      servicio_id: "",
      producto_id: producto.id,
      nombre_item: producto.nombre,
      cantidad: "1",
      precio_unitario: String(producto.precio_venta ?? 0),
      total: String(Number(producto.precio_venta ?? 0)),
    };

    setForm((prev) => {
      const hasOnlyEmptyInitialItem =
        prev.items.length === 1 && isEmptyInitialItem(prev.items[0]);

      return {
        ...prev,
        items: hasOnlyEmptyInitialItem ? [newItem] : [...prev.items, newItem],
      };
    });

    setItemSearches((prev) => {
      const newSearch = {
        servicio: "",
        producto: producto.nombre,
      };

      const hasOnlyEmptyInitialItem =
        form.items.length === 1 && isEmptyInitialItem(form.items[0]);

      return hasOnlyEmptyInitialItem ? [newSearch] : [...prev, newSearch];
    });

    setSuccess(`Producto recordado "${producto.nombre}" agregado.`);
    setError("");
  }

  function addCambioAceiteCompleto() {
    const servicioCambioAceite = servicios.find((servicio) => {
      const texto = normalizeText(
        `${servicio.nombre} ${servicio.descripcion ?? ""} ${servicio.categoria ?? ""}`
      );

      return texto.includes("cambio de aceite");
    });

    if (!servicioCambioAceite) {
      setError("No se encontró el servicio de cambio de aceite.");
      setSuccess("");
      return;
    }

    const itemsActuales = form.items;
    const itemsNuevos: OrdenFormData["items"] = [];
    const busquedasNuevas: ItemSearchState[] = [];

    const yaExisteServicio = hasServicioEnItems(
      itemsActuales,
      servicioCambioAceite.id
    );

    if (!yaExisteServicio) {
      itemsNuevos.push({
        tipo_item: "servicio",
        servicio_id: servicioCambioAceite.id,
        producto_id: "",
        nombre_item: servicioCambioAceite.nombre,
        cantidad: "1",
        precio_unitario: String(servicioCambioAceite.precio_base ?? 0),
        total: String(Number(servicioCambioAceite.precio_base ?? 0)),
      });

      busquedasNuevas.push({
        servicio: servicioCambioAceite.nombre,
        producto: "",
      });
    }

    if (productosRecordadosVehiculo.aceite?.producto_id) {
      const aceite = productos.find(
        (producto) => producto.id === productosRecordadosVehiculo.aceite?.producto_id
      );

      if (aceite && !hasProductoEnItems(itemsActuales, aceite.id)) {
        itemsNuevos.push({
          tipo_item: "producto",
          servicio_id: "",
          producto_id: aceite.id,
          nombre_item: aceite.nombre,
          cantidad: "1",
          precio_unitario: String(aceite.precio_venta ?? 0),
          total: String(Number(aceite.precio_venta ?? 0)),
        });

        busquedasNuevas.push({
          servicio: "",
          producto: aceite.nombre,
        });
      }
    }

    if (productosRecordadosVehiculo.filtro?.producto_id) {
      const filtro = productos.find(
        (producto) => producto.id === productosRecordadosVehiculo.filtro?.producto_id
      );

      if (filtro) {
        const categoriaFiltro = normalizeText(filtro.categoria ?? "");

        if (
          categoriaFiltro === "filtro_aceite" &&
          !hasProductoEnItems(itemsActuales, filtro.id)
        ) {
          itemsNuevos.push({
            tipo_item: "producto",
            servicio_id: "",
            producto_id: filtro.id,
            nombre_item: filtro.nombre,
            cantidad: "1",
            precio_unitario: String(filtro.precio_venta ?? 0),
            total: String(Number(filtro.precio_venta ?? 0)),
          });

          busquedasNuevas.push({
            servicio: "",
            producto: filtro.nombre,
          });
        }
      }
    }

    if (itemsNuevos.length === 0) {
      setError("");
      setSuccess("El cambio de aceite, aceite y filtro ya están agregados en la orden.");
      return;
    }

    setForm((prev) => {
      const hasOnlyEmptyInitialItem =
        prev.items.length === 1 && isEmptyInitialItem(prev.items[0]);

      return {
        ...prev,
        items: hasOnlyEmptyInitialItem
          ? itemsNuevos
          : [...prev.items, ...itemsNuevos],
      };
    });

    setItemSearches((prev) => {
      const hasOnlyEmptyInitialItem =
        form.items.length === 1 && isEmptyInitialItem(form.items[0]);

      return hasOnlyEmptyInitialItem
        ? busquedasNuevas
        : [...prev, ...busquedasNuevas];
    });

    const agregoServicio = itemsNuevos.some(
      (item) =>
        item.tipo_item === "servicio" &&
        item.servicio_id === servicioCambioAceite.id
    );

    const agregoAceite = itemsNuevos.some(
      (item) =>
        item.tipo_item === "producto" &&
        item.producto_id === productosRecordadosVehiculo.aceite?.producto_id
    );

    const agregoFiltro = itemsNuevos.some(
      (item) =>
        item.tipo_item === "producto" &&
        item.producto_id === productosRecordadosVehiculo.filtro?.producto_id
    );

    if (agregoServicio && agregoAceite && agregoFiltro) {
      setSuccess("Cambio de aceite cargado con servicio, aceite y filtro del historial.");
    } else if (agregoServicio && agregoAceite) {
      setSuccess("Cambio de aceite cargado con servicio y último aceite del historial.");
    } else if (agregoServicio) {
      setSuccess("Servicio de cambio de aceite agregado. Completa el aceite y filtro si hace falta.");
    } else if (agregoAceite || agregoFiltro) {
      setSuccess("Se agregaron productos faltantes del último cambio de aceite.");
    } else {
      setSuccess("No había productos nuevos para agregar.");
    }

    setError("");
  }

  const descuentoPuntos = useMemo(() => {
    return calcularDescuentoPuntosFormulario(form.puntos_canjear);
  }, [form.puntos_canjear]);

  const total = useMemo(() => {
    return calcularTotalFormulario({
      items: form.items,
      descuento: form.descuento,
      puntos_canjear: form.puntos_canjear,
    }).total;
  }, [form.items, form.descuento, form.puntos_canjear]);

  function getSugerenciaClasses(tipo: SugerenciaFidelizacionOrden["tipo"]) {
    switch (tipo) {
      case "promo_disponible":
        return "border-green-200 bg-green-50 text-green-900";
      case "cerca_recompensa":
        return "border-yellow-200 bg-yellow-50 text-yellow-900";
      case "upsell":
        return "border-blue-200 bg-blue-50 text-blue-900";
      case "reactivacion":
        return "border-purple-200 bg-purple-50 text-purple-900";
      default:
        return "border-gray-200 bg-gray-50 text-gray-900";
    }
  }

  function aplicarPromoDesdeSugerencia(sugerencia: SugerenciaFidelizacionOrden) {
    const promo = sugerencia.promocion;

    if (!promo) return;

    setError("");
    setSuccess("");

    if (promo.tipo === "descuento" && promo.puntos_requeridos <= puntosCliente) {
      setForm((prev) => ({
        ...prev,
        puntos_canjear: String(promo.puntos_requeridos),
      }));
      setPromoSeleccionadaId(sugerencia.id);
      setSuccess(`Promo "${promo.nombre}" aplicada en la orden.`);
      return;
    }

    if (promo.tipo === "servicio_gratis" && promo.servicio_codigo) {
      const servicio = servicios.find((s) => s.id === promo.servicio_codigo);

      if (!servicio) {
        setError("No se encontró el servicio de la promoción.");
        return;
      }

      const newItem = {
        tipo_item: "servicio" as const,
        servicio_id: servicio.id,
        producto_id: "",
        nombre_item: `${servicio.nombre} (PROMO)`,
        cantidad: "1",
        precio_unitario: "0",
        total: "0",
      };

      setForm((prev) => ({
        ...prev,
        items: [...prev.items, newItem],
      }));

      setItemSearches((prev) => [
        ...prev,
        {
          servicio: servicio.nombre,
          producto: "",
        },
      ]);

      setPromoSeleccionadaId(sugerencia.id);
      setSuccess(`Promo "${promo.nombre}" agregada como servicio gratis.`);
      return;
    }

    setPromoSeleccionadaId(sugerencia.id);
    setSuccess(`Sugerencia "${sugerencia.titulo}" marcada.`);
  }

  function getTextoBotonSugerencia(sugerencia: SugerenciaFidelizacionOrden) {
    if (!sugerencia.promocion) return "Marcar sugerencia";
    if (sugerencia.promocion.tipo === "descuento") return "Aplicar descuento";
    if (sugerencia.promocion.tipo === "servicio_gratis") return "Usar promo";
    return "Aplicar";
  }

  async function handleAddCombo(comboId: string) {
    if (!comboId) return;

    try {
      setComboLoading(true);
      setError("");
      setSuccess("");

      const { combo, items } = await getComboForOrden(comboId);

      if (!items.length) {
        setError("El combo seleccionado no tiene items.");
        return;
      }

      const mappedItems = items.map((item) => ({
        tipo_item: item.tipo_item,
        servicio_id: item.servicio_id ?? "",
        producto_id: item.producto_id ?? "",
        nombre_item: item.nombre_item,
        cantidad: String(item.cantidad ?? 1),
        precio_unitario: String(item.precio_unitario ?? 0),
        total: String(
          Number(item.cantidad ?? 0) * Number(item.precio_unitario ?? 0)
        ),
      }));

      setForm((prev) => {
        const hasOnlyEmptyInitialItem =
          prev.items.length === 1 &&
          !prev.items[0].nombre_item.trim() &&
          !prev.items[0].servicio_id &&
          !prev.items[0].producto_id;

        return {
          ...prev,
          items: hasOnlyEmptyInitialItem
            ? mappedItems
            : [...prev.items, ...mappedItems],
        };
      });

      setItemSearches((prev) => {
        const mappedSearches = mappedItems.map((item) => ({
          servicio: item.tipo_item === "servicio" ? item.nombre_item : "",
          producto: item.tipo_item === "producto" ? item.nombre_item : "",
        }));

        const hasOnlyEmptyInitialItem =
          form.items.length === 1 &&
          !form.items[0].nombre_item.trim() &&
          !form.items[0].servicio_id &&
          !form.items[0].producto_id;

        return hasOnlyEmptyInitialItem ? mappedSearches : [...prev, ...mappedSearches];
      });

      setSuccess(`Combo "${combo.nombre}" agregado correctamente.`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo agregar el combo";
      setError(message);
    } finally {
      setComboLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.cliente_id) {
      setError("Debes seleccionar un cliente.");
      return;
    }

    if (!form.vehiculo_id) {
      setError("Debes seleccionar un vehículo.");
      return;
    }

    if (!esPreOrdenTecnico && !form.tecnico_id) {
      setError("Debes asignar un técnico.");
      return;
    }

    if (!esPreOrdenTecnico && !(form.tecnicos_ids ?? []).length) {
      setError("Debes seleccionar al menos un técnico asignado.");
      return;
    }

    if (!form.items.length) {
      setError("Debes agregar al menos un item.");
      return;
    }

    const invalidItem = form.items.some(
      (item) =>
        !item.tipo_item ||
        !item.nombre_item.trim() ||
        !item.cantidad.trim() ||
        Number(item.cantidad) <= 0 ||
        !item.precio_unitario.trim() ||
        (item.tipo_item === "servicio" && !item.servicio_id) ||
        (item.tipo_item === "producto" && !item.producto_id)
    );

    if (invalidItem) {
      setError("Revisa los items agregados a la orden.");
      return;
    }

    const productoSinStock = form.items.find((item) => {
      if (item.tipo_item !== "producto") return false;

      const producto = productos.find((p) => p.id === item.producto_id);
      if (!producto) return false;

      return Number(item.cantidad || 0) > Number(producto.stock || 0);
    });

    if (productoSinStock) {
      const producto = productos.find((p) => p.id === productoSinStock.producto_id);

      setError(
        `Stock insuficiente para ${producto?.nombre ?? productoSinStock.nombre_item
        }. Stock actual: ${producto?.stock ?? 0}.`
      );
      return;
    }

    try {
      setLoading(true);

      const formToSubmit: OrdenFormData = {
        ...form,
        tecnico_id: esPreOrdenTecnico ? "" : form.tecnico_id,
        descuento_puntos: String(descuentoPuntos),
        tecnicos_ids: esPreOrdenTecnico
          ? []
          : Array.from(
            new Set([...(form.tecnicos_ids ?? []), form.tecnico_id].filter(Boolean))
          ),
      };

      const ordenCreada = esPreOrdenTecnico
        ? await createPreOrdenTecnico(formToSubmit)
        : await createOrden(formToSubmit);

      setSuccess(
        esPreOrdenTecnico
          ? "Pre-orden creada correctamente."
          : "Orden creada correctamente."
      );

      if (onCreated) {
        await onCreated(ordenCreada);
      }

      setForm(initialState);
      setItemSearches(buildInitialItemSearches(initialState.items));
      setVehiculos([]);
      setSugerenciasFidelizacion([]);
      setPromoSeleccionadaId("");
      setError("");

      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo crear la orden";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!form.vehiculo_id) {
      return;
    }

    const vehiculoActual = vehiculos.find((vehiculo) => vehiculo.id === form.vehiculo_id);

    if (!vehiculoActual) {
      return;
    }

    const kilometrajeVehiculo = String(vehiculoActual.kilometraje_actual ?? "").trim();

    setForm((prev) => {
      const kilometrajeActual = String(prev.kilometraje ?? "").trim();

      if (kilometrajeActual) {
        return prev;
      }

      return {
        ...prev,
        kilometraje: kilometrajeVehiculo,
      };
    });
  }, [form.vehiculo_id, vehiculos]);

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <OrdenClienteVehiculoSection
        clienteSeleccionado={clienteSeleccionado}
        vehiculoSeleccionado={vehiculoSeleccionado}
      />

      <div
        className={`grid gap-4 ${esPreOrdenTecnico ? "md:grid-cols-2" : "md:grid-cols-3"}`}
      >
        <div>
          <label className="mb-1 block text-sm font-medium">Cliente</label>
          <select
            value={form.cliente_id}
            onChange={(e) => updateField("cliente_id", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            disabled={loadingData}
          >
            <option value="">Selecciona un cliente</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombres} {cliente.apellidos} - {cliente.telefono}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Vehículo</label>
          <select
            value={form.vehiculo_id}
            onChange={(e) => {
              const vehiculoId = e.target.value;
              const vehiculoSeleccionado = vehiculos.find((vehiculo) => vehiculo.id === vehiculoId);

              setForm((prev) => ({
                ...prev,
                vehiculo_id: vehiculoId,
                kilometraje: vehiculoSeleccionado?.kilometraje_actual
                  ? String(vehiculoSeleccionado.kilometraje_actual)
                  : prev.kilometraje,
              }));
            }}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            disabled={!form.cliente_id}
          >
            <option value="">Selecciona un vehículo</option>
            {vehiculos.map((vehiculo) => (
              <option key={vehiculo.id} value={vehiculo.id}>
                {vehiculo.placa} - {vehiculo.marca} {vehiculo.modelo}
              </option>
            ))}
          </select>
        </div>

        {!esPreOrdenTecnico ? (
          <div>
            <label className="mb-1 block text-sm font-medium">Técnico asignado</label>
            <select
              value={form.tecnico_id}
              onChange={(e) => {
                const tecnicoId = e.target.value;

                setForm((prev) => ({
                  ...prev,
                  tecnico_id: tecnicoId,
                  tecnicos_ids: tecnicoId
                    ? Array.from(new Set([...(prev.tecnicos_ids ?? []), tecnicoId]))
                    : prev.tecnicos_ids ?? [],
                }));
              }}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
              disabled={loadingData}
            >
              <option value="">Selecciona un técnico</option>
              {tecnicos.map((tecnico) => (
                <option key={tecnico.id} value={tecnico.id}>
                  {tecnico.nombre}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {!esPreOrdenTecnico ? (
        <div className="rounded-2xl border border-gray-200 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold">Técnicos asignados</h3>
            <p className="text-xs text-gray-500">
              Puedes asignar varios técnicos a la misma orden. El técnico principal también debe estar seleccionado aquí.
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {tecnicos.map((tecnico) => (
              <label
                key={tecnico.id}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={(form.tecnicos_ids ?? []).includes(tecnico.id)}
                  onChange={(e) => toggleTecnico(tecnico.id, e.target.checked)}
                />
                <span className="text-sm">{tecnico.nombre}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Esta vista crea una pre-orden. Aquí no se asignan técnicos; recepción la revisa después.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Kilometraje</label>
          <input
            type="number"
            value={form.kilometraje}
            onChange={(e) => updateField("kilometraje", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="120000"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Próxima fecha</label>
          <input
            type="date"
            value={form.proximo_mantenimiento_fecha}
            onChange={(e) => updateField("proximo_mantenimiento_fecha", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Próximo km</label>
          <input
            type="number"
            value={form.proximo_mantenimiento_km}
            onChange={(e) => updateField("proximo_mantenimiento_km", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            placeholder="125000"
          />
        </div>
      </div>

      {serviciosRapidos.length > 0 && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-green-900">Botones rápidos</h3>
            <p className="text-xs text-green-800">
              Agrega servicios frecuentes sin buscarlos. Se mezclan servicios base del taller y servicios más repetidos del cliente.
            </p>
          </div>

          {(productosRecordadosVehiculo.aceite || productosRecordadosVehiculo.filtro) && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-indigo-900">
                  Últimos productos usados en este vehículo
                </h3>
                <p className="text-xs text-indigo-800">
                  Recuperados del historial para repetir más rápido.
                </p>

                <div className="mb-3">
                  <button
                    type="button"
                    onClick={addCambioAceiteCompleto}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 bg-indigo-600 px-4 py-2 text-sm text-white transition hover:opacity-90"
                  >
                    Cargar cambio de aceite completo
                  </button>
                </div>

              </div>

              <div className="flex flex-wrap gap-2">
                {productosRecordadosVehiculo.aceite ? (
                  <button
                    type="button"
                    onClick={() =>
                      addProductoRecordado(productosRecordadosVehiculo.aceite!.producto_id)
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm text-indigo-900 transition hover:bg-indigo-100"
                  >
                    <span>
                      Último aceite: {productosRecordadosVehiculo.aceite.nombre_item}
                    </span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {formatFechaCorta(productosRecordadosVehiculo.aceite.fecha)}
                    </span>
                  </button>
                ) : null}

                {productosRecordadosVehiculo.filtro ? (
                  <button
                    type="button"
                    onClick={() =>
                      addProductoRecordado(productosRecordadosVehiculo.filtro!.producto_id)
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm text-indigo-900 transition hover:bg-indigo-100"
                  >
                    <span>
                      Último filtro: {productosRecordadosVehiculo.filtro.nombre_item}
                    </span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {formatFechaCorta(productosRecordadosVehiculo.filtro.fecha)}
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {serviciosRapidos.map((servicio) => {
              const fueSugeridoPorHistorial = serviciosSugeridos.some(
                (item) => item.servicio_id === servicio.id
              );

              const vecesHistorial =
                serviciosSugeridos.find((item) => item.servicio_id === servicio.id)?.veces ?? 0;

              return (
                <button
                  key={servicio.id}
                  type="button"
                  onClick={() => addServicioRapido(servicio)}
                  className="inline-flex items-center gap-2 rounded-xl border border-green-300 bg-white px-3 py-2 text-sm text-green-900 transition hover:bg-green-100"
                >
                  <span>{servicio.nombre}</span>

                  {fueSugeridoPorHistorial ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      {vecesHistorial}x cliente
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 rounded-2xl border border-gray-200 p-4">
        <div>
          <h3 className="text-lg font-semibold">Agregar combo</h3>
          <p className="text-sm text-gray-500">
            Selecciona un combo para cargar automáticamente sus servicios y productos.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <select
            defaultValue=""
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              handleAddCombo(value);
              e.target.value = "";
            }}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
            disabled={loadingData || comboLoading}
          >
            <option value="">Selecciona un combo</option>
            {combos.map((combo) => (
              <option key={combo.id} value={combo.id}>
                {combo.nombre} · ${Number(combo.precio_combo).toFixed(2)}
              </option>
            ))}
          </select>

          <div className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500">
            {comboLoading ? "Cargando combo..." : `${combos.length} combos disponibles`}
          </div>
        </div>
      </div>

      <OrdenItemsSection
        items={form.items}
        servicios={servicios}
        productos={productos}
        itemSearches={itemSearches}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        onUpdateItem={updateItem}
        onUpdateItemSearch={updateItemSearch}
        onSelectServicioForItem={selectServicioForItem}
        onSelectProductoForItem={selectProductoForItem}
        onAddProductoDesdeSugerencia={addProductoDesdeSugerencia}
      />

      <OrdenTotalesSection
        descuento={form.descuento}
        puntosCanjear={form.puntos_canjear}
        puntosCliente={puntosCliente}
        descuentoPuntos={descuentoPuntos}
        total={total}
        onChangeDescuento={(value) => updateField("descuento", value)}
        onChangePuntos={(value) => updateField("puntos_canjear", value)}
      />

      {serviciosSugeridos.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="mb-2 text-sm font-semibold text-blue-900">
            Historial del cliente
          </p>

          <div className="flex flex-wrap gap-2">
            {serviciosSugeridos.map((s) => {
              const servicio = servicios.find((x) => x.id === s.servicio_id);
              if (!servicio) return null;

              return (
                <button
                  key={s.servicio_id}
                  type="button"
                  onClick={() => addServicioRapido(servicio)}
                  className="rounded-xl border border-blue-300 bg-white px-3 py-1 text-sm text-blue-900 transition hover:bg-blue-100"
                >
                  {s.nombre} ({s.veces}x)
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold">Sugerencias automáticas</h3>
          <p className="text-xs text-gray-500">
            Recomendaciones según los puntos y la actividad del cliente.
          </p>
        </div>

        {loadingSugerencias ? (
          <p className="text-sm text-gray-500">Cargando sugerencias...</p>
        ) : errorSugerencias ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorSugerencias}
          </div>
        ) : sugerenciasFidelizacion.length === 0 ? (
          <p className="text-sm text-gray-500">
            Este cliente no tiene sugerencias automáticas por ahora.
          </p>
        ) : (
          <div className="grid gap-3">
            {sugerenciasFidelizacion.map((sugerencia) => {
              const seleccionada = promoSeleccionadaId === sugerencia.id;

              return (
                <div
                  key={sugerencia.id}
                  className={`rounded-xl border px-3 py-3 ${getSugerenciaClasses(
                    sugerencia.tipo
                  )}`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{sugerencia.titulo}</p>
                      <p className="mt-1 text-sm">{sugerencia.mensaje}</p>

                      {sugerencia.promocion ? (
                        <p className="mt-2 text-xs font-medium opacity-80">
                          Requiere {sugerencia.promocion.puntos_requeridos} puntos
                        </p>
                      ) : null}

                      {seleccionada ? (
                        <p className="mt-2 text-xs font-semibold">Sugerencia seleccionada</p>
                      ) : null}
                    </div>

                    <div className="md:w-auto">
                      <button
                        type="button"
                        onClick={() => aplicarPromoDesdeSugerencia(sugerencia)}
                        className="w-full rounded-xl border border-black px-3 py-2 text-sm md:w-auto"
                      >
                        {getTextoBotonSugerencia(sugerencia)}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notas</label>
        <textarea
          value={form.notas}
          onChange={(e) => updateField("notas", e.target.value)}
          className="min-h-25 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          placeholder="Observaciones del servicio..."
        />
      </div>

      <OrdenMensajesSection error={error} success={success} />

      <div>
        <button
          type="submit"
          disabled={loading || loadingData}
          className="rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading
            ? esPreOrdenTecnico
              ? "Guardando pre-orden..."
              : "Guardando orden..."
            : esPreOrdenTecnico
              ? "Crear pre-orden"
              : "Guardar orden"}
        </button>
      </div>
    </form>
  );
}