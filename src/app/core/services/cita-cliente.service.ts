import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { CitaResumen, DetalleCita } from '../models/cita';

/** Citas del cliente autenticado: consulta, cancelación y reprogramación. */
@Injectable({ providedIn: 'root' })
export class CitaClienteService {
  constructor(private http: HttpClient) {}

  /** Más recientes primero. */
  listar(): Observable<CitaResumen[]> {
    return this.http.get<CitaResumen[]>(`${API_BASE_URL}/cliente/citas`);
  }

  obtener(id: number): Observable<DetalleCita> {
    return this.http.get<DetalleCita>(`${API_BASE_URL}/cliente/citas/${id}`);
  }

  /** Solo PENDIENTE o CONFIRMADA. El motivo es opcional (máx. 500). */
  cancelar(id: number, motivo?: string): Observable<CitaResumen> {
    const cuerpo = motivo ? { motivo } : {};
    return this.http.post<CitaResumen>(`${API_BASE_URL}/cliente/citas/${id}/cancelar`, cuerpo);
  }

  /** `inicio` es un LocalDateTime sin zona, p. ej. 2026-11-04T14:00:00. */
  reprogramar(id: number, inicio: string): Observable<CitaResumen> {
    return this.http.post<CitaResumen>(`${API_BASE_URL}/cliente/citas/${id}/reprogramar`, { inicio });
  }
}
