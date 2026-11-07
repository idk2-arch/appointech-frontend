import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { FiltroNotificaciones, Notificacion } from '../models/notificacion';
import type { PaginaServidor } from '../models/pagina-servidor';
import { aPaginaServidor, construirParametros } from '../utils/total-count';

/** Notificaciones de la persona con sesión (cliente, técnico o administrador). */
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  constructor(private http: HttpClient) {}

  /** GET /notificaciones: arreglo en el cuerpo y total en X-Total-Count; lo más reciente primero. */
  listar(filtro: FiltroNotificaciones = {}): Observable<PaginaServidor<Notificacion>> {
    const { soloNoLeidas, page, size } = filtro;
    return this.http
      .get<Notificacion[]>(`${API_BASE_URL}/notificaciones`, {
        params: construirParametros({ soloNoLeidas: soloNoLeidas ? 'true' : null, page, size }),
        observe: 'response',
      })
      .pipe(map((respuesta) => aPaginaServidor(respuesta)));
  }

  /** GET /notificaciones/no-leidas/conteo. */
  contarNoLeidas(): Observable<number> {
    return this.http.get<{ total: number }>(`${API_BASE_URL}/notificaciones/no-leidas/conteo`).pipe(map((r) => r.total));
  }

  /** PATCH /notificaciones/{id}/leida. */
  marcarLeida(id: number): Observable<unknown> {
    return this.http.patch(`${API_BASE_URL}/notificaciones/${id}/leida`, {});
  }

  /** PATCH /notificaciones/leer-todas: cuántas se actualizaron. */
  marcarTodasLeidas(): Observable<number> {
    return this.http.patch<{ actualizadas: number }>(`${API_BASE_URL}/notificaciones/leer-todas`, {}).pipe(map((r) => r.actualizadas));
  }
}
