"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardEdit,
  FileText,
  Save,
} from "lucide-react";
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
        setCantidadesOriginalesProductos(
          getCantidadesOriginalesProductos(ordenData)
        );

        const vehiculosData = await getVehiculosByCliente(ordenData.cliente_id);
        setVehiculos(vehiculosData);

        setEsPreOrdenOriginal(
          String(ordenData.numero ?? "").toUpperCase().startsWith("PRE-")
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudieron cargar los datos"
        );
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
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los vehículos"
        );
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
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar la orden"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-yellow-50 p-3 text-yellow-600">
            <ClipboardEdit className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Editar orden
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Revisa cliente, vehículo, técnicos, items y totales antes de guardar.
            </p>
          </div>
        </div>
      </div>

      {esPreOrdenOriginal ? (
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-sm font-bold text-blue-900">
            Estás revisando una pre-orden.
          </p>
          <p className="mt-1 text-sm text-blue-800">
            Asigna técnico principal y técnicos participantes para dejarla lista.
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

      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <label className="text-sm font-bold text-gray-700">Notas</label>
        </div>

        <textarea
          value={form.notas}
          onChange={(e) => updateField("notas", e.target.value)}
          className="min-h-28 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400 focus:bg-white"
          placeholder="Observaciones de recepción..."
        />
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5" />
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5" />
          {success}
        </div>
      ) : null}

      <div className="sticky bottom-4 z-20 rounded-3xl border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">
              {esPreOrdenOriginal ? "Guardar revisión" : "Guardar cambios"}
            </p>
            <p className="text-xs text-gray-500">
              Se actualizarán los datos, items, técnicos y totales de la orden.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={loading || loadingData}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300 bg-yellow-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {loading
                ? "Guardando..."
                : esPreOrdenOriginal
                  ? "Guardar y asignar"
                  : "Guardar cambios"}
            </button>

            <OrdenStoragePdfButton ordenId={ordenId} />
          </div>
        </div>
      </div>
    </form>
  );
}