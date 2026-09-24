import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export type TipoDocumento = 'CC' | 'CE' | 'PASAPORTE';

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

  obtenerUsuarios(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(`${API_BASE_URL}/admin/usuarios`);
  }

  crearAdministrador(request: CrearAdministradorRequest): Observable<UsuarioAdmin> {
    return this.http.post<UsuarioAdmin>(`${API_BASE_URL}/admin/usuarios`, request);
  }

  actualizarUsuario(id: number, request: ActualizarUsuarioRequest): Observable<UsuarioAdmin> {
    return this.http.patch<UsuarioAdmin>(`${API_BASE_URL}/admin/usuarios/${id}`, request);
  }

  cambiarEstadoUsuario(id: number, request: CambiarEstadoUsuarioRequest): Observable<UsuarioAdmin> {
    return this.http.patch<UsuarioAdmin>(`${API_BASE_URL}/admin/usuarios/${id}/estado`, request);
  }
}
