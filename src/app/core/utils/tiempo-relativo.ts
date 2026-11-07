const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

/**
 * "hace 5 min", "hace 2 h", "ayer", "hace 3 días"; pasada una semana, la fecha corta.
 * `fecha` es un LocalDateTime sin zona. Una fecha ilegible da cadena vacía.
 */
export function tiempoRelativo(fecha: string | null | undefined, ahora: Date = new Date()): string {
  if (!fecha) return '';
  const momento = new Date(fecha);
  if (Number.isNaN(momento.getTime())) return '';
  const diferencia = ahora.getTime() - momento.getTime();

  if (diferencia < MIN) return 'justo ahora';
  if (diferencia < HORA) return `hace ${Math.floor(diferencia / MIN)} min`;
  if (diferencia < DIA) return `hace ${Math.floor(diferencia / HORA)} h`;
  const dias = Math.floor(diferencia / DIA);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  const mismoAnio = momento.getFullYear() === ahora.getFullYear();
  return momento.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: mismoAnio ? undefined : 'numeric' });
}
