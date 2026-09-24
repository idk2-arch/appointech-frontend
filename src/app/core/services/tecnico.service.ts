import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface EspecialidadResponse {
  id: number;
  nombre: string;
  descripcion: string;
}

export interface TecnicoResponse {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  direccionBase: string;
  radioCoberturaKm: number;
  especialidades: EspecialidadResponse[];
}

export interface AsignarEspecialidadesRequest {
  especialidadIds: number[];
}

@Injectable({ providedIn: 'root' })
export class TecnicoService {
  constructor(private http: HttpClient) {}

  obtenerTecnicos(): Observable<TecnicoResponse[]> {
    return this.http.get<TecnicoResponse[]>(`${API_BASE_URL}/tecnicos`);
  }

  obtenerEspecialidades(): Observable<EspecialidadResponse[]> {
    return this.http.get<EspecialidadResponse[]>(`${API_BASE_URL}/especialidades`);
  }

  asignarEspecialidades(tecnicoId: number, request: AsignarEspecialidadesRequest): Observable<TecnicoResponse> {
    return this.http.patch<TecnicoResponse>(`${API_BASE_URL}/tecnicos/${tecnicoId}/especialidades`, request);
  }
}
