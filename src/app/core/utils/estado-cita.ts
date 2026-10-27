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
