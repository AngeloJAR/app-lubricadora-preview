import { Percent, ReceiptText, DollarSign } from "lucide-react";

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
    <div className="grid gap-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-3">
      {/* DESCUENTO */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Percent className="h-4 w-4 text-gray-400" />
          <label className="text-xs font-semibold text-gray-500">
            Descuento
          </label>
        </div>

        <input
          type="number"
          step="0.01"
          value={descuento}
          onChange={(e) => onDescuentoChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none transition focus:border-gray-400"
        />
      </div>

      {/* SUBTOTAL */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-gray-400" />
          <p className="text-xs font-semibold text-gray-500">Subtotal</p>
        </div>

        <p className="text-lg font-bold text-gray-900">
          ${subtotal.toFixed(2)}
        </p>
      </div>

      {/* TOTAL */}
      <div className="rounded-2xl border border-gray-900 bg-gray-900 p-4 shadow-md">
        <div className="mb-2 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-300" />
          <p className="text-xs font-semibold text-gray-300">Total</p>
        </div>

        <p className="text-2xl font-extrabold text-white">
          ${total.toFixed(2)}
        </p>
      </div>
    </div>
  );
}