export type TecnicoOption = {
  id: string;
  nombre: string;
};

export type ServicioSugerido = {
  servicio_id: string;
  nombre: string;
  veces: number;
};

export type ProductoRecordadoVehiculo = {
  producto_id: string;
  nombre_item: string;
  cantidad: number;
  precio_unitario: number;
  orden_id: string;
  orden_numero: string;
  fecha: string;
};

export type ProductosRecordadosVehiculoState = {
  aceite: ProductoRecordadoVehiculo | null;
  filtro: ProductoRecordadoVehiculo | null;
};