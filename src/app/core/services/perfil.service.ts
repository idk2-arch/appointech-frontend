import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { ActualizarPerfilRequest, Perfil } from '../models/perfil';

/** Perfil de la persona con sesión iniciada; es el mismo para cliente, técnico y administrador. */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  constructor(private http: HttpClient) {}

  obtener(): Observable<Perfil> {
    return this.http.get<Perfil>(`${API_BASE_URL}/perfil`);
  }

  /** Edita solo nombre, apellido, teléfono y dirección. Responde el perfil ya actualizado. */
  actualizar(solicitud: ActualizarPerfilRequest): Observable<Perfil> {
    return this.http.put<Perfil>(`${API_BASE_URL}/perfil`, solicitud);
  }
}
