import { UserCheck, Users } from "lucide-react";
import type { TecnicoOption } from "../../domain/orden-edit-types";

type Props = {
  tecnicoId: string;
  tecnicosIds: string[];
  tecnicos: TecnicoOption[];
  loadingData?: boolean;
  onTecnicoPrincipalChange: (tecnicoId: string) => void;
  onToggleTecnico: (tecnicoId: string, checked: boolean) => void;
};

export function OrdenEditTecnicosSection({
  tecnicoId,
  tecnicosIds,
  tecnicos,
  loadingData = false,
  onTecnicoPrincipalChange,
  onToggleTecnico,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-gray-500" />
          <label className="text-sm font-semibold text-gray-700">
            Técnico principal
          </label>
        </div>

        <select
          value={tecnicoId}
          onChange={(e) => onTecnicoPrincipalChange(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-800 outline-none transition focus:border-gray-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loadingData}
        >
          <option value="">Selecciona un técnico principal</option>
          {tecnicos.map((tecnico) => (
            <option key={tecnico.id} value={tecnico.id}>
              {tecnico.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-start gap-2">
          <Users className="mt-0.5 h-4 w-4 text-gray-500" />
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Técnicos asignados
            </h3>
            <p className="text-xs text-gray-500">
              Selecciona todos los técnicos que van a participar en la orden.
            </p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {tecnicos.map((tecnico) => {
            const checked = tecnicosIds.includes(tecnico.id);

            return (
              <label
                key={tecnico.id}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                  checked
                    ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    onToggleTecnico(tecnico.id, e.target.checked)
                  }
                  className="h-4 w-4 accent-gray-900"
                  disabled={loadingData}
                />
                <span className="text-sm font-semibold">{tecnico.nombre}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}