import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { PedirSugerenciaRequest, RedaccionTecnica, SugerenciaPreDiagnostico } from '../models/cita';

/** Tiempo máximo de espera de la IA; pasado este límite la petición se corta y se trata como no disponible. */
export const ESPERA_MAXIMA_PREDIAGNOSTICO_MS = 20_000;

/** Ayudas de IA para describir el problema (rol CLIENTE). El token lo agrega el interceptor. */
@Injectable({ providedIn: 'root' })
export class PreDiagnosticoService {
  constructor(private http: HttpClient) {}

  sugerir(request: PedirSugerenciaRequest): Observable<SugerenciaPreDiagnostico> {
    return this.http
      .post<SugerenciaPreDiagnostico>(`${API_BASE_URL}/solicitudes/pre-diagnostico`, request)
      .pipe(timeout(ESPERA_MAXIMA_PREDIAGNOSTICO_MS));
  }

  /** Reescribe la descripción del cliente en lenguaje técnico; mismas reglas de espera que `sugerir`. */
  redactarTecnico(request: PedirSugerenciaRequest): Observable<RedaccionTecnica> {
    return this.http
      .post<RedaccionTecnica>(`${API_BASE_URL}/solicitudes/redactar-tecnico`, request)
      .pipe(timeout(ESPERA_MAXIMA_PREDIAGNOSTICO_MS));
  }
}
