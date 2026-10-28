import type { EstadoCita } from '../models/cita';

const ETIQUETAS_ESTADO: Record<EstadoCita, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  EN_CAMINO: 'En camino',
  EN_PROCESO: 'En proceso',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

export function etiquetaEstadoCita(estado: EstadoCita): string {
  return ETIQUETAS_ESTADO[estado] ?? estado;
}

const CLASES_ESTADO: Record<EstadoCita, string> = {
  PENDIENTE: 'border-white/25 bg-white/10 text-white/80',
  CONFIRMADA: 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200',
  EN_CAMINO: 'border-sky-300/40 bg-sky-300/10 text-sky-200',
  EN_PROCESO: 'border-amber-300/40 bg-amber-300/10 text-amber-200',
  FINALIZADA: 'border-violet-300/40 bg-violet-300/10 text-violet-200',
  CANCELADA: 'border-rose-300/40 bg-rose-300/10 text-rose-200',
};

/** Colores de la insignia de cada estado (clases de Tailwind). */
export function claseInsigniaEstado(estado: EstadoCita): string {
  return CLASES_ESTADO[estado] ?? CLASES_ESTADO.PENDIENTE;
}
