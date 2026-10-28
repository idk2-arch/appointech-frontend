import { Pipe, PipeTransform } from '@angular/core';

import { parsearFechaLocal } from '../../core/utils/fecha-local';

export type FormatoFechaLocal = 'hora' | 'dia' | 'diaSemana' | 'mes' | 'fecha' | 'fechaCorta' | 'fechaHora';

const FORMATOS: Record<FormatoFechaLocal, Intl.DateTimeFormatOptions> = {
  hora: { hour: 'numeric', minute: '2-digit', hour12: true },
  dia: { day: 'numeric' },
  diaSemana: { weekday: 'short' },
  mes: { month: 'short' },
  fecha: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  fechaCorta: { weekday: 'short', day: 'numeric', month: 'short' },
  fechaHora: {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  },
};

/**
 * Formatea un LocalDateTime del backend ("2026-10-13T08:00:00") o una fecha
 * "2026-10-13" en español, tal cual llega: sin conversión de zona horaria.
 */
@Pipe({
  name: 'fechaLocal',
  standalone: false,
})
export class FechaLocalPipe implements PipeTransform {
  transform(valor: string | null | undefined, formato: FormatoFechaLocal = 'fechaHora'): string {
    if (!valor) return '';
    // Acepta también una hora suelta ("08:00:00") por si el backend no la manda con fecha.
    const fecha = parsearFechaLocal(/^\d{1,2}:\d{2}/.test(valor) ? `1970-01-01T${valor}` : valor);
    if (Number.isNaN(fecha.getTime())) return valor;
    return new Intl.DateTimeFormat('es-CO', FORMATOS[formato]).format(fecha);
  }
}
