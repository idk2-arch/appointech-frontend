import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { Calificacion, CalificarServicioRequest } from '../models/calificacion';

/** Calificación de los servicios finalizados del cliente autenticado. */
@Injectable({ providedIn: 'root' })
export class CalificacionService {
  constructor(private http: HttpClient) {}

  /** 404 si la cita todavía no tiene calificación. */
  obtener(citaId: number): Observable<Calificacion> {
    return this.http.get<Calificacion>(`${API_BASE_URL}/cliente/citas/${citaId}/calificacion`);
  }

  /** Solo citas finalizadas, una vez y dentro del plazo; si no, el backend responde 409 con el motivo. */
  calificar(citaId: number, cuerpo: CalificarServicioRequest): Observable<Calificacion> {
    return this.http.post<Calificacion>(`${API_BASE_URL}/cliente/citas/${citaId}/calificacion`, cuerpo);
  }
}
