import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, of, tap, timeout } from 'rxjs';

import { GEOAPIFY_URL, GEOCODIFICACION_TIMEOUT_MS } from '../config/api.config';
import { GEOAPIFY_API_KEY } from '../config/geoapify.config';
import { BuscadorDirecciones, GeocodificadorInverso, ResultadoDireccion } from './geocodificacion';

/** Respuesta GeoJSON de Geoapify (autocomplete y reverse). */
interface RespuestaGeoapify {
  features?: {
    properties?: { formatted?: string; lat?: number; lon?: number; place_id?: string };
    geometry?: { coordinates?: [number, number] };
  }[];
}

/**
 * Implementación de la geocodificación con Geoapify. Los componentes dependen de
 * `BuscadorDirecciones` y `GeocodificadorInverso` (ver AppModule); para cambiar de
 * proveedor basta con otra clase que las implemente.
 */
@Injectable({ providedIn: 'root' })
export class GeocodificacionService implements BuscadorDirecciones, GeocodificadorInverso {
  private readonly cacheSugerencias = new Map<string, ResultadoDireccion[]>();
  private readonly cacheInversa = new Map<string, string | null>();

  constructor(private http: HttpClient) {}

  /** Texto escrito → hasta 5 direcciones de Colombia. Lanza error si falla la red. */
  sugerirDirecciones(texto: string): Observable<ResultadoDireccion[]> {
    const consulta = texto.trim();
    if (!consulta) return of([]);

    const clave = consulta.toLowerCase();
    const guardado = this.cacheSugerencias.get(clave);
    if (guardado) return of(guardado);

    const params = new HttpParams()
      .set('text', consulta)
      .set('filter', 'countrycode:co')
      .set('bias', 'countrycode:co')
      .set('lang', 'es')
      .set('limit', 5)
      .set('apiKey', GEOAPIFY_API_KEY);

    return this.http.get<RespuestaGeoapify>(`${GEOAPIFY_URL}/autocomplete`, { params }).pipe(
      timeout(GEOCODIFICACION_TIMEOUT_MS),
      map((respuesta) => this.aResultados(respuesta)),
      tap((resultados) => this.cacheSugerencias.set(clave, resultados))
    );
  }

  /** Punto del mapa → dirección en texto, o null si no se conoce. */
  buscarPorCoordenadas(latitud: number, longitud: number): Observable<string | null> {
    const clave = `${latitud.toFixed(5)},${longitud.toFixed(5)}`;
    if (this.cacheInversa.has(clave)) return of(this.cacheInversa.get(clave) ?? null);

    const params = new HttpParams()
      .set('lat', latitud)
      .set('lon', longitud)
      .set('lang', 'es')
      .set('apiKey', GEOAPIFY_API_KEY);

    return this.http.get<RespuestaGeoapify>(`${GEOAPIFY_URL}/reverse`, { params }).pipe(
      timeout(GEOCODIFICACION_TIMEOUT_MS),
      map((respuesta) => this.aResultados(respuesta)[0]?.nombre ?? null),
      tap((direccion) => this.cacheInversa.set(clave, direccion))
    );
  }

  private aResultados(respuesta: RespuestaGeoapify): ResultadoDireccion[] {
    const resultados: ResultadoDireccion[] = [];
    for (const [indice, f] of (respuesta?.features ?? []).entries()) {
      const p = f.properties;
      // Orden: latitud primero, longitud después (GeoJSON trae [lon, lat]).
      const latitud = Number(p?.lat ?? f.geometry?.coordinates?.[1]);
      const longitud = Number(p?.lon ?? f.geometry?.coordinates?.[0]);
      if (!p?.formatted || !Number.isFinite(latitud) || !Number.isFinite(longitud)) continue;
      resultados.push({ id: p.place_id ?? String(indice), nombre: p.formatted, latitud, longitud });
    }
    return resultados;
  }
}
