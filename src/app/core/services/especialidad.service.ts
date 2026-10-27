import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { RespuestaEnvuelta } from '../models/respuesta-envuelta';

export interface EspecialidadAdminResponse {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  tecnicosAsignados: number;
}

export interface CrearEspecialidadRequest {
  nombre: string;
  descripcion: string;
}

export interface CambiarEstadoEspecialidadRequest {
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class EspecialidadService {
  constructor(private http: HttpClient) {}

  obtenerCatalogoAdmin(): Observable<EspecialidadAdminResponse[]> {
    return this.http
      .get<RespuestaEnvuelta<EspecialidadAdminResponse[]>>(`${API_BASE_URL}/admin/especialidades`)
      .pipe(map((respuesta) => respuesta.datos));
  }

  crearEspecialidad(request: CrearEspecialidadRequest): Observable<EspecialidadAdminResponse> {
    return this.http
      .post<RespuestaEnvuelta<EspecialidadAdminResponse>>(`${API_BASE_URL}/admin/especialidades`, request)
      .pipe(map((respuesta) => respuesta.datos));
  }

  cambiarEstadoEspecialidad(
    id: number,
    request: CambiarEstadoEspecialidadRequest
  ): Observable<EspecialidadAdminResponse> {
    return this.http
      .patch<RespuestaEnvuelta<EspecialidadAdminResponse>>(`${API_BASE_URL}/admin/especialidades/${id}/estado`, request)
      .pipe(map((respuesta) => respuesta.datos));
  }
}
