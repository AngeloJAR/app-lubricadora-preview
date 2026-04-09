export const TIPOS_TAREA_ORDEN = [
  "lavado_carroceria",
  "echar_jabon",
  "fregar",
  "enjuagar",
  "secado_cabina",
  "secado_carroceria",
  "secado_vidrios",
  "brillo_llantas",
  "aspirado_interno",
  "limpieza_interior",
  "lavado_motor",
  "lavado_chasis",
  "grafito_chasis_motor_guardafangos",
  "cambio_aceite",
  "cambio_filtro_aceite",
  "mano_obra_cambio_aceite",
  "lavada_completa_combo",
  "tarjeta_kilometraje",
  "ambiental",
  "revision_general",
  "otro",
] as const;

export type TipoTareaOrden = (typeof TIPOS_TAREA_ORDEN)[number];

export const TIPO_TAREA_LABELS: Record<TipoTareaOrden, string> = {
  lavado_carroceria: "Lavado de carrocería",
  echar_jabon: "Aplicar jabón",
  fregar: "Fregar",
  enjuagar: "Enjuagar",
  secado_cabina: "Secado de cabina",
  secado_carroceria: "Secado de carrocería",
  secado_vidrios: "Secado de vidrios",
  brillo_llantas: "Brillo a las llantas",
  aspirado_interno: "Aspirado interno",
  limpieza_interior: "Limpieza interior",
  lavado_motor: "Lavado de motor",
  lavado_chasis: "Lavado de chasis",
  grafito_chasis_motor_guardafangos:
    "Aplicar grafito en chasis, motor y guardafangos",
  cambio_aceite: "Drenar y cambiar aceite",
  cambio_filtro_aceite: "Cambiar filtro de aceite",
  mano_obra_cambio_aceite: "Trabajo de cambio de aceite",
  lavada_completa_combo: "Lavado final",
  tarjeta_kilometraje: "Registrar kilometraje",
  ambiental: "Revisión ambiental",
  revision_general: "Revisión general del vehículo",
  otro: "Otra tarea",
};
export type CategoriaServicioOrden =
  | "lavado_flash"
  | "lavado_express"
  | "lavado_completo"
  | "cambio_aceite";

export type TamanoVehiculoServicio =
  | "automovil"
  | "suv"
  | "camioneta"
  | "furgoneta"
  | "camion"
  | "general";

export type ServicioOrdenBase = {
  codigo: string;
  nombre: string;
  categoria: CategoriaServicioOrden;
  tamano: TamanoVehiculoServicio;
  precio: number;
  tareas: TipoTareaOrden[];
};

export const SERVICIOS_ORDEN_BASE: ServicioOrdenBase[] = [
  {
    codigo: "lavado_flash_automovil",
    nombre: "Lavada por fuera / Flash Automóvil",
    categoria: "lavado_flash",
    tamano: "automovil",
    precio: 2,
    tareas: [
      "lavado_carroceria",
      "echar_jabon",
      "fregar",
      "enjuagar",
      "secado_carroceria",
      "secado_vidrios",
      "brillo_llantas",
    ],
  },
  {
    codigo: "lavado_flash_suv",
    nombre: "Lavada por fuera / Flash SUV",
    categoria: "lavado_flash",
    tamano: "suv",
    precio: 2,
    tareas: [
      "lavado_carroceria",
      "echar_jabon",
      "fregar",
      "enjuagar",
      "secado_carroceria",
      "secado_vidrios",
      "brillo_llantas",
    ],
  },
  {
    codigo: "lavado_flash_camioneta",
    nombre: "Lavada por fuera / Flash Camioneta",
    categoria: "lavado_flash",
    tamano: "camioneta",
    precio: 3,
    tareas: [
      "lavado_carroceria",
      "echar_jabon",
      "fregar",
      "enjuagar",
      "secado_carroceria",
      "secado_vidrios",
      "brillo_llantas",
    ],
  },
  {
    codigo: "lavado_flash_furgoneta",
    nombre: "Lavada por fuera / Flash Furgoneta",
    categoria: "lavado_flash",
    tamano: "furgoneta",
    precio: 4,
    tareas: [
      "lavado_carroceria",
      "echar_jabon",
      "fregar",
      "enjuagar",
      "secado_carroceria",
      "secado_vidrios",
      "brillo_llantas",
    ],
  },
  {
    codigo: "lavado_flash_camion",
    nombre: "Lavada por fuera / Flash Camión",
    categoria: "lavado_flash",
    tamano: "camion",
    precio: 5,
    tareas: [
      "lavado_carroceria",
      "echar_jabon",
      "fregar",
      "enjuagar",
      "secado_cabina",
      "secado_vidrios",
      "brillo_llantas",
    ],
  },

  {
    codigo: "lavado_express_automovil",
    nombre: "Lavada Express Automóvil",
    categoria: "lavado_express",
    tamano: "automovil",
    precio: 4,
    tareas: [
      "lavado_carroceria",
      "echar_jabon",
      "fregar",
      "enjuagar",
      "aspirado_interno",
      "limpieza_interior",
      "secado_carroceria",
      "secado_vidrios",
      "brillo_llantas",
    ],
  },
  {
    codigo: "lavado_express_suv",
    nombre: "Lavada Express SUV",
    categoria: "lavado_express",
    tamano: "suv",
    precio: 5,
    tareas: [
      "lavado_carroceria",
      "echar_jabon",
      "fregar",
      "enjuagar",
      "aspirado_interno",
      "limpieza_interior",
      "secado_carroceria",
      "secado_vidrios",
      "brillo_llantas",
    ],
  },
  {
    codigo: "lavado_express_camioneta",
    nombre: "Lavada Express Camioneta",
    categoria: "lavado_express",
    tamano: "camioneta",
    precio: 6,
    tareas: [
      "lavado_carroceria",
      "echar_jabon",
      "fregar",
      "enjuagar",
      "aspirado_interno",
      "limpieza_interior",
      "secado_carroceria",
      "secado_vidrios",
      "brillo_llantas",
    ],
  },
  {
    codigo: "lavado_express_furgoneta",
    nombre: "Lavada Express Furgoneta",
    categoria: "lavado_express",
    tamano: "furgoneta",
    precio: 7,
    tareas: [
      "lavado_carroceria",
      "echar_jabon",
      "fregar",
      "enjuagar",
      "aspirado_interno",
      "limpieza_interior",
      "secado_carroceria",
      "secado_vidrios",
      "brillo_llantas",
    ],
  },
  {
    codigo: "lavado_express_camion",
    nombre: "Lavada Express Camión",
    categoria: "lavado_express",
    tamano: "camion",
    precio: 8,
    tareas: [
      "lavado_carroceria",
      "echar_jabon",
      "fregar",
      "enjuagar",
      "aspirado_interno",
      "limpieza_interior",
      "secado_carroceria",
      "secado_vidrios",
      "brillo_llantas",
    ],
  },

  {
    codigo: "lavado_completo_automovil",
    nombre: "Lavada Completa Automóvil",
    categoria: "lavado_completo",
    tamano: "automovil",
    precio: 8,
    tareas: [
      "lavado_carroceria",
      "lavado_motor",
      "lavado_chasis",
      "grafito_chasis_motor_guardafangos",
      "echar_jabon",
      "fregar",
      "enjuagar",
      "aspirado_interno",
      "limpieza_interior",
      "secado_carroceria",
      "secado_vidrios",
      "brillo_llantas",
    ],
  },
  {
    codigo: "lavado_completo_suv",
    nombre: "Lavada Completa SUV",
    categoria: "lavado_completo",
    tamano: "suv",
    precio: 9,
    tareas: [
      "lavado_carroceria",
      "lavado_motor",
      "lavado_chasis",
      "grafito_chasis_motor_guardafangos",
      "echar_jabon",
      "fregar",
      "enjuagar",
      "aspirado_interno",
      "limpieza_interior",
      "secado_carroceria",
      "secado_vidrios",
      "brillo_llantas",
    ],
  },
  {
    codigo: "lavado_completo_camioneta",
    nombre: "Lavada Completa Camioneta",
    categoria: "lavado_completo",
    tamano: "camioneta",
    precio: 10,
    tareas: [
      "lavado_carroceria",
      "lavado_motor",
      "lavado_chasis",
      "grafito_chasis_motor_guardafangos",
      "echar_jabon",
      "fregar",
      "enjuagar",
      "aspirado_interno",
      "limpieza_interior",
      "secado_carroceria",
      "secado_vidrios",
      "brillo_llantas",
    ],
  },
  {
    codigo: "lavado_completo_furgoneta",
    nombre: "Lavada Completa Furgoneta",
    categoria: "lavado_completo",
    tamano: "furgoneta",
    precio: 12,
    tareas: [
      "lavado_carroceria",
      "lavado_motor",
      "lavado_chasis",
      "grafito_chasis_motor_guardafangos",
      "echar_jabon",
      "fregar",
      "enjuagar",
      "aspirado_interno",
      "limpieza_interior",
      "secado_carroceria",
      "secado_vidrios",
      "brillo_llantas",
    ],
  },
  {
    codigo: "lavado_completo_camion",
    nombre: "Lavada Completa Camión",
    categoria: "lavado_completo",
    tamano: "camion",
    precio: 15,
    tareas: [
      "lavado_carroceria",
      "lavado_motor",
      "lavado_chasis",
      "grafito_chasis_motor_guardafangos",
      "echar_jabon",
      "fregar",
      "enjuagar",
      "aspirado_interno",
      "limpieza_interior",
      "secado_carroceria",
      "secado_vidrios",
      "brillo_llantas",
    ],
  },

  {
    codigo: "cambio_aceite",
    nombre: "Servicio cambio de aceite",
    categoria: "cambio_aceite",
    tamano: "general",
    precio: 0,
    tareas: [
      "cambio_aceite",
      "cambio_filtro_aceite",
      "mano_obra_cambio_aceite",
      "lavada_completa_combo",
      "tarjeta_kilometraje",
      "ambiental",
      "revision_general",
    ],
  },
];

export const SERVICIOS_ORDEN_MAP = new Map(
  SERVICIOS_ORDEN_BASE.map((servicio) => [servicio.codigo, servicio])
);

export const SERVICIOS_ORDEN_PRECIOS = SERVICIOS_ORDEN_BASE.reduce<
  Record<string, number>
>((acc, servicio) => {
  acc[servicio.codigo] = servicio.precio;
  return acc;
}, {});

function normalizarTexto(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[|:/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getTipoTareaLabel(tipo: string) {
  return TIPO_TAREA_LABELS[tipo as TipoTareaOrden] ?? tipo.replaceAll("_", " ");
}

export function getServicioOrdenBasePorCodigo(codigo: string) {
  return SERVICIOS_ORDEN_MAP.get(codigo) ?? null;
}

export function getServicioOrdenBasePorNombre(nombreServicio: string) {
  const nombreNormalizado = normalizarTexto(nombreServicio);

  return (
    SERVICIOS_ORDEN_BASE.find(
      (servicio) => normalizarTexto(servicio.nombre) === nombreNormalizado
    ) ?? null
  );
}

export function getPrecioBaseServicio(codigoONombre: string) {
  const porCodigo = getServicioOrdenBasePorCodigo(codigoONombre);
  if (porCodigo) return porCodigo.precio;

  const porNombre = getServicioOrdenBasePorNombre(codigoONombre);
  if (porNombre) return porNombre.precio;

  return 0;
}

export function getTareasSugeridasPorServicio(
  codigoONombreServicio: string
): TipoTareaOrden[] {
  const porCodigo = getServicioOrdenBasePorCodigo(codigoONombreServicio);
  if (porCodigo) return porCodigo.tareas;

  const porNombre = getServicioOrdenBasePorNombre(codigoONombreServicio);
  if (porNombre) return porNombre.tareas;

  return ["otro"];
}