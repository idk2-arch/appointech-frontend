import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { Cita } from '../models/cita';

/** Fechas en LocalDateTime sin zona (hora local de Colombia). */
export interface SolicitudManualAdmin {
  id: number;
  clienteId: number;
  clienteNombre: string;
  clienteApellido: string;
  telefono: string | null;
  direccionServicio: string;
  descripcionProblema: string;
  especialidadId: number;
  especialidadNombre: string;
  latitud: number | null;
  longitud: number | null;
  creadaEn: string;
}

export interface AsignarSolicitudManualRequest {
  tecnicoId: number;
  fechaHoraInicio: string;
  fechaHoraFin: string;
}

/** Solicitudes de clientes fuera de la cobertura automática, que un administrador coordina. */
@Injectable({ providedIn: 'root' })
export class SolicitudManualAdminService {
  constructor(private http: HttpClient) {}

  /** GET /admin/solicitudes-manuales devuelve el arreglo directo. */
  listar(): Observable<SolicitudManualAdmin[]> {
    return this.http.get<SolicitudManualAdmin[]>(`${API_BASE_URL}/admin/solicitudes-manuales`);
  }

  /** PATCH /admin/solicitudes-manuales/{id}/asignar responde la cita ya agendada. */
  asignar(id: number, request: AsignarSolicitudManualRequest): Observable<Cita> {
    return this.http.patch<Cita>(`${API_BASE_URL}/admin/solicitudes-manuales/${id}/asignar`, request);
  }
}
