import { parsearFechaLocal } from './fecha-local';

const FORMATO_UN_DECIMAL = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const FORMATO_ENTERO = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const FORMATO_DIA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

/** Porcentaje con un decimal siempre: 5 → "5,0 %". */
export function formatearTasa(porcentaje: number | null | undefined): string {
  return typeof porcentaje === 'number' && !Number.isNaN(porcentaje) ? `${FORMATO_UN_DECIMAL.format(porcentaje)} %` : '';
}

/** Promedio con un decimal: 5 → "5,0"; sin promedio (null), "Sin calificaciones". */
export function formatearPromedio(promedio: number | null | undefined): string {
  return typeof promedio === 'number' && !Number.isNaN(promedio) ? FORMATO_UN_DECIMAL.format(promedio) : 'Sin calificaciones';
}

/** Cantidad entera con separador de miles: 1250 → "1.250". */
export function formatearCantidad(cantidad: number | null | undefined): string {
  return typeof cantidad === 'number' && !Number.isNaN(cantidad) ? FORMATO_ENTERO.format(cantidad) : '';
}

/** "2026-10-08" → "8 oct 2026". Devuelve el texto tal cual si no es una fecha. */
export function formatearDia(fecha: string): string {
  const valor = parsearFechaLocal(fecha);
  return Number.isNaN(valor.getTime()) ? fecha : FORMATO_DIA.format(valor).replace(/\./g, '').replace(/ de /g, ' ');
}
