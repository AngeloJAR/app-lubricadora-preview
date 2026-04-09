"use client";

import { OrdenStoragePdfButton } from "./orden-storage-pdf-button";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getClientesForOrden,
  getOrdenEditable,
  getProductosActivos,
  getServiciosActivos,
  getTecnicosActivos,
  getVehiculosByCliente,
  updateOrden,
} from "./actions";
import type {
  Cliente,
  OrdenEditable,
  OrdenFormData,
  Producto,
  Servicio,
  Vehiculo,
} from "@/types";

type OrdenEditFormProps = {
  ordenId: string;
};

type TecnicoOption = {
  id: string;
  nombre: string;
};

type ProductoCantidadOriginalMap = Record<string, number>;

const emptyItem = {
  tipo_item: "servicio" as const,
  servicio_id: "",
  producto_id: "",
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

function mapOrdenEditableToForm(data: OrdenEditable): OrdenFormData {
  return {
    cliente_id: data.cliente_id,
    vehiculo_id: data.vehiculo_id,
    tecnico_id: data.tecnico_id ?? "",
    tecnicos_ids: data.tecnico_id ? [data.tecnico_id] : [],
    kilometraje: data.kilometraje?.toString() ?? "",
    descuento: data.descuento?.toString() ?? "0",
    descuento_puntos: "0",
    puntos_canjear: "0",
    notas: data.notas ?? "",
    proximo_mantenimiento_fecha: data.proximo_mantenimiento_fecha ?? "",
    proximo_mantenimiento_km: data.proximo_mantenimiento_km?.toString() ?? "",
    items:
      data.items.length > 0
        ? data.items.map((item) => ({
          tipo_item: item.tipo_item,
          servicio_id: item.servicio_id ?? "",
          producto_id: item.producto_id ?? "",
          nombre_item: item.nombre_item,
          cantidad: String(item.cantidad),
          precio_unitario: String(item.precio_unitario),
          total: String(item.total),
        }))
        : [{ ...emptyItem }],
  };
}

function getCantidadesOriginalesProductos(data: OrdenEditable): ProductoCantidadOriginalMap {
  return data.items.reduce<ProductoCantidadOriginalMap>((acc, item) => {
    if (item.tipo_item !== "producto" || !item.producto_id) return acc;

    acc[item.producto_id] = (acc[item.producto_id] ?? 0) + Number(item.cantidad || 0);
    return acc;
  }, {});
}

export function OrdenEditForm({ ordenId }: OrdenEditFormProps) {
  const router = useRouter();

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
  const [esPreOrdenOriginal, setEsPreOrdenOriginal] = useState(false);

  const [cantidadesOriginalesProductos, setCantidadesOriginalesProductos] =
    useState<ProductoCantidadOriginalMap>({});

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true);
        setError("");

        const [
          clientesData,
          serviciosData,
          productosData,
          tecnicosData,
          ordenData,
        ] = await Promise.all([
          getClientesForOrden(),
          getServiciosActivos(),
          getProductosActivos(),
          getTecnicosActivos(),
          getOrdenEditable(ordenId),
        ]);

        setClientes(clientesData);
        setServicios(serviciosData);
        setProductos(productosData);
        setTecnicos(
          (tecnicosData ?? []).map((tecnico) => ({
            id: tecnico.id,
            nombre: tecnico.nombre?.trim() || "Técnico sin nombre",
          }))
        );

        const mappedForm = mapOrdenEditableToForm(ordenData);
        setForm(mappedForm);
        setCantidadesOriginalesProductos(getCantidadesOriginalesProductos(ordenData));

        const vehiculosData = await getVehiculosByCliente(ordenData.cliente_id);
        setVehiculos(vehiculosData);

        const preOrdenDetectada =
          String(ordenData.tecnico_id ?? "").trim() === "";

        setEsPreOrdenOriginal(preOrdenDetectada);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudieron cargar los datos";
        setError(message);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [ordenId]);

  useEffect(() => {
    async function loadVehiculos() {
      if (!form.cliente_id) {
        setVehiculos([]);
        return;
      }

      try {
        const data = await getVehiculosByCliente(form.cliente_id);
        setVehiculos(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los vehículos";
        setError(message);
      }
    }

    if (!loadingData) {
      loadVehiculos();
    }
  }, [form.cliente_id, loadingData]);

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

      const tecnicosIds = actuales.filter((id) => id !== tecnicoId);
      const tecnicoPrincipal =
        prev.tecnico_id === tecnicoId ? "" : prev.tecnico_id;

      return {
        ...prev,
        tecnico_id: tecnicoPrincipal,
        tecnicos_ids: tecnicosIds,
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
            const stockActual = Number(producto.stock || 0);
            const cantidadOriginalEnOrden =
              Number(cantidadesOriginalesProductos[current.producto_id] || 0);

            const stockDisponibleParaEditar = stockActual + cantidadOriginalEnOrden;

            if (cantidad > stockDisponibleParaEditar) {
              current.cantidad = String(stockDisponibleParaEditar);
            }
          }
        }

        current.total = String(
          Number(current.cantidad || "0") *
          Number(current.precio_unitario || "0")
        );
      }
      nextItems[index] = current;

      return {
        ...prev,
        items: nextItems,
      };
    });
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }],
    }));
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  const subtotal = useMemo(() => {
    return form.items.reduce((acc, item) => acc + Number(item.total || 0), 0);
  }, [form.items]);

  const total = useMemo(() => {
    return subtotal - Number(form.descuento || 0);
  }, [subtotal, form.descuento]);

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
      if (item.tipo_item !== "producto" || !item.producto_id) return false;

      const producto = productos.find((p) => p.id === item.producto_id);
      if (!producto) return false;

      const stockActual = Number(producto.stock || 0);
      const cantidadOriginalEnOrden = Number(
        cantidadesOriginalesProductos[item.producto_id] || 0
      );
      const stockDisponibleParaEditar = stockActual + cantidadOriginalEnOrden;

      return Number(item.cantidad || 0) > stockDisponibleParaEditar;
    });

    if (productoSinStock) {
      const producto = productos.find((p) => p.id === productoSinStock.producto_id);

      setError(
        `Stock insuficiente para ${producto?.nombre ?? productoSinStock.nombre_item
        }. Stock actual: ${producto?.stock ?? 0}.`
      );
      return;
    }

    if (!form.tecnico_id) {
      setError("Debes seleccionar un técnico principal.");
      return;
    }

    if (!(form.tecnicos_ids ?? []).length) {
      setError("Debes seleccionar al menos un técnico asignado.");
      return;
    }

    const tecnicosIdsFinal = Array.from(
      new Set([...(form.tecnicos_ids ?? []), form.tecnico_id].filter(Boolean))
    );

    const formToSubmit: OrdenFormData = {
      ...form,
      tecnicos_ids: tecnicosIdsFinal,
    };

    try {
      setLoading(true);
      await updateOrden(ordenId, formToSubmit);

      setSuccess(
        esPreOrdenOriginal
          ? "Pre-orden revisada y asignada correctamente."
          : "Orden actualizada correctamente."
      );

      setTimeout(() => {
        router.push(`/ordenes/${ordenId}`);
        router.refresh();
      }, 700);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo actualizar la orden";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {esPreOrdenOriginal ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">
            Estás revisando una pre-orden.
          </p>
          <p className="mt-1 text-sm text-blue-800">
            Aquí debes asignar técnico principal y técnicos participantes para dejarla lista.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Cliente</label>
          <select
            value={form.cliente_id}
            onChange={(e) => {
              updateField("cliente_id", e.target.value);
              updateField("vehiculo_id", "");
            }}
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
            onChange={(e) => updateField("vehiculo_id", e.target.value)}
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
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Técnico principal</label>
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
            <option value="">Selecciona un técnico principal</option>
            {tecnicos.map((tecnico) => (
              <option key={tecnico.id} value={tecnico.id}>
                {tecnico.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-gray-200 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold">Técnicos asignados</h3>
            <p className="text-xs text-gray-500">
              Selecciona todos los técnicos que van a participar en la orden.
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
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Kilometraje</label>
          <input
            type="number"
            value={form.kilometraje}
            onChange={(e) => updateField("kilometraje", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Próxima fecha</label>
          <input
            type="date"
            value={form.proximo_mantenimiento_fecha}
            onChange={(e) =>
              updateField("proximo_mantenimiento_fecha", e.target.value)
            }
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Próximo km</label>
          <input
            type="number"
            value={form.proximo_mantenimiento_km}
            onChange={(e) =>
              updateField("proximo_mantenimiento_km", e.target.value)
            }
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          />
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Items de la orden</h3>
          <button
            type="button"
            onClick={addItem}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          >
            Agregar item
          </button>
        </div>

        {form.items.map((item, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-2xl border border-gray-200 p-4"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Tipo</label>
                <select
                  value={item.tipo_item}
                  onChange={(e) => updateItem(index, "tipo_item", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                >
                  <option value="servicio">Servicio</option>
                  <option value="producto">Producto</option>
                </select>
              </div>

              {item.tipo_item === "servicio" ? (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Servicio</label>
                  <select
                    value={item.servicio_id}
                    onChange={(e) =>
                      updateItem(index, "servicio_id", e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                  >
                    <option value="">Selecciona un servicio</option>
                    {servicios.map((servicio) => (
                      <option key={servicio.id} value={servicio.id}>
                        {servicio.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Producto</label>
                  <select
                    value={item.producto_id}
                    onChange={(e) =>
                      updateItem(index, "producto_id", e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                  >
                    <option value="">Selecciona un producto</option>
                    {productos.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre} · Stock: {producto.stock}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nombre del item
                </label>
                <input
                  value={item.nombre_item}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                  placeholder="Se completa automáticamente"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Cantidad</label>
                <input
                  type="number"
                  value={item.cantidad}
                  onChange={(e) => updateItem(index, "cantidad", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Precio unitario
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={item.precio_unitario}
                  onChange={(e) =>
                    updateItem(index, "precio_unitario", e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Total</label>
                <input
                  value={item.total}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={form.items.length === 1}
                  className="w-full rounded-xl border border-red-300 px-3 py-2 text-sm text-red-600 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Descuento</label>
          <input
            type="number"
            step="0.01"
            value={form.descuento}
            onChange={(e) => updateField("descuento", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          />
        </div>

        <div className="rounded-2xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Subtotal</p>
          <p className="text-xl font-bold">${subtotal.toFixed(2)}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-xl font-bold">${total.toFixed(2)}</p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notas</label>
        <textarea
          value={form.notas}
          onChange={(e) => updateField("notas", e.target.value)}
          className="min-h-24 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
          placeholder="Observaciones de recepción..."
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading || loadingData}
          className="rounded-xl border border-yellow-300 bg-yellow-500 px-4 py-2 text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading
            ? "Guardando..."
            : esPreOrdenOriginal
              ? "Guardar y asignar"
              : "Guardar cambios"}
        </button>

        <OrdenStoragePdfButton ordenId={ordenId} />
      </div>
    </form>
  );
}