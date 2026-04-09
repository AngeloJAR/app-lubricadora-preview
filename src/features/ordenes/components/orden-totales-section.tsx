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
      <div>
        <label className="mb-1 block text-sm font-medium">Descuento manual</label>
        <input
          type="number"
          step="0.01"
          value={descuento}
          onChange={(e) => onChangeDescuento(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Puntos a usar</label>
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
          className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
        />
        <p className="mt-1 text-xs text-gray-500">
          Disponibles: {puntosCliente} puntos
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 p-4">
        <p className="text-sm text-gray-500">Descuento por puntos</p>
        <p className="text-xl font-bold text-green-600">
          -${descuentoPuntos.toFixed(2)}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 p-4">
        <p className="text-sm text-gray-500">Total</p>
        <p className="text-xl font-bold">${total.toFixed(2)}</p>
      </div>
    </div>
  );
}