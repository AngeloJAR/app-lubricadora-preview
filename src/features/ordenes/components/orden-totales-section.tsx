import { Coins, Percent, Wallet } from "lucide-react";

type Props = {
  descuento: string;
  puntosCanjear: string;
  puntosCliente: number;
  descuentoPuntos: number;
  total: number;
  onChangeDescuento: (value: string) => void;
  onChangePuntos: (value: string) => void;
};

export function OrdenTotalesSection({
  descuento,
  puntosCanjear,
  puntosCliente,
  descuentoPuntos,
  total,
  onChangeDescuento,
  onChangePuntos,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* DESCUENTO */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <Percent className="h-4 w-4 text-gray-500" />
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Descuento manual
          </p>
        </div>

        <input
          type="number"
          step="0.01"
          value={descuento}
          onChange={(e) => onChangeDescuento(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
          placeholder="0.00"
        />
      </div>

      {/* PUNTOS */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <Coins className="h-4 w-4 text-yellow-500" />
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Puntos a usar
          </p>
        </div>

        <input
          type="number"
          value={puntosCanjear}
          onChange={(e) => {
            const value = Number(e.target.value);

            if (value > puntosCliente) {
              onChangePuntos(String(puntosCliente));
              return;
            }

            onChangePuntos(e.target.value);
          }}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
          placeholder="0"
        />

        <p className="mt-2 text-xs text-gray-500">
          Disponibles:{" "}
          <span className="font-medium text-gray-700">
            {puntosCliente} pts
          </span>
        </p>
      </div>

      {/* DESCUENTO PUNTOS */}
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-green-600" />
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Descuento por puntos
          </p>
        </div>

        <p className="text-xl font-bold text-green-700">
          -${descuentoPuntos.toFixed(2)}
        </p>
      </div>

      {/* TOTAL */}
      <div className="rounded-2xl border border-gray-900 bg-gray-900 p-4 shadow-md">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Total final
        </p>

        <p className="mt-1 text-2xl font-bold text-white">
          ${total.toFixed(2)}
        </p>
      </div>
    </div>
  );
}