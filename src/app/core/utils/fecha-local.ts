/**
 * El backend usa LocalDateTime sin zona horaria (hora local de Colombia), p. ej.
 * "2026-10-13T08:00:00". El Date se arma con sus componentes locales para que
 * nunca haya conversión a/desde UTC (no usar toISOString() ni new Date(string)).
 */
export function parsearFechaLocal(valor: string): Date {
  const [fecha, hora = '00:00:00'] = valor.split('T');
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [h, m, s] = hora.split(':');
  return new Date(anio, mes - 1, dia, Number(h) || 0, Number(m) || 0, Math.floor(Number(s) || 0));
}

/** Fecha de calendario local en formato YYYY-MM-DD. */
export function aFechaIso(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function hoyIso(): string {
  return aFechaIso(new Date());
}

/** Une una fecha "2026-10-13" y una hora "08:00" en un LocalDateTime sin zona: "2026-10-13T08:00:00". */
export function aFechaHoraLocal(fecha: string, hora: string): string {
  return `${fecha}T${hora.slice(0, 5)}:00`;
}

/** Fecha y hora para un <input type="datetime-local">: "2026-10-13T08:00" (sin segundos ni zona). */
export function aFechaHoraInput(fecha: Date): string {
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${aFechaIso(fecha)}T${hora}:${minutos}`;
}

/** Completa un valor de datetime-local con segundos para el backend: "2026-10-13T08:00" → "2026-10-13T08:00:00". */
export function aLocalDateTime(valorInput: string): string {
  return `${valorInput.slice(0, 16)}:00`;
}
