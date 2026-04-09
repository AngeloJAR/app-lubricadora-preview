import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";

import {
  abrirCaja,
  cerrarCaja,
  getBovedaResumenActual,
  getCajaAbierta,
  getCajaMovimientos,
  getCajaResumenActual,
  getCajasRecientes,
  registrarMovimientoCaja,
  transferirCajaABoveda,
} from "@/features/caja/actions";

function formatCurrency(value: number | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

async function requireCajaPageAccess() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("usuarios_app")
    .select("rol, activo")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();

  if (perfilError || !perfil) {
    redirect("/dashboard");
  }

  if (perfil.rol !== "admin" && perfil.rol !== "recepcion") {
    redirect("/dashboard");
  }

  return perfil;
}

function MovimientoTipoBadge({ tipo }: { tipo: "ingreso" | "egreso" }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${tipo === "ingreso"
        ? "border-green-200 bg-green-50 text-green-700"
        : "border-red-200 bg-red-50 text-red-700"
        }`}
    >
      {tipo}
    </span>
  );
}

function CajaEstadoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${estado === "abierta"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-gray-200 bg-gray-50 text-gray-700"
        }`}
    >
      {estado}
    </span>
  );
}

function ResumenCard({
  title,
  value,
  subtitle,
  tone = "default",
}: {
  title: string;
  value: string;
  subtitle: string;
  tone?: "default" | "green" | "red" | "blue";
}) {
  const toneClasses = {
    default: "border-gray-200 bg-white",
    green: "border-green-200 bg-green-50",
    red: "border-red-200 bg-red-50",
    blue: "border-blue-200 bg-blue-50",
  };

  const titleClasses = {
    default: "text-gray-500",
    green: "text-green-700",
    red: "text-red-700",
    blue: "text-blue-700",
  };

  const valueClasses = {
    default: "text-gray-900",
    green: "text-green-900",
    red: "text-red-900",
    blue: "text-blue-900",
  };

  const subtitleClasses = {
    default: "text-gray-500",
    green: "text-green-700/80",
    red: "text-red-700/80",
    blue: "text-blue-700/80",
  };

  return (
    <section
      className={`rounded-2xl border p-4 shadow-sm sm:rounded-3xl sm:p-5 ${toneClasses[tone]}`}
    >
      <p className={`text-xs font-semibold uppercase tracking-[0.12em] sm:text-sm ${titleClasses[tone]}`}>
        {title}
      </p>
      <p className={`mt-2 text-2xl font-bold sm:mt-3 sm:text-3xl ${valueClasses[tone]}`}>
        {value}
      </p>
      <p className={`mt-2 text-xs sm:text-sm ${subtitleClasses[tone]}`}>{subtitle}</p>
    </section>
  );
}

export default async function CajaPage() {
  await requireCajaPageAccess();

  const [cajaAbierta, resumenActual, resumenBoveda, cajasRecientes] =
    await Promise.all([
      getCajaAbierta(),
      getCajaResumenActual(),
      getBovedaResumenActual(),
      getCajasRecientes(10),
    ]);
  const movimientos = cajaAbierta ? await getCajaMovimientos(cajaAbierta.id) : [];

  async function handleAbrirCaja(formData: FormData) {
    "use server";

    await abrirCaja({
      monto_apertura: String(formData.get("monto_apertura") ?? ""),
      observaciones: String(formData.get("observaciones") ?? ""),
    });

    revalidatePath("/caja");
  }

  async function handleRegistrarMovimiento(formData: FormData) {
    "use server";

    const tipo = String(formData.get("tipo") ?? "ingreso") as
      | "ingreso"
      | "egreso";

    const categoria = String(formData.get("categoria") ?? "ingreso_manual");
    const monto = String(formData.get("monto") ?? "");
    const descripcion = String(formData.get("descripcion") ?? "");
    const metodo_pago = String(formData.get("metodo_pago") ?? "efectivo");
    const cuenta = String(formData.get("cuenta") ?? "caja");
    const origen_fondo = String(formData.get("origen_fondo") ?? "negocio");
    const naturaleza = String(formData.get("naturaleza") ?? "gasto_operativo");

    const esTransferenciaABoveda =
      tipo === "egreso" &&
      cuenta === "boveda" &&
      naturaleza === "transferencia_interna";

    if (esTransferenciaABoveda) {
      await transferirCajaABoveda(monto, descripcion);
    } else {
      await registrarMovimientoCaja({
        tipo,
        categoria: categoria as any,
        monto,
        descripcion,
        metodo_pago: metodo_pago as any,
        cuenta: cuenta as any,
        origen_fondo: origen_fondo as any,
        naturaleza: naturaleza as any,
      });
    }

    revalidatePath("/caja");
  }

  async function handleCerrarCaja(formData: FormData) {
    "use server";

    await cerrarCaja({
      monto_cierre: String(formData.get("monto_cierre") ?? ""),
      observaciones: String(formData.get("observaciones_cierre") ?? ""),
    });

    revalidatePath("/caja");
  }

  return (
    <AppShell title="Caja">
      <div className="grid gap-4 sm:gap-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
          <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 sm:text-xs">
                Control diario
              </p>
              <h2 className="mt-1 text-xl font-semibold text-gray-900 sm:text-2xl">
                Apertura, movimientos y cierre de caja
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Registra ingresos, egresos y valida el efectivo esperado al final del día.
              </p>
            </div>
          </div>
        </section>

        {!cajaAbierta ? (
          <section className="rounded-2xl border border-green-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
            <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Abrir caja</h3>
            <p className="mt-1 text-sm text-gray-500">
              Inicia la caja del día con el monto base.
            </p>

            <form action={handleAbrirCaja} className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Monto de apertura
                </label>
                <input
                  name="monto_apertura"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="min-h-11 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="20"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Observaciones
                </label>
                <input
                  name="observaciones"
                  type="text"
                  className="min-h-11 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Caja inicial del día"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-green-300 bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:brightness-95 sm:w-auto"
                >
                  Abrir caja
                </button>
              </div>
            </form>
          </section>
        ) : (
          <>
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ResumenCard
                title="Apertura"
                value={formatCurrency(cajaAbierta.monto_apertura)}
                subtitle={formatDateTime(cajaAbierta.fecha_apertura)}
              />
              <ResumenCard
                title="Ingresos"
                value={formatCurrency(resumenActual?.ingresos)}
                subtitle="Total de entradas registradas."
                tone="green"
              />
              <ResumenCard
                title="Egresos"
                value={formatCurrency(resumenActual?.egresos)}
                subtitle="Total de salidas registradas."
                tone="red"
              />
              <ResumenCard
                title="Esperado"
                value={formatCurrency(resumenActual?.esperado)}
                subtitle="Efectivo esperado en caja."
                tone="blue"
              />
              <ResumenCard
                title="Bóveda"
                value={formatCurrency(resumenBoveda?.saldo)}
                subtitle="Saldo actual guardado en bóveda."
                tone="blue"
              />

            </div>

            <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                  Registrar movimiento
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Agrega ingresos o egresos manuales a la caja actual.
                </p>

                <form
                  action={handleRegistrarMovimiento}
                  className="mt-4 grid gap-4 md:grid-cols-2"
                >


                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Cuenta
                    </label>
                    <select
                      name="cuenta"
                      defaultValue="caja"
                      className="min-h-11 rounded-xl border border-gray-300 px-4 py-3 text-sm"
                    >
                      <option value="caja">Caja</option>
                      <option value="boveda">Bóveda</option>
                      <option value="banco">Banco</option>
                      <option value="deuna">Deuna</option>
                      <option value="tarjeta_por_cobrar">Tarjeta por cobrar</option>
                    </select>
                  </div>


                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Origen del dinero
                    </label>
                    <select
                      name="origen_fondo"
                      defaultValue="negocio"
                      className="min-h-11 rounded-xl border border-gray-300 px-4 py-3 text-sm"
                    >
                      <option value="negocio">Negocio</option>
                      <option value="prestamo">Préstamo</option>
                      <option value="personal">Personal</option>
                      <option value="socio">Socio</option>
                    </select>
                  </div>

                  <div className="grid gap-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">
                      Naturaleza
                    </label>
                    <select
                      name="naturaleza"
                      defaultValue="gasto_operativo"
                      className="min-h-11 rounded-xl border border-gray-300 px-4 py-3 text-sm"
                    >
                      <option value="ingreso_operativo">Ingreso operativo</option>
                      <option value="gasto_operativo">Gasto operativo</option>
                      <option value="prestamo_recibido">Préstamo recibido</option>
                      <option value="pago_prestamo">Pago préstamo</option>
                      <option value="aporte">Aporte</option>
                      <option value="retiro_dueno">Retiro dueño</option>
                      <option value="transferencia_interna">Transferencia</option>
                    </select>
                  </div>


                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Tipo
                    </label>
                    <select
                      name="tipo"
                      defaultValue="ingreso"
                      className="min-h-11 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    >
                      <option value="ingreso">Ingreso</option>
                      <option value="egreso">Egreso</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Categoría
                    </label>
                    <select
                      name="categoria"
                      defaultValue="ingreso_manual"
                      className="min-h-11 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    >
                      <option value="orden">Orden</option>
                      <option value="gasto">Gasto</option>
                      <option value="pago_empleado">Pago empleado</option>
                      <option value="ingreso_manual">Ingreso manual</option>
                      <option value="egreso_manual">Egreso manual</option>
                      <option value="ajuste">Ajuste</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Monto
                    </label>
                    <input
                      name="monto"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      className="min-h-11 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      placeholder="10"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Método de pago
                    </label>
                    <select
                      name="metodo_pago"
                      defaultValue="efectivo"
                      className="min-h-11 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="mixto">Mixto</option>
                    </select>
                  </div>

                  <div className="grid gap-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">
                      Descripción
                    </label>
                    <input
                      name="descripcion"
                      type="text"
                      className="min-h-11 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      placeholder="Ej: compra de limpieza"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-yellow-300 bg-yellow-500 px-5 py-3 text-sm font-medium text-white transition hover:brightness-95 sm:w-auto"
                    >
                      Guardar movimiento
                    </button>
                  </div>
                </form>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                  Cerrar caja
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Registra el efectivo real para calcular diferencia.
                </p>

                <form action={handleCerrarCaja} className="mt-4 grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Monto esperado
                    </label>
                    <input
                      value={formatCurrency(resumenActual?.esperado)}
                      readOnly
                      className="min-h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Monto real en caja
                    </label>
                    <input
                      name="monto_cierre"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      className="min-h-11 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      placeholder="0"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Observaciones de cierre
                    </label>
                    <textarea
                      name="observaciones_cierre"
                      rows={4}
                      className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                      placeholder="Observaciones del cierre"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-red-300 bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:brightness-95 sm:w-auto"
                  >
                    Cerrar caja
                  </button>
                </form>
              </section>
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
              <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                Movimientos de la caja actual
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Últimos movimientos registrados en esta caja.
              </p>

              {movimientos.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500 sm:p-6">
                  No hay movimientos registrados todavía.
                </div>
              ) : (
                <>
                  <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-gray-200 md:block">
                    <table className="min-w-full bg-white">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-sm text-gray-600">
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">Categoría</th>
                          <th className="px-4 py-3">Método</th>
                          <th className="px-4 py-3">Descripción</th>
                          <th className="px-4 py-3">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientos.map((movimiento) => (
                          <tr
                            key={movimiento.id}
                            className="border-t border-gray-200 text-sm"
                          >
                            <td className="px-4 py-3">
                              {formatDateTime(movimiento.created_at)}
                            </td>
                            <td className="px-4 py-3">
                              <MovimientoTipoBadge tipo={movimiento.tipo} />
                            </td>
                            <td className="px-4 py-3">{movimiento.categoria}</td>
                            <td className="px-4 py-3">{movimiento.metodo_pago}</td>
                            <td className="px-4 py-3">
                              {movimiento.descripcion ?? "-"}
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {formatCurrency(movimiento.monto)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 grid gap-3 md:hidden">
                    {movimientos.map((movimiento) => (
                      <article
                        key={movimiento.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium text-gray-500">Fecha</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              {formatDateTime(movimiento.created_at)}
                            </p>
                          </div>

                          <MovimientoTipoBadge tipo={movimiento.tipo} />
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-medium text-gray-500">Categoría</p>
                            <p className="mt-1 text-sm text-gray-900">
                              {movimiento.categoria}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-gray-500">Método</p>
                            <p className="mt-1 text-sm text-gray-900">
                              {movimiento.metodo_pago}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs font-medium text-gray-500">Descripción</p>
                          <p className="mt-1 text-sm text-gray-900">
                            {movimiento.descripcion ?? "-"}
                          </p>
                        </div>

                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <p className="text-xs font-medium text-gray-500">Monto</p>
                          <p className="mt-1 text-base font-bold text-gray-900">
                            {formatCurrency(movimiento.monto)}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
          <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
            Cajas recientes
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Historial de aperturas y cierres de caja.
          </p>

          {cajasRecientes.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500 sm:p-6">
              Todavía no hay cajas registradas.
            </div>
          ) : (
            <>
              <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-gray-200 md:block">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-sm text-gray-600">
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Apertura</th>
                      <th className="px-4 py-3">Cierre</th>
                      <th className="px-4 py-3">Esperado</th>
                      <th className="px-4 py-3">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cajasRecientes.map((caja) => (
                      <tr key={caja.id} className="border-t border-gray-200 text-sm">
                        <td className="px-4 py-3">{caja.fecha}</td>
                        <td className="px-4 py-3">
                          <CajaEstadoBadge estado={caja.estado} />
                        </td>
                        <td className="px-4 py-3">
                          {formatCurrency(caja.monto_apertura)}
                        </td>
                        <td className="px-4 py-3">
                          {caja.monto_cierre !== null
                            ? formatCurrency(caja.monto_cierre)
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {caja.monto_esperado !== null
                            ? formatCurrency(caja.monto_esperado)
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {caja.diferencia !== null
                            ? formatCurrency(caja.diferencia)
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid gap-3 md:hidden">
                {cajasRecientes.map((caja) => (
                  <article
                    key={caja.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Fecha</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {formatDate(caja.fecha)}
                        </p>
                      </div>

                      <CajaEstadoBadge estado={caja.estado} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Apertura</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {formatCurrency(caja.monto_apertura)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-500">Cierre</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {caja.monto_cierre !== null
                            ? formatCurrency(caja.monto_cierre)
                            : "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-500">Esperado</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {caja.monto_esperado !== null
                            ? formatCurrency(caja.monto_esperado)
                            : "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-500">Diferencia</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {caja.diferencia !== null
                            ? formatCurrency(caja.diferencia)
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}