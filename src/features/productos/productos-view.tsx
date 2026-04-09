"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import type { Producto } from "@/types";
import { getProductos, getProductosParaReposicion } from "./actions";
import { ProductoForm } from "./producto-form";
import { ProductoStockForm } from "./producto-stock-form";
import { ProductosTable } from "./productos-table";

type ProductosViewProps = {
  canManageProductos: boolean;
};

function generarMensajeReposicion(
  productos: Array<{
    nombre: string;
    stock: number;
    stock_minimo?: number | null;
  }>
) {
  if (productos.length === 0) {
    return "Hola, por ahora no necesito reposición de stock.";
  }

  let mensaje = "Hola, necesito reposición de los siguientes productos:\n\n";

  for (const producto of productos) {
    const stockActual = Number(producto.stock ?? 0);
    const stockMinimo = Number(producto.stock_minimo ?? 0);
    const cantidadSugerida =
      stockMinimo > stockActual ? stockMinimo - stockActual + stockMinimo : 1;

    mensaje += `• ${producto.nombre} | stock actual: ${stockActual} | pedir: ${cantidadSugerida}\n`;
  }

  mensaje += "\nGracias.";
  return mensaje;
}

export function ProductosView({ canManageProductos }: ProductosViewProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosReposicion, setProductosReposicion] = useState<
    Array<Producto & { stock_minimo?: number | null }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadingReposicion, setLoadingReposicion] = useState(true);
  const [error, setError] = useState("");
  const [errorReposicion, setErrorReposicion] = useState("");

  async function loadProductos() {
    try {
      setError("");
      const data = await getProductos();
      setProductos(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar los productos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function loadReposicion() {
    try {
      setErrorReposicion("");
      const data = await getProductosParaReposicion();
      setProductosReposicion(
        data as Array<Producto & { stock_minimo?: number | null }>
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo cargar la lista de reposición.";
      setErrorReposicion(message);
    } finally {
      setLoadingReposicion(false);
    }
  }

  async function reloadAll() {
    setLoading(true);
    setLoadingReposicion(true);
    await Promise.all([loadProductos(), loadReposicion()]);
  }

  useEffect(() => {
    reloadAll();
  }, []);

  const mensajeReposicion = useMemo(() => {
    return generarMensajeReposicion(productosReposicion);
  }, [productosReposicion]);

  const whatsappUrl = useMemo(() => {
    return `https://wa.me/593XXXXXXXXX?text=${encodeURIComponent(
      mensajeReposicion
    )}`;
  }, [mensajeReposicion]);

  return (
    <div className="grid gap-4">
      {canManageProductos ? (
        <>
          <Card title="Registrar producto al catálogo">
            <ProductoForm onCreated={reloadAll} />
          </Card>

          <Card title="Agregar stock a producto existente">
            <ProductoStockForm
              productos={productos}
              onCreated={reloadAll}
            />
          </Card>
        </>
      ) : null}

      <Card title="Lista de reposición para proveedor">
        {loadingReposicion ? (
          <p className="text-gray-600">Cargando reposición...</p>
        ) : errorReposicion ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorReposicion}
          </div>
        ) : productosReposicion.length === 0 ? (
          <p className="text-gray-600">
            No hay productos por reponer en este momento.
          </p>
        ) : (
          <div className="grid gap-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">
                Productos sugeridos para reposición
              </p>

              <div className="mt-3 grid gap-2">
                {productosReposicion.map((producto) => (
                  <div
                    key={producto.id}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  >
                    <span className="font-medium">{producto.nombre}</span>
                    <span className="text-gray-500">
                      {" "}
                      · stock actual: {producto.stock}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-green-300 bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:brightness-95"
              >
                Enviar por WhatsApp
              </a>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-700">
                Mensaje generado
              </p>
              <pre className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
                {mensajeReposicion}
              </pre>
            </div>
          </div>
        )}
      </Card>

      <Card title="Inventario y rentabilidad de productos">
        {loading ? (
          <p className="text-gray-600">Cargando productos...</p>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <ProductosTable
            productos={productos}
            canManageProductos={canManageProductos}
          />
        )}
      </Card>
    </div>
  );
}