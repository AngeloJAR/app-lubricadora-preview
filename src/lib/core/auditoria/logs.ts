type SupabaseClient = any;

export type AuditoriaLogInput = {
  supabase: SupabaseClient;

  usuario_id?: string | null;

  entidad: string; // orden, producto, cliente, etc
  entidad_id: string;

  accion: string; // crear, actualizar, eliminar, cambio_estado, etc

  descripcion?: string;

  datos_antes?: any;
  datos_despues?: any;
};

export function registrarAuditoriaLog(input: AuditoriaLogInput) {
  const {
    supabase,
    usuario_id,
    entidad,
    entidad_id,
    accion,
    descripcion,
    datos_antes,
    datos_despues,
  } = input;

  supabase
    .from("auditoria_logs")
    .insert([
      {
        usuario_id: usuario_id ?? null,
        entidad,
        entidad_id,
        accion,
        descripcion: descripcion ?? null,
        datos_antes: datos_antes ?? null,
        datos_despues: datos_despues ?? null,
        created_at: new Date().toISOString(),
      },
    ])
    .then(({ error }) => {
      if (error) {
        console.error("Error registrando auditoría:", error.message);
      }
    })
    .catch((err) => {
      console.error("Error inesperado en auditoría:", err);
    });
}