import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Cita, ConfirmarCitaRequest, SolicitudManualRequest } from '../models/cita';

@Injectable({ providedIn: 'root' })
export class CitaService {
  constructor(private http: HttpClient) {}

  confirmarCita(request: ConfirmarCitaRequest): Observable<Cita> {
    return this.http.post<Cita>(`${API_BASE_URL}/citas/confirmar`, request);
  }

  /** POST /citas/solicitud-manual responde 201: el administrador coordinará la visita. */
  solicitarAgendamientoManual(request: SolicitudManualRequest): Observable<Cita> {
    return this.http.post<Cita>(`${API_BASE_URL}/citas/solicitud-manual`, request);
  }
}
