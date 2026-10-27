import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ConsultaFranjas, FranjasConMotivo, TecnicoDisponible } from '../models/disponibilidad';

@Injectable({ providedIn: 'root' })
export class DisponibilidadService {
  constructor(private http: HttpClient) {}

  obtenerTecnicos(especialidadId: number): Observable<TecnicoDisponible[]> {
    const params = new HttpParams().set('especialidadId', especialidadId);
    return this.http.get<TecnicoDisponible[]>(`${API_BASE_URL}/disponibilidad/tecnicos`, { params });
  }

  obtenerFranjas(consulta: ConsultaFranjas): Observable<FranjasConMotivo> {
    const params = new HttpParams()
      .set('especialidadId', consulta.especialidadId)
      .set('fecha', consulta.fecha)
      .set('latitud', consulta.latitud)
      .set('longitud', consulta.longitud);
    return this.http.get<FranjasConMotivo>(`${API_BASE_URL}/disponibilidad/franjas-con-motivo`, { params });
  }
}
