import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { FiltroLogs, RegistroLog } from '../models/registro-log';

@Injectable({ providedIn: 'root' })
export class LogService {
  constructor(private http: HttpClient) {}

  obtenerLogs(filtro: FiltroLogs = {}): Observable<RegistroLog[]> {
    let params = new HttpParams();
    if (filtro.nivel) params = params.set('nivel', filtro.nivel);
    if (filtro.tipo) params = params.set('tipo', filtro.tipo);
    if (filtro.limite) params = params.set('limite', filtro.limite);
    return this.http.get<RegistroLog[]>(`${API_BASE_URL}/logs`, { params });
  }
}
