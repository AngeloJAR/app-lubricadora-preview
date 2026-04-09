"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createCombo,
  getProductosActivosForCombo,
  getServiciosActivosForCombo,
  updateCombo,
} from "./actions";

import type {
  ComboDetalle,
  ComboFormData,
  Producto,
  Servicio,
} from "@/types";

const emptyItem = {
  tipo_item: "servicio" as const,
  servicio_id: "",
  producto_id: "",
  nombre_item: "",
  cantidad: "1",
  precio_unitario: "0",
};

const initialState: ComboFormData = {
  nombre: "",
  descripcion: "",
  categoria: "",
  precio_combo: "0",
  activo: true,
  items: [{ ...emptyItem }],
};

function mapComboDetalleToFormData(combo: ComboDetalle): ComboFormData {
  return {
    nombre: combo.nombre ?? "",
    descripcion: combo.descripcion ?? "",
    categoria: combo.categoria ?? "",
    precio_combo: String(combo.precio_combo ?? 0),
    activo: combo.activo ?? true,
    items: combo.items.length
      ? combo.items.map((item) => ({
          tipo_item: item.tipo_item,
          servicio_id: item.servicio_id ?? "",
          producto_id: item.producto_id ?? "",
          nombre_item: item.nombre_item ?? "",
          cantidad: String(item.cantidad ?? 1),
          precio_unitario: String(item.precio_unitario ?? 0),
        }))
      : [{ ...emptyItem }],
  };
}

type ComboFormProps = {
  initialData?: ComboDetalle | null;
  onSaved?: () => Promise<void> | void;
  submitLabel?: string;
};

const inputClassName =
  "w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100";

const readOnlyClassName =
  "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none";

export function ComboForm({
  initialData = null,
  onSaved,
  submitLabel,
}: ComboFormProps) {
  const [form, setForm] = useState<ComboFormData>(
    initialData ? mapComboDetalleToFormData(initialData) : initialState
  );
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (initialData) {
      setForm(mapComboDetalleToFormData(initialData));
    } else {
      setForm(initialState);
    }
  }, [initialData]);

  useEffect(() => {
    async function loadData() {
      try {
        const [serviciosData, productosData] = await Promise.all([
          getServiciosActivosForCombo(),
          getProductosActivosForCombo(),
        ]);

        setServicios(serviciosData);
        setProductos(productosData);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudieron cargar los datos";
        setError(message);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, []);

  function updateField<K extends keyof ComboFormData>(
    key: K,
    value: ComboFormData[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
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
      }

      if (field === "servicio_id" && current.tipo_item === "servicio") {
        const servicio = servicios.find((item) => item.id === value);

        if (servicio) {
          current.nombre_item = servicio.nombre;
          current.precio_unitario = String(servicio.precio_base);
        }
      }

      if (field === "producto_id" && current.tipo_item === "producto") {
        const producto = productos.find((item) => item.id === value);

        if (producto) {
          current.nombre_item = producto.nombre;
          current.precio_unitario = String(producto.precio_venta);
        }
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

  const totalReferencial = useMemo(() => {
    return form.items.reduce((acc, item) => {
      const cantidad = Number(item.cantidad || 0);
      const precio = Number(item.precio_unitario || 0);
      return acc + cantidad * precio;
    }, 0);
  }, [form.items]);

  const precioFinalCombo = useMemo(() => {
    return Number(form.precio_combo || 0);
  }, [form.precio_combo]);

  const ahorroCliente = useMemo(() => {
    return Math.max(0, totalReferencial - precioFinalCombo);
  }, [precioFinalCombo, totalReferencial]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.nombre.trim()) {
      setError("Debes ingresar el nombre del combo.");
      return;
    }

    if (!form.categoria.trim()) {
      setError("Debes ingresar la categoría del combo.");
      return;
    }

    if (!form.items.length) {
      setError("Debes agregar al menos un item al combo.");
      return;
    }

    const invalidItem = form.items.some(
      (item) =>
        !item.tipo_item ||
        !item.nombre_item.trim() ||
        !item.cantidad.trim() ||
        Number(item.cantidad) <= 0 ||
        !item.precio_unitario.trim() ||
        Number(item.precio_unitario) < 0 ||
        (item.tipo_item === "servicio" && !item.servicio_id) ||
        (item.tipo_item === "producto" && !item.producto_id)
    );

    if (invalidItem) {
      setError("Revisa los items agregados al combo.");
      return;
    }

    try {
      setLoading(true);

      if (initialData?.id) {
        await updateCombo(initialData.id, form);
        setSuccess("Combo actualizado correctamente.");
      } else {
        await createCombo(form);
        setSuccess("Combo creado correctamente.");
        setForm(initialState);
      }

      if (onSaved) {
        await onSaved();
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : initialData?.id
          ? "No se pudo actualizar el combo"
          : "No se pudo crear el combo";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <section className="grid gap-5 rounded-3xl border border-gray-200 bg-gray-50/70 p-5 md:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Datos generales
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900">
            Información del combo
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Define el nombre, categoría, descripción y precio final.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Nombre
            </label>
            <input
              value={form.nombre}
              onChange={(e) => updateField("nombre", e.target.value)}
              className={inputClassName}
              placeholder="Cambio de aceite básico"
              disabled={loading || loadingData}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Categoría
            </label>
            <input
              value={form.categoria}
              onChange={(e) => updateField("categoria", e.target.value)}
              className={inputClassName}
              placeholder="Aceites / Lavado / Promoción"
              disabled={loading || loadingData}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Descripción
          </label>
          <textarea
            value={form.descripcion}
            onChange={(e) => updateField("descripcion", e.target.value)}
            className={`${inputClassName} min-h-30 resize-none`}
            placeholder="Incluye filtro de aceite, mano de obra y lavada express"
            disabled={loading || loadingData}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Precio combo
            </label>
            <input
              type="number"
              step="0.01"
              value={form.precio_combo}
              onChange={(e) => updateField("precio_combo", e.target.value)}
              className={inputClassName}
              disabled={loading || loadingData}
            />
          </div>

          <label className="flex min-h-13 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 self-end">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => updateField("activo", e.target.checked)}
              disabled={loading || loadingData}
            />
            <span className="text-sm font-medium text-gray-700">
              Combo activo
            </span>
          </label>
        </div>
      </section>

      <section className="grid gap-5 rounded-3xl border border-gray-200 bg-white p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Composición del combo
            </p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">
              Items del combo
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Agrega servicios y productos que formarán parte del combo.
            </p>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            disabled={loading || loadingData}
          >
            Agregar item
          </button>
        </div>

        <div className="grid gap-4">
          {form.items.map((item, index) => {
            const totalItem =
              Number(item.cantidad || 0) * Number(item.precio_unitario || 0);

            return (
              <article
                key={index}
                className="grid gap-5 rounded-3xl border border-gray-200 bg-gray-50/60 p-4 md:p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold text-gray-900">
                        Item {index + 1}
                      </h4>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          item.tipo_item === "servicio"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.tipo_item === "servicio"
                          ? "Servicio"
                          : "Producto"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Selecciona el tipo y completa los datos del item.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={form.items.length === 1 || loading || loadingData}
                    className="rounded-2xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>

                <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)]">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Tipo
                    </label>
                    <select
                      value={item.tipo_item}
                      onChange={(e) =>
                        updateItem(index, "tipo_item", e.target.value)
                      }
                      className={inputClassName}
                      disabled={loading || loadingData}
                    >
                      <option value="servicio">Servicio</option>
                      <option value="producto">Producto</option>
                    </select>
                  </div>

                  {item.tipo_item === "servicio" ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Servicio
                      </label>
                      <select
                        value={item.servicio_id}
                        onChange={(e) =>
                          updateItem(index, "servicio_id", e.target.value)
                        }
                        className={inputClassName}
                        disabled={loading || loadingData}
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
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Producto
                      </label>
                      <select
                        value={item.producto_id}
                        onChange={(e) =>
                          updateItem(index, "producto_id", e.target.value)
                        }
                        className={inputClassName}
                        disabled={loading || loadingData}
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

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_140px_180px]">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Nombre del item
                    </label>
                    <input
                      value={item.nombre_item}
                      readOnly
                      className={readOnlyClassName}
                      placeholder="Se completa automáticamente"
                      disabled={loading || loadingData}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.cantidad}
                      onChange={(e) =>
                        updateItem(index, "cantidad", e.target.value)
                      }
                      className={inputClassName}
                      disabled={loading || loadingData}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Precio unitario
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.precio_unitario}
                      onChange={(e) =>
                        updateItem(index, "precio_unitario", e.target.value)
                      }
                      className={inputClassName}
                      disabled={loading || loadingData}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Total item
                    </p>
                    <p className="mt-1 text-xl font-semibold text-gray-900">
                      ${totalItem.toFixed(2)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Selección actual
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {item.nombre_item || "Aún no has seleccionado un item"}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm text-gray-500">Suma referencial de items</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            ${totalReferencial.toFixed(2)}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm text-gray-500">Precio final del combo</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            ${precioFinalCombo.toFixed(2)}
          </p>
        </div>

        <div className="rounded-3xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-700">Ahorro del cliente</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            ${ahorroCliente.toFixed(2)}
          </p>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || loadingData}
          className="rounded-2xl bg-yellow-500 border border-yellow-300 text-white px-5 py-3 text-sm font-medium transition hover:opacity-90 disabled:opacity-60"
        >
          {loading
            ? initialData?.id
              ? "Guardando cambios..."
              : "Guardando combo..."
            : submitLabel ||
              (initialData?.id ? "Guardar cambios" : "Guardar combo")}
        </button>
      </div>
    </form>
  );
}