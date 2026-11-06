import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

/** Solicitud que quedó sin técnico y espera a un administrador. Fecha en LocalDateTime sin zona. */
export interface AlertaAdmin {
  tipo: string;
  mensaje: string;
  solicitudId: number;
  clienteId: number;
  clienteNombre: string;
  clienteApellido: string;
  telefono: string | null;
  especialidadId: number;
  especialidadNombre: string;
  direccionServicio: string;
  creadaEn: string;
}

export interface AlertasAdmin {
  total: number;
  /** Las más antiguas primero. */
  alertas: AlertaAdmin[];
}

/** Alertas de solicitudes sin técnico. Guarda el total para que el menú lo muestre sin pedirlo otra vez. */
@Injectable({ providedIn: 'root' })
export class AlertasAdminService {
  private readonly _total = signal<number | null>(null);

  /** Null mientras no se haya cargado (o si la última carga falló); no se muestra como 0. */
  readonly total = this._total.asReadonly();

  constructor(private http: HttpClient) {}

  /** GET /admin/alertas. Cada respuesta actualiza el total del indicador. */
  obtener(): Observable<AlertasAdmin> {
    return this.http.get<AlertasAdmin>(`${API_BASE_URL}/admin/alertas`).pipe(tap((respuesta) => this._total.set(respuesta.total)));
  }
}
