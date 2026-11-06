import type { EstadoPago, MetodoPago } from './pago';

/** Una fila de GET /admin/pagos. `pagadoEn` es LocalDateTime sin zona. */
export interface FilaPagoAdmin {
  citaId: number;
  clienteId: number;
  clienteNombre: string;
  tecnicoId: number | null;
  tecnicoNombre: string | null;
  especialidad: string;
  montoCotizado: number | null;
  montoFinal: number | null;
  metodo: MetodoPago | null;
  estado: EstadoPago;
  pagadoEn: string | null;
  numeroComprobante: string | null;
}

/** Filtros opcionales; `desde` y `hasta` (YYYY-MM-DD) son inclusivos y dejan fuera los pagos sin fecha de pago. */
export interface FiltroPagosAdmin {
  estado?: EstadoPago | '' | null;
  metodo?: MetodoPago | '' | null;
  clienteId?: number | null;
  tecnicoId?: number | null;
  desde?: string | null;
  hasta?: string | null;
  page?: number;
  size?: number;
}
