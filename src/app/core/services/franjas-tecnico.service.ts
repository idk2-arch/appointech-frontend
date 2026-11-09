import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface DatosFranjaTecnico {
  fecha: string;
  horaInicio: string;
  horaFin: string;
}
export interface FranjaTecnico extends DatosFranjaTecnico {
  id: number;
  tecnicoId: number;
  bloques: number;
  bloquesOcupados: number;
  creadaEn: string;
}
@Injectable({ providedIn: 'root' })
export class FranjasTecnicoService {
  constructor(private http: HttpClient) {}
  private ruta(id: number): string {
    return `${API_BASE_URL}/admin/tecnicos/${id}`;
  }
  listar(id: number, desde: string, hasta: string): Observable<FranjaTecnico[]> {
    return this.http.get<FranjaTecnico[]>(`${this.ruta(id)}/franjas`, { params: { desde, hasta } });
  }
  crear(id: number, datos: DatosFranjaTecnico): Observable<FranjaTecnico> {
    return this.http.post<FranjaTecnico>(`${this.ruta(id)}/franjas`, datos);
  }
  actualizar(id: number, franjaId: number, datos: DatosFranjaTecnico): Observable<FranjaTecnico> {
    return this.http.put<FranjaTecnico>(`${this.ruta(id)}/franjas/${franjaId}`, datos);
  }
  borrar(id: number, franjaId: number): Observable<void> {
    return this.http.delete<void>(`${this.ruta(id)}/franjas/${franjaId}`);
  }
  guardarRadio(
    id: number,
    radioMaximoKm: number,
  ): Observable<{ tecnicoId: number; radioMaximoKm: number }> {
    return this.http.patch<{ tecnicoId: number; radioMaximoKm: number }>(
      `${this.ruta(id)}/radio-atencion`,
      { radioMaximoKm },
    );
  }
}
