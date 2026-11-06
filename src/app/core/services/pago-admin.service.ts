import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { PaginaServidor } from '../models/pagina-servidor';
import type { FilaPagoAdmin, FiltroPagosAdmin } from '../models/pago-admin';
import { aPaginaServidor, construirParametros } from '../utils/total-count';

/** Historial de pagos de todas las citas. Solo administradores. */
@Injectable({ providedIn: 'root' })
export class PagoAdminService {
  constructor(private http: HttpClient) {}

  /** GET /admin/pagos: arreglo en el cuerpo y total en X-Total-Count; lo más reciente primero. */
  listar(filtro: FiltroPagosAdmin = {}): Observable<PaginaServidor<FilaPagoAdmin>> {
    return this.http
      .get<FilaPagoAdmin[]>(`${API_BASE_URL}/admin/pagos`, { params: construirParametros({ ...filtro }), observe: 'response' })
      .pipe(map((respuesta) => aPaginaServidor(respuesta)));
  }
}
