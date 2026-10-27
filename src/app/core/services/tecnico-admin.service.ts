import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { RespuestaEnvuelta } from '../models/respuesta-envuelta';
import { ActualizarTecnicoRequest, CrearTecnicoRequest, TecnicoResponse } from './tecnico.service';

/** Escrituras de técnicos que solo puede hacer un administrador. */
@Injectable({ providedIn: 'root' })
export class TecnicoAdminService {
  constructor(private http: HttpClient) {}

  /** POST /admin/tecnicos responde 201 con la respuesta envuelta en ApiResponse. */
  crear(request: CrearTecnicoRequest): Observable<TecnicoResponse> {
    return this.http
      .post<RespuestaEnvuelta<TecnicoResponse>>(`${API_BASE_URL}/admin/tecnicos`, request)
      .pipe(map((respuesta) => respuesta.datos));
  }

  /** PATCH /admin/tecnicos/{id} (id del técnico, no del usuario) responde TecnicoResponse directo. */
  actualizar(tecnicoId: number, request: ActualizarTecnicoRequest): Observable<TecnicoResponse> {
    return this.http.patch<TecnicoResponse>(`${API_BASE_URL}/admin/tecnicos/${tecnicoId}`, request);
  }
}
