import { HttpParams, HttpResponse } from '@angular/common/http';

import type { PaginaServidor } from '../models/pagina-servidor';

export const ENCABEZADO_TOTAL = 'X-Total-Count';

/**
 * Convierte la respuesta de un listado paginado (arreglo en el cuerpo y total en X-Total-Count) en una página.
 * Si el encabezado falta o no es un número, el total es lo recibido.
 */
export function aPaginaServidor<T>(respuesta: HttpResponse<T[]>): PaginaServidor<T> {
  const filas = Array.isArray(respuesta.body) ? respuesta.body : [];
  const total = Number.parseInt(respuesta.headers.get(ENCABEZADO_TOTAL) ?? '', 10);
  return { filas, total: Number.isNaN(total) ? filas.length : total };
}

/** Parámetros de consulta sin los vacíos: lo que es null, undefined o '' no se envía. */
export function construirParametros(filtro: Record<string, string | number | null | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(filtro)) {
    if (valor !== null && valor !== undefined && valor !== '') params = params.set(clave, valor);
  }
  return params;
}
