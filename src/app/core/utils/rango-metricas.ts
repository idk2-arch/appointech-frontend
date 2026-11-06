import type { RangoSolicitado } from '../models/metricas';
import { aFechaIso } from './fecha-local';

export type PresetRango = 'ultimos30' | 'esteMes' | 'ultimos90' | 'esteAnio' | 'personalizado';

/** Lo máximo que acepta el servidor, contando el día inicial y el final. */
export const MAX_DIAS_RANGO = 366;
const MS_POR_DIA = 86_400_000;
const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Las fechas que se piden para cada rango rápido, contando hoy. "Últimos 30 días" no envía nada: es lo que el
 * servidor usa por defecto. El rango "personalizado" no tiene fechas propias: las elige la persona.
 */
export function rangoDePreset(preset: PresetRango, hoy: Date): RangoSolicitado {
  const fin = aFechaIso(hoy);
  switch (preset) {
    case 'esteMes':
      return { desde: aFechaIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: fin };
    case 'ultimos90':
      return { desde: aFechaIso(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 89)), hasta: fin };
    case 'esteAnio':
      return { desde: aFechaIso(new Date(hoy.getFullYear(), 0, 1)), hasta: fin };
    default:
      return {};
  }
}

/** Fecha YYYY-MM-DD a milisegundos UTC (sin horario de verano); null si no es una fecha de calendario real. */
function aUtc(fecha: string): number | null {
  const partes = FORMATO_FECHA.exec(fecha);
  if (!partes) return null;
  const [anio, mes, dia] = [Number.parseInt(partes[1], 10), Number.parseInt(partes[2], 10), Number.parseInt(partes[3], 10)];
  const utc = Date.UTC(anio, mes - 1, dia);
  const real = new Date(utc);
  return real.getUTCFullYear() === anio && real.getUTCMonth() === mes - 1 && real.getUTCDate() === dia ? utc : null;
}

/** Días del rango contando el inicial y el final; null si alguna fecha no es válida. */
export function diasDelRango(desde: string, hasta: string): number | null {
  const inicio = aUtc(desde);
  const fin = aUtc(hasta);
  return inicio === null || fin === null ? null : Math.round((fin - inicio) / MS_POR_DIA) + 1;
}

/** Mensaje si el rango no se puede pedir, o null si está bien. El servidor sigue siendo la autoridad. */
export function validarRango(desde: string, hasta: string): string | null {
  if (!desde || !hasta) return 'Elige la fecha inicial y la final.';
  const dias = diasDelRango(desde, hasta);
  if (dias === null) return 'Revisa las fechas: el formato no es válido.';
  if (dias < 1) return 'La fecha inicial no puede ser posterior a la fecha final.';
  if (dias > MAX_DIAS_RANGO) return `El rango no puede superar ${MAX_DIAS_RANGO} días.`;
  return null;
}
