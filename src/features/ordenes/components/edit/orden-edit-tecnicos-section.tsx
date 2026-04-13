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
            <div>
                <label className="mb-1 block text-sm font-medium">Técnico principal</label>
                <select
                    value={tecnicoId}
                    onChange={(e) => onTecnicoPrincipalChange(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-black"
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

            <div className="rounded-2xl border border-gray-200 p-4">
                <div className="mb-3">
                    <h3 className="text-sm font-semibold">Técnicos asignados</h3>
                    <p className="text-xs text-gray-500">
                        Selecciona todos los técnicos que van a participar en la orden.
                    </p>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                    {tecnicos.map((tecnico) => (
                        <label
                            key={tecnico.id}
                            className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2"
                        >
                            <input
                                type="checkbox"
                                checked={tecnicosIds.includes(tecnico.id)}
                                onChange={(e) => onToggleTecnico(tecnico.id, e.target.checked)}
                            />
                            <span className="text-sm">{tecnico.nombre}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}