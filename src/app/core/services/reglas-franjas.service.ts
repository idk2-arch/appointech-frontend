import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

/** Las horas llegan como "08:00:00"; al enviarlas basta "HH:mm". */
export interface ReglasFranjasRequest {
  radioMaximoKm: number;
  duracionBloqueMinutos: number;
  horaInicioJornada: string;
  horaFinJornada: string;
}

export interface ReglasFranjas extends ReglasFranjasRequest {
  /** Verdadero si el cambio hace que las franjas ya ofrecidas dejen de poder confirmarse. */
  franjasOfrecidasInvalidadas?: boolean;
  advertencia?: string | null;
}

/** Reglas con las que se calculan las franjas de agendamiento (radio, duración del bloque y jornada). Solo administradores. */
@Injectable({ providedIn: 'root' })
export class ReglasFranjasService {
  constructor(private http: HttpClient) {}

  obtener(): Observable<ReglasFranjas> {
    return this.http.get<ReglasFranjas>(`${API_BASE_URL}/admin/configuracion/franjas`);
  }

  /** Responde lo mismo que el GET; con `franjasOfrecidasInvalidadas` y `advertencia` si cambió la duración o la jornada. */
  actualizar(request: ReglasFranjasRequest): Observable<ReglasFranjas> {
    return this.http.put<ReglasFranjas>(`${API_BASE_URL}/admin/configuracion/franjas`, request);
  }
}
