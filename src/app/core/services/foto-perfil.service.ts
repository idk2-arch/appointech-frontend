import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { FotoRequest, FotoResponse } from '../models/foto';

/** Fotos de perfil: la propia (cualquier rol) y la de otro usuario (solo administrador). */
@Injectable({ providedIn: 'root' })
export class FotoPerfilService {
  constructor(private http: HttpClient) {}

  subirPropia(imagenBase64: string): Observable<FotoResponse> {
    const cuerpo: FotoRequest = { imagenBase64 };
    return this.http.put<FotoResponse>(`${API_BASE_URL}/perfil/foto`, cuerpo);
  }

  /** Responde 204 sin cuerpo. */
  quitarPropia(): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/perfil/foto`);
  }

  subirDeUsuario(usuarioId: number, imagenBase64: string): Observable<FotoResponse> {
    const cuerpo: FotoRequest = { imagenBase64 };
    return this.http.put<FotoResponse>(`${API_BASE_URL}/admin/usuarios/${usuarioId}/foto`, cuerpo);
  }
}
