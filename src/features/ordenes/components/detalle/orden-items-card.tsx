import { Card } from "@/components/ui/card";
import type { OrdenDetalle } from "@/types";
import { formatMoney } from "./orden-detalle-formatters";

type Props = {
  orden: OrdenDetalle;
  showTotals?: boolean;
  hidePrices?: boolean;
};

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
        <span className="text-xs text-gray-500">
          {orden.orden_items.length} item(s)
        </span>
      }
    >
      {orden.orden_items.length === 0 ? (
        <p className="text-sm text-gray-500">No hay items registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Cant.</th>
                {!hidePrices ? <th className="px-3 py-2">P. Unit.</th> : null}
                {!hidePrices ? <th className="px-3 py-2">Total</th> : null}
              </tr>
            </thead>
            <tbody>
              {orden.orden_items.map((item) => {
                const totalItem =
                  Number(item.cantidad || 0) * Number(item.precio_unitario || 0);

                return (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="px-3 py-3 capitalize">{item.tipo_item}</td>
                    <td className="px-3 py-3">{item.nombre_item}</td>
                    <td className="px-3 py-3">{item.cantidad}</td>
                    {!hidePrices ? (
                      <td className="px-3 py-3">
                        {formatMoney(item.precio_unitario)}
                      </td>
                    ) : null}
                    {!hidePrices ? (
                      <td className="px-3 py-3">{formatMoney(totalItem)}</td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showTotals && !hidePrices ? (
        <div className="mt-5 ml-auto max-w-sm space-y-2 rounded-xl bg-gray-50 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">
              {formatMoney(subtotal > 0 ? subtotal : totalCalculado)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600">Descuento manual</span>
            <span className="font-medium text-gray-900">
              {formatMoney(descuentoManual)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600">Descuento puntos</span>
            <span className="font-medium text-gray-900">
              {formatMoney(descuentoPuntos)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 pt-2">
            <span className="font-semibold text-gray-900">Total descuento</span>
            <span className="font-semibold text-gray-900">
              {formatMoney(descuentoTotal)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 pt-2">
            <span className="font-semibold text-gray-900">Total final</span>
            <span className="font-semibold text-gray-900">
              {formatMoney(orden.total && orden.total > 0 ? orden.total : totalFinal)}
            </span>
          </div>
        </div>
      ) : null}
    </Card>
  );
}