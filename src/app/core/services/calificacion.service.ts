import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { Calificacion, CalificarServicioRequest } from '../models/calificacion';
import { SesionService } from './sesion.service';

/** Calificación de los servicios finalizados del cliente autenticado. */
@Injectable({ providedIn: 'root' })
export class CalificacionService {
  /** Lo ya consultado en esta sesión (null = sin calificar): recrear la lista no vuelve a pedirlo. */
  private readonly cache = new Map<number, Calificacion | null>();
  /** Consultas en camino: dos pedidos del mismo id a la vez comparten una sola petición. */
  private readonly enVuelo = new Map<number, Observable<Calificacion | null>>();

  constructor(
    private http: HttpClient,
    sesion: SesionService
  ) {
    sesion.limpiado$.subscribe(() => this.cache.clear());
  }

  /**
   * GET de la calificación de una cita, con caché de sesión. El backend responde 404 cuando aún no hay calificación:
   * aquí eso es lo normal y se entrega como `null` ("sin calificar"); cualquier otro error sigue siendo error.
   */
  obtener(citaId: number): Observable<Calificacion | null> {
    if (this.cache.has(citaId)) return of(this.cache.get(citaId) ?? null);
    const pendiente = this.enVuelo.get(citaId);
    if (pendiente) return pendiente;

    const consulta = this.http.get<Calificacion>(`${API_BASE_URL}/cliente/citas/${citaId}/calificacion`).pipe(
      map((calificacion): Calificacion | null => calificacion),
      catchError((err: unknown) => (err instanceof HttpErrorResponse && err.status === 404 ? of(null) : throwError(() => err))),
      tap((calificacion) => this.cache.set(citaId, calificacion)),
      finalize(() => this.enVuelo.delete(citaId)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.enVuelo.set(citaId, consulta);
    return consulta;
  }

  /** Solo citas finalizadas, una vez y dentro del plazo; si no, el backend responde 409 con el motivo. */
  calificar(citaId: number, cuerpo: CalificarServicioRequest): Observable<Calificacion> {
    return this.http
      .post<Calificacion>(`${API_BASE_URL}/cliente/citas/${citaId}/calificacion`, cuerpo)
      .pipe(tap((calificacion) => this.cache.set(citaId, calificacion)));
  }

  /** "Ya calificada" (409) o una consulta que se quiere repetir: se olvida lo guardado de esa cita. */
  olvidar(citaId: number): void {
    this.cache.delete(citaId);
  }
}
