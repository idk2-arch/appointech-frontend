import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { CitaResumen, DiagnosticoCita, DiagnosticoRequest, EstadoCita } from '../models/cita';

/** Acciones del técnico sobre sus citas: avanzar el estado, cancelar y registrar el diagnóstico. */
@Injectable({ providedIn: 'root' })
export class CitaTecnicoService {
  constructor(private http: HttpClient) {}

  /** CONFIRMADA → EN_CAMINO → EN_PROCESO → FINALIZADA; otra transición responde 409. */
  cambiarEstado(id: number, estado: EstadoCita): Observable<CitaResumen> {
    return this.http.patch<CitaResumen>(`${API_BASE_URL}/tecnico/citas/${id}/estado`, { estado });
  }

  /** El motivo es obligatorio (máx. 500). Desde CONFIRMADA, EN_CAMINO o EN_PROCESO. */
  cancelar(id: number, motivo: string): Observable<CitaResumen> {
    return this.http.post<CitaResumen>(`${API_BASE_URL}/tecnico/citas/${id}/cancelar`, { motivo });
  }

  /** Crea o corrige el diagnóstico; solo con la cita EN_PROCESO. */
  guardarDiagnostico(id: number, request: DiagnosticoRequest): Observable<DiagnosticoCita> {
    return this.http.put<DiagnosticoCita>(`${API_BASE_URL}/tecnico/citas/${id}/diagnostico`, request);
  }
}
