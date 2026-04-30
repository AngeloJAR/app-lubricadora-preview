export type Cliente = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  whatsapp: string | null;
  email: string | null;
  cedula_ruc: string | null;
  notas: string | null;
  acepta_promociones: boolean;
  created_at: string;
  updated_at: string;
};

export type ClienteFormData = {
  nombres: string;
  apellidos: string;
  telefono: string;
  whatsapp: string;
  email: string;
  cedula_ruc: string;
  notas: string;
  acepta_promociones: boolean;
};

export type Vehiculo = {
  id: string;
  cliente_id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number | null;
  color: string | null;
  combustible: string | null;
  transmision: string | null;
  kilometraje_actual: number | null;
  vin_chasis: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type VehiculoFormData = {
  cliente_id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: string;
  color: string;
  combustible: string;
  transmision: string;
  kilometraje_actual: string;
  vin_chasis: string;
  notas: string;
};

export type VehiculoConCliente = Vehiculo & {
  clientes: {
    id: string;
    nombres: string;
    apellidos: string;
    telefono: string;
  } | null;
};

export type ClienteBusqueda = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  whatsapp: string | null;
  email: string | null;
};

export type BusquedaResultado = {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number | null;
  kilometraje_actual: number | null;
  clientes: ClienteBusqueda[] | null;
};

export type ClienteDetalle = Cliente & {
  vehiculos: Vehiculo[];
};

export type Servicio = {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string | null;
  precio_base: number;
  duracion_estimada_min: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type ServicioFormData = {
  nombre: string;
  categoria: string;
  descripcion: string;
  precio_base: string;
  duracion_estimada_min: string;
  activo: boolean;
};

export type OrdenTrabajo = {
  id: string;
  numero: string;
  cliente_id: string;
  vehiculo_id: string;
  tecnico_id: string | null;
  fecha: string;
  estado: "pendiente" | "en_proceso" | "completada" | "entregada" | "cancelada";
  estado_pago: "pendiente" | "abonada" | "pagada";
  total_pagado: number;
  saldo_pendiente: number;
  fecha_pago: string | null;
  kilometraje: number | null;
  kilometraje_final: number | null;
  subtotal: number;
  descuento: number;
  descuento_puntos: number;
  total: number;
  puntos_usados: number;
  notas: string | null;
  observaciones_tecnicas: string | null;
  proximo_mantenimiento_fecha: string | null;
  proximo_mantenimiento_km: number | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  created_at: string;
  updated_at: string;
};

export type OrdenItem = {
  id: string;
  orden_id: string;
  tipo_item: "servicio" | "producto";
  servicio_id: string | null;
  producto_id: string | null;
  nombre_item: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  created_at: string;
  updated_at: string;
};

export type OrdenFormItem = {
  tipo_item: "servicio" | "producto";
  servicio_id: string;
  producto_id: string;
  nombre_item: string;
  cantidad: string;
  precio_unitario: string;
  total: string;
};

export type OrdenFormData = {
  cliente_id: string;
  vehiculo_id: string;
  tecnico_id: string;
  tecnicos_ids: string[];
  kilometraje: string;
  descuento: string;
  descuento_puntos: string;
  puntos_canjear: string;
  notas: string;
  proximo_mantenimiento_fecha: string;
  proximo_mantenimiento_km: string;
  items: OrdenFormItem[];
};

export type OrdenConRelaciones = OrdenTrabajo & {
  clientes: {
    id: string;
    nombres: string;
    apellidos: string;
    telefono: string;
  } | null;
  vehiculos: {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
  } | null;
  tecnico: {
    id: string;
    nombres: string | null;
    apellidos: string | null;
  } | null;
  tecnicos?: {
    id: string;
    nombre: string;
    es_principal: boolean;
  }[];
};

export type HistorialOrden = OrdenTrabajo & {
  vehiculos: {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
  } | null;
  orden_items: OrdenItem[];
};

export type VehiculoDetalle = Vehiculo & {
  clientes: {
    id: string;
    nombres: string;
    apellidos: string;
    telefono: string;
    whatsapp: string | null;
    email: string | null;
  } | null;
};

export type HistorialVehiculoOrden = OrdenTrabajo & {
  orden_items: OrdenItem[];
  clientes: {
    id: string;
    nombres: string;
    apellidos: string;
    telefono: string;
  } | null;
};

export type OrdenDetalle = OrdenTrabajo & {
  clientes: {
    id: string;
    nombres: string;
    apellidos: string;
    telefono: string;
    whatsapp: string | null;
    email: string | null;
  } | null;
  vehiculos: {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
    anio: number | null;
    color: string | null;
    combustible: string | null;
    transmision: string | null;
    kilometraje_actual: number | null;
  } | null;
  tecnico: {
    id: string;
    rol: string;
  } | null;
  orden_items: OrdenItem[];
  pdf_url: string | null;
  pdf_storage_path: string | null;
  pdf_generated_at: string | null;
};

export type OrdenEditable = {
  id: string;
  numero: string;
  cliente_id: string;
  vehiculo_id: string;
  tecnico_id: string | null;
  kilometraje: number | null;
  kilometraje_final: number | null;
  descuento: number;
  notas: string | null;
  observaciones_tecnicas: string | null;
  proximo_mantenimiento_fecha: string | null;
  proximo_mantenimiento_km: number | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  items: {
    id: string;
    tipo_item: "servicio" | "producto";
    servicio_id: string | null;
    producto_id: string | null;
    nombre_item: string;
    cantidad: number;
    precio_unitario: number;
    total: number;
  }[];
};

export type DashboardMetricas = {
  ordenes_abiertas: number;

  ventas_hoy: number;
  costos_hoy: number;
  gastos_hoy: number;
  utilidad_hoy: number;
  margen_hoy: number;

  ventas_mes: number;
  costos_mes: number;
  gastos_mes: number;
  utilidad_mes: number;
  margen_mes: number;

  ticket_promedio: number;
  ordenes_cerradas_periodo: number;
  punto_equilibrio: number;
};

export type DashboardServicioTop = {
  nombre_item: string;
  total_servicios: number;
  total_ingresos: number;
};

export type DashboardMantenimientoProximo = {
  id: string;
  numero: string;
  proximo_mantenimiento_fecha: string | null;
  proximo_mantenimiento_km: number | null;
  clientes: {
    id: string;
    nombres: string;
    apellidos: string;
    telefono: string;
  } | null;
  vehiculos: {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
  } | null;
};

export type DashboardClienteReciente = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  created_at: string;
};

export type DashboardClienteInactivo = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
};

export type ClienteCampaniaReactivacion = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  whatsapp: string | null;
  diasInactivo: number;
  mensajeWhatsapp: string;
  puedeEnviarWhatsapp: boolean;
};

export type Recordatorio = {
  id: string;
  cliente_id: string;
  vehiculo_id: string;
  orden_id: string;
  tipo: "fecha" | "kilometraje";
  canal: "manual" | "whatsapp" | "email" | "sms";
  fecha_programada: string | null;
  kilometraje_programado: number | null;
  mensaje: string | null;
  estado: "pendiente" | "enviado" | "cancelado";
  enviado_en: string | null;
  created_at: string;
  updated_at: string;
};

export type RecordatorioConRelaciones = Recordatorio & {
  clientes: {
    id: string;
    nombres: string;
    apellidos: string;
    telefono: string;
  } | null;
  vehiculos: {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
    kilometraje_actual: number | null;
  } | null;
  ordenes_trabajo: {
    id: string;
    numero: string;
  } | null;
};

export type Producto = {
  id: string;
  nombre: string;
  categoria: string;
  marca: string | null;
  stock: number;
  precio_compra: number;
  precio_venta: number;
  activo: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;

  precio_compra_incluye_iva: boolean;

  incluye_filtro: boolean;
  incluye_ambiental: boolean;
  incluye_tarjeta: boolean;

  costo_filtro: number;
  costo_ambiental: number;
  costo_tarjeta: number;

  costo_real: number;

  producto_aplicaciones_vehiculo?: {
    vehiculo_marca: string | null;
    vehiculo_modelo: string | null;
    vehiculo_motor: string | null;
  }[];
};
export type ProductoFormData = {
  nombre: string;
  categoria: string;
  marca: string;
  stock: string;
  precio_compra: string;
  precio_venta: string;

  precio_compra_incluye_iva: boolean;

  incluye_filtro: boolean;
  incluye_ambiental: boolean;
  incluye_tarjeta: boolean;

  costo_filtro: string;
  costo_ambiental: string;
  costo_tarjeta: string;

  costo_real?: number;

  activo: boolean;
  notas: string;
};

export type ProductoStockFormData = {
  producto_id: string;
  cantidad: string;
  precio_compra: string;
  precio_venta: string;
};

export type ConfiguracionTaller = {
  id: string;
  nombre_negocio: string;
  telefono: string | null;
  whatsapp: string | null;
  direccion: string | null;
  mensaje_final: string | null;
  moneda: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
  margen_ganancia: number;
};

export type ConfiguracionTallerFormData = {
  nombre_negocio: string;
  telefono: string;
  whatsapp: string;
  direccion: string;
  mensaje_final: string;
  moneda: string;
  logo_url: string;
  margen_ganancia: string;
};

export type OrdenTareaTecnicoEstado =
  | "pendiente"
  | "en_proceso"
  | "completada";

export type OrdenTareaTecnico = {
  id: string;
  orden_id: string;
  tecnico_id: string;
  tipo_tarea: string;
  descripcion: string | null;
  estado: OrdenTareaTecnicoEstado;
  hora_inicio: string | null;
  hora_fin: string | null;
  created_at: string;
  updated_at: string;
};

export type OrdenTareaTecnicoFormData = {
  tecnico_id: string;
  tipo_tarea: string;
  descripcion: string;
  estado: OrdenTareaTecnicoEstado;
};

export type Gasto = {
  id: string;
  categoria: string;
  descripcion: string | null;
  monto: number;
  fecha: string;
  tipo_gasto: "fijo" | "variable";
  ambito: "negocio" | "personal";
  metodo_pago: "efectivo" | "transferencia" | "deuna" | "tarjeta" | "mixto";
  afecta_caja: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  cuenta: CuentaDinero;
  origen_fondo: OrigenFondo;
  naturaleza: NaturalezaMovimiento;
};

export type GastoFormData = {
  categoria: string;
  descripcion: string;
  monto: string;
  fecha: string;
  tipo_gasto: "fijo" | "variable";
  ambito: "negocio" | "personal";
  metodo_pago: "efectivo" | "transferencia" | "deuna" | "tarjeta" | "mixto";
  afecta_caja: boolean;
  cuenta: CuentaDinero;
  origen_fondo: OrigenFondo;
  naturaleza: NaturalezaMovimiento;
};

export type DashboardProductoRentable = {
  producto_id: string;
  nombre: string;
  cantidad_vendida: number;
  total_ingresos: number;
  total_costos: number;
  total_ganancia: number;
  margen_promedio: number;
};

export type DashboardAlerta = {
  tipo: "error" | "warning" | "info";
  titulo: string;
  descripcion: string;
};

export type DashboardAccionSugerida = {
  tipo: "error" | "warning" | "success" | "info";
  titulo: string;
  descripcion: string;
};

export type DashboardSerieFinanciera = {
  fecha: string;
  ventas: number;
  costos: number;
  gastos: number;
  utilidad: number;
};

export type CotizacionEstado =
  | "borrador"
  | "enviada"
  | "aprobada"
  | "rechazada"
  | "vencida";

export type CotizacionItem = {
  id: string;
  cotizacion_id: string;
  tipo_item: "servicio" | "producto";
  nombre_item: string;
  descripcion: string | null;
  cantidad: number;
  precio_unitario: number;
  total: number;
  created_at: string;
  updated_at: string;
};

export type Cotizacion = {
  id: string;
  numero: string;
  cliente_id: string;
  vehiculo_id: string | null;
  fecha: string;
  estado: CotizacionEstado;
  subtotal: number;
  descuento: number;
  total: number;
  notas: string | null;
  validez_hasta: string | null;
  pdf_url: string | null;
  pdf_storage_path: string | null;
  pdf_generated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CotizacionDetalle = Cotizacion & {
  clientes: {
    id: string;
    nombres: string;
    apellidos: string;
    telefono: string;
    whatsapp: string | null;
    email: string | null;
  } | null;
  vehiculos: {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
    anio: number | null;
  } | null;
  cotizacion_items: CotizacionItem[];
};

export type VehiculoCotizacionOption = {
  id: string;
  cliente_id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number | null;
};

export type Combo = {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  precio_combo: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type ComboItem = {
  id: string;
  combo_id: string;
  tipo_item: "servicio" | "producto";
  servicio_id: string | null;
  producto_id: string | null;
  nombre_item: string;
  cantidad: number;
  precio_unitario: number;
  orden: number;
  created_at: string;
};

export type ComboDetalle = Combo & {
  items: ComboItem[];
};

export type ComboFormItem = {
  tipo_item: "servicio" | "producto";
  servicio_id: string;
  producto_id: string;
  nombre_item: string;
  cantidad: string;
  precio_unitario: string;
};

export type ComboFormData = {
  nombre: string;
  descripcion: string;
  categoria: string;
  precio_combo: string;
  activo: boolean;
  items: ComboFormItem[];
};

export type ClientePuntosMovimiento = {
  id: string;
  cliente_id: string;
  vehiculo_id: string | null;
  orden_id: string | null;
  tipo: "acumulacion" | "canje" | "ajuste";
  puntos: number;
  motivo: string | null;
  created_at: string;
};

export type ClientePromocion = {
  id: string;
  cliente_id: string;
  vehiculo_id: string | null;
  titulo: string;
  descripcion: string | null;
  tipo: "descuento" | "servicio_gratis" | "producto_gratis" | "combo";
  valor: number | null;
  puntos_requeridos: number | null;
  activa: boolean;
  usada: boolean;
  fecha_expiracion: string | null;
  created_at: string;
};

export type ClienteFidelizacionResumen = {
  puntosDisponibles: number;
  puntosGanados: number;
  puntosCanjeados: number;
  totalVisitas: number;
  promocionesDisponibles: number;
};

export type TipoSugerenciaFidelizacion =
  | "promo_disponible"
  | "cerca_recompensa"
  | "upsell"
  | "reactivacion";

export type PromocionAutomatica = {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: "descuento" | "servicio_gratis" | "producto_gratis" | "upsell";
  puntos_requeridos: number;
  valor_descuento?: number;
  porcentaje_descuento?: number;
  servicio_codigo?: string;
  producto_codigo?: string;
  activa: boolean;
  prioridad: number;
};

export type ResumenFidelizacionCliente = {
  cliente_id: string;
  puntos_disponibles: number;
  puntos_ganados: number;
  puntos_canjeados: number;
  total_visitas: number;
  ultima_visita: string | null;
};

export type SugerenciaFidelizacionOrden = {
  id: string;
  tipo: TipoSugerenciaFidelizacion;
  titulo: string;
  mensaje: string;
  prioridad: number;
  promocion?: PromocionAutomatica;
};

export type ClienteOportunidadFidelizacion = {
  cliente_id: string;
  nombres: string;
  apellidos: string;
  telefono: string;

  puntos_disponibles: number;
  puntos_ganados: number;
  puntos_canjeados: number;

  total_visitas: number;
  ultima_visita: string | null;

  tipo_oportunidad:
  | "promo_disponible"
  | "cerca_recompensa"
  | "con_puntos"
  | "por_volver";

  descripcion: string;
  prioridad: number;
};

export type EmpleadoPago = {
  id: string;
  empleado_id: string;
  tipo_pago: "sueldo" | "anticipo" | "bono" | "comision" | "descuento";
  monto: number;
  fecha_pago: string;
  periodo_inicio: string | null;
  periodo_fin: string | null;
  observaciones: string | null;
  created_at: string;
};

export type EmpleadoPagoFormData = {
  empleado_id: string;
  tipo_pago: "sueldo" | "anticipo" | "bono" | "comision" | "descuento";
  monto: string;
  fecha_pago: string;
  periodo_inicio: string;
  periodo_fin: string;
  observaciones: string;
};

export type PagoEmpleadoTipo =
  | "sueldo"
  | "anticipo"
  | "bono"
  | "comision"
  | "descuento";

export type PagoEmpleado = {
  id: string;
  empleado_id: string;
  tipo_pago: PagoEmpleadoTipo;
  monto: number;
  fecha_pago: string;
  periodo_inicio: string | null;
  periodo_fin: string | null;
  observaciones: string | null;
  created_at: string | null;
  usuarios_app?: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  } | null;
};

export type PagoEmpleadoFormData = {
  empleado_id: string;
  tipo_pago: PagoEmpleadoTipo;
  monto: string;
  fecha_pago: string;
  periodo_inicio: string;
  periodo_fin: string;
  observaciones: string;
};

export type CajaEstado = "abierta" | "cerrada";

export type CuentaDinero =
  | "caja"
  | "banco"
  | "deuna"
  | "tarjeta_por_cobrar"
  | "boveda";

export type OrigenFondo =
  | "negocio"
  | "prestamo"
  | "personal"
  | "socio";

export type NaturalezaMovimiento =
  | "ingreso_operativo"
  | "gasto_operativo"
  | "aporte"
  | "prestamo_recibido"
  | "pago_prestamo"
  | "retiro_dueno"
  | "transferencia_interna";

export type Caja = {
  id: string;
  fecha: string;
  estado: CajaEstado;

  monto_apertura: number;
  monto_cierre: number | null;
  monto_esperado: number | null;
  diferencia: number | null;

  observaciones: string | null;

  abierto_por: string;
  cerrado_por: string | null;

  fecha_apertura: string;
  fecha_cierre: string | null;

  created_at: string;
  updated_at: string;
};

export type CajaMovimientoTipo = "ingreso" | "egreso";

export type CajaMovimientoCategoria =
  | "orden"
  | "abono_orden"
  | "devolucion_orden"
  | "gasto"
  | "gasto_personal"
  | "pago_proveedor"
  | "pago_empleado"
  | "ingreso_manual"
  | "egreso_manual"
  | "retiro"
  | "ajuste"
  | "transferencia_interna";

export type MetodoPago =
  | "efectivo"
  | "transferencia"
  | "deuna"
  | "tarjeta"
  | "mixto";


export type CajaMovimiento = {
  id: string;
  caja_id: string;

  tipo: CajaMovimientoTipo;
  categoria: CajaMovimientoCategoria;

  monto: number;
  descripcion: string | null;

  referencia_tipo: string | null;
  referencia_id: string | null;

  metodo_pago: MetodoPago;

  cuenta: CuentaDinero;
  origen_fondo: OrigenFondo;
  naturaleza: NaturalezaMovimiento;
  cuenta_destino?: CuentaDinero | null;

  creado_por: string;

  created_at: string;
};

export type CajaAperturaFormData = {
  monto_apertura: string;
  observaciones: string;
};

export type CajaCierreFormData = {
  monto_cierre: string;
  observaciones: string;
};

export type CajaMovimientoFormData = {
  tipo: CajaMovimientoTipo;
  categoria: CajaMovimientoCategoria;
  monto: string;
  descripcion: string;
  metodo_pago: MetodoPago;
  cuenta: CuentaDinero;
  origen_fondo: OrigenFondo;
  naturaleza: NaturalezaMovimiento;
  cuenta_destino?: CuentaDinero;
};

export type OrdenPago = {
  id: string;
  orden_id: string;
  caja_id: string;
  monto: number;
  metodo_pago: MetodoPago;
  referencia: string | null;
  observacion: string | null;
  creado_por: string;
  created_at: string;
  cuenta: CuentaDinero;
  origen_fondo: OrigenFondo;
  naturaleza: NaturalezaMovimiento;
};

export type MetodoPagoProveedor =
  | "efectivo"
  | "transferencia"
  | "deuna"
  | "tarjeta"
  | "mixto";

export type EstadoPagoFacturaCompra =
  | "pendiente"
  | "parcial"
  | "pagado";

export type PagoProveedor = {
  id: string;
  factura_compra_id: string;
  proveedor_id: string;
  fecha: string;
  monto: number;
  metodo_pago: MetodoPagoProveedor;
  afecta_caja: boolean;
  caja_id: string | null;
  observaciones: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  cuenta: CuentaDinero;
  origen_fondo: OrigenFondo;
  naturaleza: NaturalezaMovimiento;
};

export type CrearPagoProveedorInput = {
  factura_compra_id: string;
  proveedor_id: string;
  fecha: string;
  monto: number;
  metodo_pago?: MetodoPagoProveedor;
  afecta_caja?: boolean;
  observaciones?: string;
  cuenta?: CuentaDinero;
  origen_fondo?: OrigenFondo;
  naturaleza?: NaturalezaMovimiento;
};

export type Proveedor = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  ruc: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type FacturaCompra = {
  id: string;
  proveedor_id: string;
  numero_factura: string;
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;

  estado: "pendiente" | "confirmada" | "error";

  estado_pago: EstadoPagoFacturaCompra;
  total_pagado: number;
  saldo_pendiente: number;
  fecha_pago: string | null;
  archivo_url: string | null;
  archivo_nombre: string | null;
  origen: "manual" | "email" | "xml";
  hash_documento: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
};

export type PagoProveedorFormData = {
  fecha: string;
  monto: string;
  metodo_pago: MetodoPagoProveedor;
  afecta_caja: boolean;
  observaciones: string;
  cuenta: CuentaDinero;
  origen_fondo: OrigenFondo;
  naturaleza: NaturalezaMovimiento;
};

export type UnidadCompra = "unidad" | "caja" | "galon" | "cuarto";

export type FacturaCompraItemInput = {
  descripcion_original: string;
  producto_id?: string | null;

  cantidad: number;
  costo_unitario: number;

  unidad_compra?: UnidadCompra;
  factor_conversion?: number;
  cantidad_base?: number;

  subtotal?: number;
  iva?: number;
  total?: number;
};

export type ProductoLite = {
  id: string;
  nombre: string;
  categoria: string;
  marca: string | null;
  stock: number;
  precio_compra: number;
  precio_venta: number;
  activo: boolean;
};

export type CrearProveedorInput = {
  nombre: string;
  email?: string;
  telefono?: string;
  ruc?: string;
};

export type CrearFacturaCompraInput = {
  proveedor_id: string;
  numero_factura: string;
  fecha: string;
  subtotal?: number;
  iva?: number;
  total?: number;
  archivo_url?: string;
  archivo_nombre?: string;
  origen?: "manual" | "email" | "xml";
  hash_documento?: string;
  observaciones?: string;
  items: FacturaCompraItemInput[];
};

export type FacturaImportItem = {
  descripcion_original: string;
  cantidad: number;
  costo_unitario: number;

  unidad_compra?: UnidadCompra;
  factor_conversion?: number;
  cantidad_base?: number;

  subtotal: number;
  iva: number;
  total: number;
  producto_id?: string | null;
};

export type FacturaImportPreview = {
  proveedor_nombre: string;
  proveedor_ruc: string | null;
  numero_factura: string;
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  items: FacturaImportItem[];
};