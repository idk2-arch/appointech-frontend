import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { Cita, EstadoCita, MotivoSolicitudEspecial } from '../models/cita';
import type { PaginaServidor } from '../models/pagina-servidor';
import { aPaginaServidor, construirParametros } from '../utils/total-count';

/** Fechas en LocalDateTime sin zona (hora local de Colombia). */
export interface SolicitudManualAdmin {
  fechaDeseada?: string | null;
  id: number;
  clienteId: number;
  clienteNombre: string;
  clienteApellido: string;
  telefono: string | null;
  direccionServicio: string;
  descripcionProblema: string;
  especialidadId: number;
  especialidadNombre: string;
  latitud: number | null;
  longitud: number | null;
  creadaEn: string;
  /** Null en las filas anteriores a RF28. */
  motivo?: MotivoSolicitudEspecial | null;
  /** El servidor lista PENDIENTE si no se pide otro. */
  estado?: EstadoCita;
}

/** Filtros opcionales de GET /admin/solicitudes-manuales; lo vacío no se envía. `page` empieza en 0. */
export interface FiltroSolicitudesManuales {
  motivo?: MotivoSolicitudEspecial | '' | null;
  especialidadId?: number | null;
  estado?: EstadoCita | '' | null;
  page?: number;
  size?: number;
}

/** Técnico libre en un horario, ordenado por cercanía; los que no tienen ubicación vienen al final. */
export interface TecnicoDisponible {
  tecnicoId: number;
  nombre: string;
  apellido: string;
  telefono: string | null;
  fotoUrl: string | null;
  distanciaKm: number | null;
}

export interface AsignarSolicitudManualRequest {
  tecnicoId: number;
  fechaHoraInicio: string;
  fechaHoraFin: string;
}

/** Solicitudes que un administrador coordina a mano: fuera de cobertura o sin técnicos para la especialidad. */
@Injectable({ providedIn: 'root' })
export class SolicitudManualAdminService {
  constructor(private http: HttpClient) {}

  /** GET /admin/solicitudes-manuales: arreglo en el cuerpo y el total que cumple el filtro en X-Total-Count. */
  listar(filtro: FiltroSolicitudesManuales = {}): Observable<PaginaServidor<SolicitudManualAdmin>> {
    return this.http
      .get<SolicitudManualAdmin[]>(`${API_BASE_URL}/admin/solicitudes-manuales`, {
        params: construirParametros({ ...filtro }),
        observe: 'response',
      })
      .pipe(map((respuesta) => aPaginaServidor(respuesta)));
  }

  /** GET .../{id}/tecnicos-disponibles: `inicio` y `fin` en LocalDateTime sin zona; lista vacía si no hay ninguno. */
  tecnicosDisponibles(id: number, inicio: string, fin: string): Observable<TecnicoDisponible[]> {
    return this.http.get<TecnicoDisponible[]>(`${API_BASE_URL}/admin/solicitudes-manuales/${id}/tecnicos-disponibles`, {
      params: construirParametros({ inicio, fin }),
    });
  }

  /** PATCH /admin/solicitudes-manuales/{id}/asignar responde la cita ya CONFIRMADA, con la trazabilidad. */
  asignar(id: number, request: AsignarSolicitudManualRequest): Observable<Cita> {
    return this.http.patch<Cita>(`${API_BASE_URL}/admin/solicitudes-manuales/${id}/asignar`, request);
  }
}
