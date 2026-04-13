type Props = {
  descuento: string;
  subtotal: number;
  total: number;
  onDescuentoChange: (value: string) => void;
};

export function OrdenEditTotalesSection({
  descuento,
  subtotal,
  total,
  onDescuentoChange,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div>
        <label className="mb-1 block text-sm font-medium">Descuento</label>
        <input
          type="number"
          step="0.01"
          value={descuento}
          onChange={(e) => onDescuentoChange(e.target.value)}
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
  );
}