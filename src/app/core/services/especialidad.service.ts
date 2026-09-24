import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

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
    return this.http.get<EspecialidadAdminResponse[]>(`${API_BASE_URL}/admin/especialidades`);
  }

  crearEspecialidad(request: CrearEspecialidadRequest): Observable<EspecialidadAdminResponse> {
    return this.http.post<EspecialidadAdminResponse>(`${API_BASE_URL}/admin/especialidades`, request);
  }

  cambiarEstadoEspecialidad(
    id: number,
    request: CambiarEstadoEspecialidadRequest
  ): Observable<EspecialidadAdminResponse> {
    return this.http.patch<EspecialidadAdminResponse>(`${API_BASE_URL}/admin/especialidades/${id}/estado`, request);
  }
}
