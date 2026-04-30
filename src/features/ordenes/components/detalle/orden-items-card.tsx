import { Card } from "@/components/ui/card";
import type { OrdenDetalle } from "@/types";
import { formatMoney } from "./orden-detalle-formatters";

type Props = {
  orden: OrdenDetalle;
  showTotals?: boolean;
  hidePrices?: boolean;
};

function getTipoClasses(tipo: string) {
  if (tipo === "servicio") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (tipo === "producto") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

export function OrdenItemsCard({
  orden,
  showTotals = false,
  hidePrices = false,
}: Props) {
  const subtotal = Number(orden.subtotal ?? 0);
  const descuentoManual = Number(orden.descuento ?? 0);
  const descuentoPuntos = Number(orden.descuento_puntos ?? 0);
  const descuentoTotal = descuentoManual + descuentoPuntos;

  const totalCalculado = orden.orden_items.reduce(
    (acc, item) =>
      acc + Number(item.cantidad || 0) * Number(item.precio_unitario || 0),
    0
  );

  const totalFinal = totalCalculado - descuentoManual - descuentoPuntos;

  return (
    <Card
      title="Items de la orden"
      right={
        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
          {orden.orden_items.length} item(s)
        </span>
      }
    >
      {orden.orden_items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm font-medium text-gray-700">
            No hay items registrados.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Agrega productos o servicios para completar la orden.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {orden.orden_items.map((item) => {
            const cantidad = Number(item.cantidad || 0);
            const precioUnitario = Number(item.precio_unitario || 0);
            const totalItem = cantidad * precioUnitario;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getTipoClasses(
                        item.tipo_item
                      )}`}
                    >
                      {item.tipo_item}
                    </span>

                    <div>
                      <p className="font-semibold text-gray-900">
                        {item.nombre_item}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Cantidad: {item.cantidad}
                      </p>
                    </div>
                  </div>

                  {!hidePrices ? (
                    <div className="grid grid-cols-2 gap-2 sm:min-w-[220px]">
                      <div className="rounded-xl bg-gray-50 p-3 text-right">
                        <p className="text-xs text-gray-400">P. Unit.</p>
                        <p className="font-semibold text-gray-900">
                          {formatMoney(precioUnitario)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-900 p-3 text-right">
                        <p className="text-xs text-gray-300">Total</p>
                        <p className="font-semibold text-white">
                          {formatMoney(totalItem)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showTotals && !hidePrices ? (
        <div className="mt-5 ml-auto max-w-md rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-semibold text-gray-900">
                {formatMoney(subtotal > 0 ? subtotal : totalCalculado)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500">Descuento manual</span>
              <span className="font-semibold text-gray-900">
                {formatMoney(descuentoManual)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500">Descuento puntos</span>
              <span className="font-semibold text-gray-900">
                {formatMoney(descuentoPuntos)}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 pt-3">
              <span className="font-semibold text-gray-900">
                Total descuento
              </span>
              <span className="font-semibold text-red-600">
                - {formatMoney(descuentoTotal)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-gray-900 px-4 py-3">
              <span className="font-semibold text-white">Total final</span>
              <span className="text-lg font-bold text-white">
                {formatMoney(
                  orden.total && orden.total > 0 ? orden.total : totalFinal
                )}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}