import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { TipoDocumento } from './auth.service';

export interface ClienteResponse {
  id: number;
  usuarioId: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string | null;
  tipoDocumento: TipoDocumento | null;
  numeroDocumento: string | null;
  activo: boolean;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
}

/** Lo ausente no se modifica. latitud y longitud van juntas o ninguna, dentro de Colombia. */
export type ActualizarClienteRequest = Partial<
  Pick<
    ClienteResponse,
    'nombre' | 'apellido' | 'correo' | 'telefono' | 'tipoDocumento' | 'numeroDocumento' | 'direccion'
  > & { latitud: number; longitud: number }
>;

/** Clientes vistos y editados por un administrador. */
@Injectable({ providedIn: 'root' })
export class ClienteAdminService {
  constructor(private http: HttpClient) {}

  /** GET /admin/clientes devuelve el arreglo directo (sin ApiResponse). */
  obtenerClientes(): Observable<ClienteResponse[]> {
    return this.http.get<ClienteResponse[]>(`${API_BASE_URL}/admin/clientes`);
  }

  /** PATCH /admin/clientes/{id} (id del cliente) responde el cliente directo. */
  actualizar(clienteId: number, request: ActualizarClienteRequest): Observable<ClienteResponse> {
    return this.http.patch<ClienteResponse>(`${API_BASE_URL}/admin/clientes/${clienteId}`, request);
  }
}
