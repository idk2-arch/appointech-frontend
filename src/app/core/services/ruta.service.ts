import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { RutaDelDia } from '../models/tecnico-agenda';

@Injectable({ providedIn: 'root' })
export class RutaService {
  constructor(private http: HttpClient) {}

  /** La ruta no se guarda: se recalcula en cada petición. */
  obtenerRuta(fecha: string): Observable<RutaDelDia> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http.get<RutaDelDia>(`${API_BASE_URL}/tecnico/ruta`, { params });
  }
}
