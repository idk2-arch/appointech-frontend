import type { EstadoPagoVisible, MetodoPago } from '../models/pago';

/** Cada estado lleva un símbolo propio para que no dependa solo del color. */
const PRESENTACION_ESTADO: Record<EstadoPagoVisible, { etiqueta: string; simbolo: string; clase: string }> = {
  SIN_COSTO_FINAL: { etiqueta: 'Sin costo final', simbolo: '!', clase: 'border-orange-300/50 bg-orange-300/15 text-orange-200' },
  PENDIENTE: { etiqueta: 'Pendiente', simbolo: '◔', clase: 'border-amber-300/40 bg-amber-300/10 text-amber-200' },
  PAGADO: { etiqueta: 'Pagado', simbolo: '✓', clase: 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200' },
  FALLIDO: { etiqueta: 'Fallido', simbolo: '✕', clase: 'border-rose-300/40 bg-rose-300/10 text-rose-200' },
};

export function etiquetaEstadoPago(estado: EstadoPagoVisible): string {
  return PRESENTACION_ESTADO[estado]?.etiqueta ?? estado;
}

export function simboloEstadoPago(estado: EstadoPagoVisible): string {
  return PRESENTACION_ESTADO[estado]?.simbolo ?? '';
}

/** Colores de la insignia de cada estado (clases de Tailwind). */
export function claseInsigniaEstadoPago(estado: EstadoPagoVisible): string {
  return (PRESENTACION_ESTADO[estado] ?? PRESENTACION_ESTADO.PENDIENTE).clase;
}

const ETIQUETAS_METODO: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  EN_LINEA: 'En línea',
};

export function etiquetaMetodoPago(metodo: MetodoPago): string {
  return ETIQUETAS_METODO[metodo] ?? metodo;
}
