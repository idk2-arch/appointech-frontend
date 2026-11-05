export type MetodoPago = 'EFECTIVO' | 'EN_LINEA';

export type EstadoPago = 'PENDIENTE' | 'PAGADO' | 'FALLIDO';

/** Estado de cobro de una cita finalizada del técnico: antes del costo final aún no hay pago. */
export type EstadoPagoFinalizada = 'SIN_COSTO_FINAL' | 'PENDIENTE' | 'PAGADO';

/** Todo estado de cobro que la interfaz sabe mostrar. */
export type EstadoPagoVisible = EstadoPago | EstadoPagoFinalizada;

/** GET /especialidades/{id}/cotizacion y GET /citas/{id}/cotizacion. Sin costo de referencia, `disponible` es false. */
export interface Cotizacion {
  especialidadId: number;
  especialidad: string;
  montoEstimado: number | null;
  moneda: string;
  disponible: boolean;
  nota: string | null;
}

/** Respuesta de todas las acciones sobre el pago de una cita (PagoResponse). */
export interface Pago {
  citaId: number;
  montoCotizado: number | null;
  montoFinal: number | null;
  metodo: MetodoPago | null;
  estado: EstadoPago;
  referencia: string | null;
  pagadoEn: string | null;
  diferenciaSignificativa: boolean;
  porcentajeDiferencia: number | null;
  /** Solo viene al elegir pago en línea: a esa dirección se redirige el navegador. */
  urlPago: string | null;
}

/** GET /citas/{id}/comprobante: solo existe cuando el pago está PAGADO. */
export interface Comprobante {
  numero: string;
  emitidoEn: string;
  citaId: number;
  cliente: string;
  tecnico: string;
  especialidad: string;
  monto: number;
  moneda: string;
  metodo: MetodoPago;
  referencia: string | null;
  pagadoEn: string;
}

export interface CostoFinalRequest {
  monto: number;
}

export interface MetodoPagoRequest {
  metodo: MetodoPago;
}

export interface SincronizarPagoRequest {
  /** Opcional: sin él, el backend consulta por la referencia guardada en el pago. */
  idTransaccion?: string;
}
