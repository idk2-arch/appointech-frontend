import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { BloqueIndisponibilidad, CrearBloqueRequest } from '../models/tecnico-agenda';

@Injectable({ providedIn: 'root' })
export class BloqueService {
  constructor(private http: HttpClient) {}

  crearBloque(request: CrearBloqueRequest): Observable<BloqueIndisponibilidad> {
    return this.http.post<BloqueIndisponibilidad>(`${API_BASE_URL}/tecnico/bloques`, request);
  }

  /** Fechas YYYY-MM-DD, inclusivas y opcionales; sin `desde` el backend usa hoy. */
  obtenerBloques(desde?: string, hasta?: string): Observable<BloqueIndisponibilidad[]> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<BloqueIndisponibilidad[]>(`${API_BASE_URL}/tecnico/bloques`, { params });
  }

  eliminarBloque(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/tecnico/bloques/${id}`);
  }
}
