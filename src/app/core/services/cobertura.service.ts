import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export interface Cobertura {
  radioMaximoKm: number;
  /** WhatsApp del administrador, solo dígitos con prefijo del país; null si no hay. */
  telefonoWhatsappAdmin?: string | null;
}

/** Distancia máxima de atención automática (1 a 100 km). Solo administradores. */
@Injectable({ providedIn: 'root' })
export class CoberturaService {
  constructor(private http: HttpClient) {}

  /** GET /admin/configuracion/cobertura responde el objeto directo. */
  obtener(): Observable<Cobertura> {
    return this.http.get<Cobertura>(`${API_BASE_URL}/admin/configuracion/cobertura`);
  }

  /** PUT /admin/configuracion/cobertura responde el valor guardado. */
  actualizar(request: Cobertura): Observable<Cobertura> {
    return this.http.put<Cobertura>(`${API_BASE_URL}/admin/configuracion/cobertura`, request);
  }
}
