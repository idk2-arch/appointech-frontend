import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { CrearSolicitudRequest, SolicitudServicio } from '../models/cita';

@Injectable({ providedIn: 'root' })
export class SolicitudService {
  constructor(private http: HttpClient) {}

  crearSolicitud(request: CrearSolicitudRequest): Observable<SolicitudServicio> {
    return this.http.post<SolicitudServicio>(`${API_BASE_URL}/solicitudes`, request);
  }
}
