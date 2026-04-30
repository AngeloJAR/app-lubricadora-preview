import { AlertCircle, CheckCircle2 } from "lucide-react";

type Props = {
  error: string;
  success: string;
};

export function OrdenMensajesSection({ error, success }: Props) {
  if (!error && !success) return null;

  return (
    <div className="grid gap-3">
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 shadow-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-3 shadow-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
          <p className="text-sm font-medium text-green-700">{success}</p>
        </div>
      )}
    </div>
  );
}