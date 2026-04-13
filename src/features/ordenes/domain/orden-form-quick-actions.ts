import type { OrdenFormData, Producto, Servicio } from "@/types";
import {
  buildServicioItem,
  hasProductoEnItems,
  hasServicioEnItems,
  isEmptyInitialItem,
} from "@/features/ordenes/domain/orden-form-items";

type ItemSearchState = {
  servicio: string;
  producto: string;
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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function buildQuickServicioInsert(params: {
  items: OrdenFormData["items"];
  servicio: Servicio;
}) {
  const { items, servicio } = params;

  const newItem = buildServicioItem(servicio);
  const newSearch = {
    servicio: servicio.nombre,
    producto: "",
  };

  const hasOnlyEmptyInitialItem =
    items.length === 1 && isEmptyInitialItem(items[0]);

  return {
    nextItems: hasOnlyEmptyInitialItem ? [newItem] : [...items, newItem],
    nextSearchesMode: hasOnlyEmptyInitialItem ? "replace" : "append" as const,
    newSearches: [newSearch],
    successMessage: `Servicio "${servicio.nombre}" agregado.`,
  };
}

export function buildQuickProductoInsert(params: {
  items: OrdenFormData["items"];
  producto: Producto;
}) {
  const { items, producto } = params;

  const newItem: OrdenFormData["items"][number] = {
    tipo_item: "producto",
    servicio_id: "",
    producto_id: producto.id,
    nombre_item: producto.nombre,
    cantidad: "1",
    precio_unitario: String(producto.precio_venta ?? 0),
    total: String(Number(producto.precio_venta ?? 0)),
  };

  const newSearch = {
    servicio: "",
    producto: producto.nombre,
  };

  const hasOnlyEmptyInitialItem =
    items.length === 1 && isEmptyInitialItem(items[0]);

  return {
    nextItems: hasOnlyEmptyInitialItem ? [newItem] : [...items, newItem],
    nextSearchesMode: hasOnlyEmptyInitialItem ? "replace" : "append" as const,
    newSearches: [newSearch],
  };
}

export function buildProductoRecordadoInsert(params: {
  items: OrdenFormData["items"];
  productos: Producto[];
  productoId: string;
}) {
  const { items, productos, productoId } = params;

  const producto = productos.find((item) => item.id === productoId);

  if (!producto) {
    return {
      ok: false as const,
      errorMessage: "El producto recordado no está disponible en el catálogo actual.",
    };
  }

  const yaExiste = items.some(
    (item) => item.tipo_item === "producto" && item.producto_id === producto.id
  );

  if (yaExiste) {
    return {
      ok: false as const,
      successMessage: `"${producto.nombre}" ya está agregado en la orden.`,
    };
  }

  const insert = buildQuickProductoInsert({
    items,
    producto,
  });

  return {
    ok: true as const,
    ...insert,
    successMessage: `Producto recordado "${producto.nombre}" agregado.`,
  };
}

export function buildCambioAceiteCompletoInsert(params: {
  items: OrdenFormData["items"];
  servicios: Servicio[];
  productos: Producto[];
  productosRecordadosVehiculo: ProductosRecordadosVehiculoState;
}) {
  const { items, servicios, productos, productosRecordadosVehiculo } = params;

  const servicioCambioAceite = servicios.find((servicio) => {
    const texto = normalizeText(
      `${servicio.nombre} ${servicio.descripcion ?? ""} ${servicio.categoria ?? ""}`
    );

    return texto.includes("cambio de aceite");
  });

  if (!servicioCambioAceite) {
    return {
      ok: false as const,
      errorMessage: "No se encontró el servicio de cambio de aceite.",
    };
  }

  const itemsNuevos: OrdenFormData["items"] = [];
  const busquedasNuevas: ItemSearchState[] = [];

  const yaExisteServicio = hasServicioEnItems(items, servicioCambioAceite.id);

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

    if (aceite && !hasProductoEnItems(items, aceite.id)) {
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
        !hasProductoEnItems(items, filtro.id)
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
    return {
      ok: false as const,
      successMessage:
        "El cambio de aceite, aceite y filtro ya están agregados en la orden.",
    };
  }

  const hasOnlyEmptyInitialItem =
    items.length === 1 && isEmptyInitialItem(items[0]);

  const nextItems = hasOnlyEmptyInitialItem ? itemsNuevos : [...items, ...itemsNuevos];

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

  let successMessage = "No había productos nuevos para agregar.";

  if (agregoServicio && agregoAceite && agregoFiltro) {
    successMessage =
      "Cambio de aceite cargado con servicio, aceite y filtro del historial.";
  } else if (agregoServicio && agregoAceite) {
    successMessage =
      "Cambio de aceite cargado con servicio y último aceite del historial.";
  } else if (agregoServicio) {
    successMessage =
      "Servicio de cambio de aceite agregado. Completa el aceite y filtro si hace falta.";
  } else if (agregoAceite || agregoFiltro) {
    successMessage = "Se agregaron productos faltantes del último cambio de aceite.";
  }

  return {
    ok: true as const,
    nextItems,
    nextSearchesMode: hasOnlyEmptyInitialItem ? "replace" : "append" as const,
    newSearches: busquedasNuevas,
    successMessage,
  };
}