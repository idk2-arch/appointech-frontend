export type CategoriaNotificacion = 'pago' | 'calificacion' | 'cita' | 'general';

/**
 * Icono de una notificación según su tipo. El contrato no lista los tipos, así que se reconoce por el texto
 * (p. ej. PAGO_RECIBIDO, CITA_CANCELADA); lo que no se reconozca usa el icono general.
 */
export function categoriaNotificacion(tipo: string | null | undefined): CategoriaNotificacion {
  const t = (tipo ?? '').toUpperCase();
  if (t.includes('PAGO') || t.includes('COSTO')) return 'pago';
  if (t.includes('CALIFIC')) return 'calificacion';
  if (t.includes('CITA') || t.includes('SOLICITUD') || t.includes('REPROGRAM') || t.includes('CANCEL')) return 'cita';
  return 'general';
}

/** Detalle de la cita para cada rol; el técnico no tiene pantalla de detalle, así que no hay ruta. */
export function rutaDeCita(rol: string | null | undefined, citaId: number | null | undefined): string[] | null {
  if (!citaId) return null;
  if (rol === 'CLIENTE') return ['/cliente/citas', String(citaId)];
  if (rol === 'ADMINISTRADOR') return ['/admin/citas', String(citaId)];
  return null;
}
