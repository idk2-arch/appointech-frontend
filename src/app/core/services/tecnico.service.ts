import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { RespuestaEnvuelta } from '../models/respuesta-envuelta';
import { desenvolverRespuesta } from '../utils/respuesta';
import type { TipoDocumento } from './auth.service';

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
  usuarioId: number;
  telefono: string | null;
  tipoDocumento: TipoDocumento | null;
  numeroDocumento: string | null;
  activo: boolean;
  latitudBase: number | null;
  longitudBase: number | null;
  fotoUrl?: string | null;
}

export interface AsignarEspecialidadesRequest {
  especialidadIds: number[];
}

/** latitudBase y longitudBase van juntas o ninguna, dentro de Colombia. */
interface DatosTecnicoEditables {
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento?: string;
  direccionBase: string;
  latitudBase?: number;
  longitudBase?: number;
  especialidadIds?: number[];
}

/** POST /admin/tecnicos */
export interface CrearTecnicoRequest extends DatosTecnicoEditables {
  contrasena: string;
}

/** PATCH /admin/tecnicos/{id}: lo ausente no se modifica; la contraseña no se edita aquí. */
export type ActualizarTecnicoRequest = Partial<DatosTecnicoEditables>;

@Injectable({ providedIn: 'root' })
export class TecnicoService {
  constructor(private http: HttpClient) {}

  /** GET /tecnicos devuelve el arreglo directo (sin ApiResponse). */
  obtenerTecnicos(): Observable<TecnicoResponse[]> {
    return this.http.get<TecnicoResponse[]>(`${API_BASE_URL}/tecnicos`);
  }

  /** GET /especialidades (público) devuelve el arreglo directo (sin ApiResponse). */
  obtenerEspecialidades(): Observable<EspecialidadResponse[]> {
    return this.http.get<EspecialidadResponse[]>(`${API_BASE_URL}/especialidades`);
  }

  // Formato no confirmado: se acepta envuelto o directo.
  asignarEspecialidades(tecnicoId: number, request: AsignarEspecialidadesRequest): Observable<TecnicoResponse> {
    return this.http
      .patch<TecnicoResponse | RespuestaEnvuelta<TecnicoResponse>>(
        `${API_BASE_URL}/tecnicos/${tecnicoId}/especialidades`,
        request
      )
      .pipe(map(desenvolverRespuesta));
  }
}
