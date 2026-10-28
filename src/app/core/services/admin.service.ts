import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { RespuestaEnvuelta } from '../models/respuesta-envuelta';
import { desenvolverRespuesta } from '../utils/respuesta';

import type { TipoDocumento } from './auth.service';

export type { TipoDocumento };

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string | null;
  tipoDocumento: TipoDocumento | null;
  numeroDocumento: string | null;
  rol: string;
  activo: boolean;
  creadoEn: string;
  fotoUrl?: string | null;
}

export interface CrearAdministradorRequest {
  nombre: string;
  apellido: string;
  correo: string;
  contrasena: string;
  telefono?: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento?: string;
}

export interface ActualizarUsuarioRequest {
  nombre: string;
  apellido: string;
  telefono: string;
}

export interface CambiarEstadoUsuarioRequest {
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  /** GET /admin/usuarios devuelve el arreglo directo (sin ApiResponse). */
  obtenerUsuarios(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(`${API_BASE_URL}/admin/usuarios`);
  }

  // Formato de las escrituras no confirmado: se aceptan ambos (envuelto o directo).
  crearAdministrador(request: CrearAdministradorRequest): Observable<UsuarioAdmin> {
    return this.http
      .post<UsuarioAdmin | RespuestaEnvuelta<UsuarioAdmin>>(`${API_BASE_URL}/admin/usuarios`, request)
      .pipe(map(desenvolverRespuesta));
  }

  actualizarUsuario(id: number, request: ActualizarUsuarioRequest): Observable<UsuarioAdmin> {
    return this.http
      .patch<UsuarioAdmin | RespuestaEnvuelta<UsuarioAdmin>>(`${API_BASE_URL}/admin/usuarios/${id}`, request)
      .pipe(map(desenvolverRespuesta));
  }

  cambiarEstadoUsuario(id: number, request: CambiarEstadoUsuarioRequest): Observable<UsuarioAdmin> {
    return this.http
      .patch<UsuarioAdmin | RespuestaEnvuelta<UsuarioAdmin>>(`${API_BASE_URL}/admin/usuarios/${id}/estado`, request)
      .pipe(map(desenvolverRespuesta));
  }
}
