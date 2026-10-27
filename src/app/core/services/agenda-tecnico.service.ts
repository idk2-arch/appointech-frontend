import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { CitaTecnico } from '../models/tecnico-agenda';

@Injectable({ providedIn: 'root' })
export class AgendaTecnicoService {
  constructor(private http: HttpClient) {}

  /** Citas activas del día (YYYY-MM-DD), ordenadas por hora de inicio. */
  obtenerCitas(fecha: string): Observable<CitaTecnico[]> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http.get<CitaTecnico[]>(`${API_BASE_URL}/tecnico/citas`, { params });
  }
}
