"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { crearCotizacion } from "./actions";

type ClienteOption = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  whatsapp: string | null;
};

type VehiculoOption = {
  id: string;
  cliente_id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number | null;
};

type ServicioOption = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_base: number;
  activo: boolean;
};

type ProductoOption = {
  id: string;
  nombre: string;
  categoria: string | null;
  marca: string | null;
  precio_venta: number;
  activo: boolean;
  notas: string | null;
  stock: number;
};

type ItemForm = {
  tipo_item: "servicio" | "producto";
  referencia_id: string;
  nombre_item: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
};

type CotizacionFormProps = {
  clientes: ClienteOption[];
  vehiculos: VehiculoOption[];
  servicios: ServicioOption[];
  productos: ProductoOption[];
};

function crearItemVacio(): ItemForm {
  return {
    tipo_item: "servicio",
    referencia_id: "",
    nombre_item: "",
    descripcion: "",
    cantidad: 1,
    precio_unitario: 0,
  };
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

function getProductoById(productos: ProductoOption[], id: string) {
  return productos.find((producto) => producto.id === id) ?? null;
}

function getStockDisponibleParaItem(
  item: ItemForm,
  productos: ProductoOption[]
) {
  if (item.tipo_item !== "producto" || !item.referencia_id) return null;

  const producto = getProductoById(productos, item.referencia_id);
  if (!producto) return null;

  return Number(producto.stock ?? 0);
}

export function CotizacionForm({
  clientes,
  vehiculos,
  servicios = [],
  productos = [],
}: CotizacionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [clienteId, setClienteId] = useState("");
  const [vehiculoId, setVehiculoId] = useState("");
  const [notas, setNotas] = useState("");
  const [validezHasta, setValidezHasta] = useState("");
  const [descuento, setDescuento] = useState("0");
  const [items, setItems] = useState<ItemForm[]>([crearItemVacio()]);
  const [error, setError] = useState("");

  const vehiculosFiltrados = useMemo(() => {
    if (!clienteId) return [];
    return vehiculos.filter((vehiculo) => vehiculo.cliente_id === clienteId);
  }, [vehiculos, clienteId]);

  const clienteSeleccionado = useMemo(() => {
    return clientes.find((cliente) => cliente.id === clienteId) ?? null;
  }, [clientes, clienteId]);

  const vehiculoSeleccionado = useMemo(() => {
    return vehiculos.find((vehiculo) => vehiculo.id === vehiculoId) ?? null;
  }, [vehiculos, vehiculoId]);

  const subtotal = items.reduce(
    (acc, item) =>
      acc + Number(item.cantidad || 0) * Number(item.precio_unitario || 0),
    0
  );

  const total = subtotal - Number(descuento || 0);

  function handleItemChange<K extends keyof ItemForm>(
    index: number,
    field: K,
    value: ItemForm[K]
  ) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function handleReferenciaChange(index: number, referenciaId: string) {
    const itemActual = items[index];

    if (!itemActual) return;

    if (!referenciaId) {
      setItems((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
              ...item,
              referencia_id: "",
              nombre_item: "",
              descripcion: "",
              precio_unitario: 0,
            }
            : item
        )
      );
      return;
    }

    if (itemActual.tipo_item === "servicio") {
      const servicio = servicios.find((s) => s.id === referenciaId);
      if (!servicio) return;

      setItems((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
              ...item,
              referencia_id: servicio.id,
              nombre_item: servicio.nombre,
              descripcion: servicio.descripcion ?? "",
              precio_unitario: Number(servicio.precio_base ?? 0),
            }
            : item
        )
      );
      return;
    }

    const producto = productos.find((p) => p.id === referenciaId);
    if (!producto) return;

    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
            ...item,
            referencia_id: producto.id,
            nombre_item: producto.nombre,
            descripcion: producto.notas ?? "",
            precio_unitario: Number(producto.precio_venta ?? 0),
          }
          : item
      )
    );
  }

  function agregarItem() {
    setItems((prev) => [...prev, crearItemVacio()]);
  }

  function eliminarItem(index: number) {
    setItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleClienteChange(value: string) {
    setClienteId(value);
    setVehiculoId("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const itemsValidos = items.filter(
      (item) =>
        item.nombre_item.trim() &&
        Number(item.cantidad) > 0 &&
        Number(item.precio_unitario) >= 0
    );

    if (!clienteId) {
      setError("Selecciona un cliente.");
      return;
    }

    if (itemsValidos.length === 0) {
      setError("Agrega al menos un item válido.");
      return;
    }

    const itemsConStockInvalido = itemsValidos.filter((item) => {
      if (item.tipo_item !== "producto") return false;

      const producto = productos.find((p) => p.id === item.referencia_id);
      if (!producto) return false;

      return Number(item.cantidad) > Number(producto.stock ?? 0);
    });

    if (itemsConStockInvalido.length > 0) {
      setError("Uno o más productos superan el stock disponible.");
      return;
    }

    try {
      setIsSubmitting(true);

      const cotizacionId = await crearCotizacion({
        cliente_id: clienteId,
        vehiculo_id: vehiculoId || null,
        notas: notas || undefined,
        validez_hasta: validezHasta || null,
        descuento: Number(descuento || 0),
        items: itemsValidos.map((item) => ({
          tipo_item: item.tipo_item,
          nombre_item: item.nombre_item.trim(),
          descripcion: item.descripcion.trim() || null,
          cantidad: Number(item.cantidad),
          precio_unitario: Number(item.precio_unitario),
        })),
      });

      router.push(`/cotizaciones/${cotizacionId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear la cotización"
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="grid gap-6 xl:col-span-2">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-semibold text-gray-900">
                Datos principales
              </h3>
              <p className="text-sm text-gray-500">
                Selecciona el cliente, el vehículo y configura la vigencia de la
                cotización.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Cliente
                </label>
                <select
                  value={clienteId}
                  onChange={(e) => handleClienteChange(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                >
                  <option value="">Selecciona un cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombres} {cliente.apellidos}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Vehículo
                </label>
                <select
                  value={vehiculoId}
                  onChange={(e) => setVehiculoId(e.target.value)}
                  disabled={!clienteId}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 disabled:bg-gray-100"
                >
                  <option value="">Sin vehículo</option>
                  {vehiculosFiltrados.map((vehiculo) => (
                    <option key={vehiculo.id} value={vehiculo.id}>
                      {vehiculo.placa} - {vehiculo.marca} {vehiculo.modelo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Válida hasta
                </label>
                <input
                  type="date"
                  value={validezHasta}
                  onChange={(e) => setValidezHasta(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Descuento
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={descuento}
                  onChange={(e) => setDescuento(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Cliente seleccionado
                </p>
                <p className="mt-2 text-sm font-medium text-gray-900 break-words">
                  {clienteSeleccionado
                    ? `${clienteSeleccionado.nombres} ${clienteSeleccionado.apellidos}`
                    : "Ninguno"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Vehículo seleccionado
                </p>
                <p className="mt-2 text-sm font-medium text-gray-900 break-words">
                  {vehiculoSeleccionado
                    ? `${vehiculoSeleccionado.placa} · ${vehiculoSeleccionado.marca} ${vehiculoSeleccionado.modelo}`
                    : "Sin vehículo"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Items</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Agrega servicios y productos desde tu catálogo.
                </p>
              </div>

              <button
                type="button"
                onClick={agregarItem}
                className="rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-sm font-medium text-white transition hover:brightness-95"
              >
                Agregar item
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              {items.map((item, index) => {
                const totalItem =
                  Number(item.cantidad || 0) * Number(item.precio_unitario || 0);

                const stockDisponible = getStockDisponibleParaItem(item, productos);
                const stockInsuficiente =
                  item.tipo_item === "producto" &&
                  stockDisponible !== null &&
                  Number(item.cantidad || 0) > stockDisponible;

                return (
                  <article
                    key={index}
                    className="rounded-3xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                            Item {index + 1}
                          </span>

                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${item.tipo_item === "servicio"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-green-200 bg-green-50 text-green-700"
                              }`}
                          >
                            {item.tipo_item === "servicio"
                              ? "Servicio"
                              : "Producto"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => eliminarItem(index)}
                          className="rounded-xl border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                        >
                          Quitar
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                        <div className="grid gap-2 xl:col-span-1">
                          <label className="text-sm font-medium text-gray-700">
                            Tipo
                          </label>
                          <select
                            value={item.tipo_item}
                            onChange={(e) => {
                              const nuevoTipo = e.target
                                .value as "servicio" | "producto";

                              setItems((prev) =>
                                prev.map((currentItem, i) =>
                                  i === index
                                    ? {
                                      ...currentItem,
                                      tipo_item: nuevoTipo,
                                      referencia_id: "",
                                      nombre_item: "",
                                      descripcion: "",
                                      precio_unitario: 0,
                                    }
                                    : currentItem
                                )
                              );
                            }}
                            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                          >
                            <option value="servicio">Servicio</option>
                            <option value="producto">Producto</option>
                          </select>
                        </div>

                        <div className="grid gap-2 xl:col-span-2">
                          <label className="text-sm font-medium text-gray-700">
                            {item.tipo_item === "servicio"
                              ? "Servicio"
                              : "Producto"}
                          </label>

                          <select
                            value={item.referencia_id}
                            onChange={(e) =>
                              handleReferenciaChange(index, e.target.value)
                            }
                            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                          >
                            <option value="">
                              {item.tipo_item === "servicio"
                                ? "Selecciona un servicio"
                                : "Selecciona un producto"}
                            </option>

                            {item.tipo_item === "servicio"
                              ? servicios.map((servicio) => (
                                <option key={servicio.id} value={servicio.id}>
                                  {servicio.nombre} - $
                                  {Number(servicio.precio_base).toFixed(2)}
                                </option>
                              ))
                              : productos.map((producto) => (
                                <option
                                  key={producto.id}
                                  value={producto.id}
                                  disabled={Number(producto.stock ?? 0) <= 0}
                                >
                                  {producto.nombre} - ${Number(producto.precio_venta).toFixed(2)} - Stock:{" "}
                                  {producto.stock}
                                  {Number(producto.stock ?? 0) <= 0 ? " (SIN STOCK)" : ""}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="grid gap-2 xl:col-span-2">
                          <label className="text-sm font-medium text-gray-700">
                            Descripción
                          </label>
                          <input
                            type="text"
                            value={item.descripcion}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "descripcion",
                                e.target.value
                              )
                            }
                            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                            placeholder="Detalles opcionales del item"
                          />
                        </div>

                        <div className="grid gap-2 xl:col-span-1">
                          <label className="text-sm font-medium text-gray-700">
                            Cantidad
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.cantidad}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "cantidad",
                                Number(e.target.value)
                              )
                            }
                            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                          />
                        </div>

                        <div className="grid gap-2 xl:col-span-1">
                          <label className="text-sm font-medium text-gray-700">
                            P. unit.
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.precio_unitario}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "precio_unitario",
                                Number(e.target.value)
                              )
                            }
                            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                          />
                        </div>
                      </div>

                      <div className="grid gap-3">
                        {item.tipo_item === "producto" && stockDisponible !== null ? (
                          <div
                            className={`rounded-2xl border px-4 py-3 text-sm ${stockInsuficiente
                                ? "border-red-200 bg-red-50 text-red-700"
                                : stockDisponible <= 3
                                  ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                                  : "border-green-200 bg-green-50 text-green-700"
                              }`}
                          >
                            {stockInsuficiente
                              ? `Stock insuficiente. Disponible: ${stockDisponible}`
                              : `Stock disponible: ${stockDisponible}`}
                          </div>
                        ) : null}

                        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                          <p className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Total del item</span>
                            <span className="font-semibold text-gray-900">
                              {formatMoney(totalItem)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900">Notas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Agrega observaciones, condiciones o detalles para el cliente.
            </p>

            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={7}
              className="mt-5 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
              placeholder="Observaciones, condiciones, detalles de la cotización..."
            />
          </section>
        </div>

        <div className="grid gap-6">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900">Resumen</h3>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <p className="flex items-center justify-between text-sm text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatMoney(subtotal)}</span>
                </p>

                <p className="mt-2 flex items-center justify-between text-sm text-gray-700">
                  <span>Descuento</span>
                  <span className="font-medium">
                    {formatMoney(Number(descuento || 0))}
                  </span>
                </p>

                <div className="mt-3 border-t border-gray-200 pt-3">
                  <p className="flex items-center justify-between text-base font-bold text-gray-900">
                    <span>Total</span>
                    <span>{formatMoney(total)}</span>
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Cliente
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900 break-words">
                    {clienteSeleccionado
                      ? `${clienteSeleccionado.nombres} ${clienteSeleccionado.apellidos}`
                      : "No seleccionado"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Items válidos
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {
                      items.filter(
                        (item) =>
                          item.nombre_item.trim() &&
                          Number(item.cantidad) > 0 &&
                          Number(item.precio_unitario) >= 0
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 w-full rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-3 text-sm font-medium text-white transition hover:brightness-95 disabled:opacity-60"
            >
              {isSubmitting ? "Guardando..." : "Crear cotización"}
            </button>
          </section>
        </div>
      </div>
    </form>
  );
}