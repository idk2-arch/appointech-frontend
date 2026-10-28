import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { DetalleCita } from '../models/cita';
import type { FiltroCitasAdmin, PaginaCitasAdmin } from '../models/cita-admin';

@Injectable({ providedIn: 'root' })
export class CitaAdminService {
  constructor(private http: HttpClient) {}

  obtener(id: number): Observable<DetalleCita> {
    return this.http.get<DetalleCita>(`${API_BASE_URL}/admin/citas/${id}`);
  }

  /** Citas de todos los técnicos, paginadas; los filtros vacíos no se envían. */
  listar(filtro: FiltroCitasAdmin = {}): Observable<PaginaCitasAdmin> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtro)) {
      if (valor !== null && valor !== undefined && valor !== '') params = params.set(clave, valor);
    }
    return this.http.get<PaginaCitasAdmin>(`${API_BASE_URL}/admin/citas`, { params });
  }
}
