"use client";


import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OrdenStoragePdfButton } from "./components/actions";

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

import {
  emptyItem,
  getCantidadesOriginalesProductos,
  getSubtotal,
  getTecnicosIdsFinal,
  getTotal,
  initialState,
  mapOrdenEditableToForm,
  type ProductoCantidadOriginalMap,
} from "./domain/orden-edit-form-helpers";

import { buildUpdatedOrdenItems } from "./domain/orden-edit-item-updater";
import type { TecnicoOption } from "./domain/orden-edit-types";
import {
  validateOrdenEditBase,
  validateOrdenEditStock,
} from "./domain/orden-edit-form-validations";


import {
  OrdenEditClienteVehiculoSection,
  OrdenEditItemsSection,
  OrdenEditMantenimientoSection,
  OrdenEditTecnicosSection,
  OrdenEditTotalesSection,
} from "./components/edit";
type OrdenEditFormProps = {
  ordenId: string;
};


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
    setForm((prev) => ({
      ...prev,
      items: buildUpdatedOrdenItems({
        items: prev.items,
        index,
        field,
        value,
        servicios,
        productos,
        cantidadesOriginalesProductos,
      }),
    }));
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
  const subtotal = useMemo(() => getSubtotal(form.items), [form.items]);

  const total = useMemo(
    () => getTotal(subtotal, form.descuento),
    [subtotal, form.descuento]
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const baseValidation = validateOrdenEditBase(form);

    if (!baseValidation.ok) {
      setError(baseValidation.message);
      return;
    }

    const stockValidation = validateOrdenEditStock(
      form,
      productos,
      cantidadesOriginalesProductos
    );

    if (!stockValidation.ok) {
      setError(stockValidation.message);
      return;
    }

    const tecnicosIdsFinal = getTecnicosIdsFinal(
      form.tecnicos_ids ?? [],
      form.tecnico_id
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

      <OrdenEditClienteVehiculoSection
        clienteId={form.cliente_id}
        vehiculoId={form.vehiculo_id}
        clientes={clientes}
        vehiculos={vehiculos}
        loadingData={loadingData}
        onClienteChange={(clienteId) => {
          updateField("cliente_id", clienteId);
          updateField("vehiculo_id", "");
        }}
        onVehiculoChange={(vehiculoId) => updateField("vehiculo_id", vehiculoId)}
      />

      <OrdenEditTecnicosSection
        tecnicoId={form.tecnico_id}
        tecnicosIds={form.tecnicos_ids ?? []}
        tecnicos={tecnicos}
        loadingData={loadingData}
        onTecnicoPrincipalChange={(tecnicoId) => {
          setForm((prev) => ({
            ...prev,
            tecnico_id: tecnicoId,
            tecnicos_ids: tecnicoId
              ? Array.from(new Set([...(prev.tecnicos_ids ?? []), tecnicoId]))
              : prev.tecnicos_ids ?? [],
          }));
        }}
        onToggleTecnico={toggleTecnico}
      />

      <OrdenEditMantenimientoSection
        kilometraje={form.kilometraje}
        proximoMantenimientoFecha={form.proximo_mantenimiento_fecha}
        proximoMantenimientoKm={form.proximo_mantenimiento_km}
        onKilometrajeChange={(value) => updateField("kilometraje", value)}
        onProximoMantenimientoFechaChange={(value) =>
          updateField("proximo_mantenimiento_fecha", value)
        }
        onProximoMantenimientoKmChange={(value) =>
          updateField("proximo_mantenimiento_km", value)
        }
      />

      <OrdenEditItemsSection
        items={form.items}
        servicios={servicios}
        productos={productos}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        onUpdateItem={updateItem}
      />

      <OrdenEditTotalesSection
        descuento={form.descuento}
        subtotal={subtotal}
        total={total}
        onDescuentoChange={(value) => updateField("descuento", value)}
      />

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