import { parsearFechaLocal } from './fecha-local';

const MS_MINUTO = 60_000;
const MINUTOS_HORA = 60;
const HORAS_DIA = 24;

function minutosTranscurridos(desde: string, ahora: Date): number {
  const ms = ahora.getTime() - parsearFechaLocal(desde).getTime();
  return Math.max(0, Math.floor(ms / MS_MINUTO));
}

/** "Hace un momento", "Hace 5 min", "Hace 3 h", "Hace 1 día" o "Hace 2 días". */
export function tiempoTranscurrido(desde: string, ahora: Date): string {
  const minutos = minutosTranscurridos(desde, ahora);
  if (minutos < 1) return 'Hace un momento';
  if (minutos < MINUTOS_HORA) return `Hace ${minutos} min`;

  const horas = Math.floor(minutos / MINUTOS_HORA);
  if (horas < HORAS_DIA) return `Hace ${horas} h`;

  const dias = Math.floor(horas / HORAS_DIA);
  return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

/** true si pasaron más de `horas` horas (exactamente `horas` todavía no cuenta). */
export function esperaMasDeHoras(desde: string, ahora: Date, horas: number): boolean {
  return minutosTranscurridos(desde, ahora) > horas * MINUTOS_HORA;
}
