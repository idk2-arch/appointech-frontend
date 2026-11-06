import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { Metricas, RangoSolicitado } from '../models/metricas';
import { construirParametros } from '../utils/total-count';

/** Métricas del panel del administrador. Solo administradores. */
@Injectable({ providedIn: 'root' })
export class MetricasService {
  constructor(private http: HttpClient) {}

  /** GET /admin/metricas. Sin rango no envía parámetros y el servidor usa los últimos 30 días. */
  obtener(rango: RangoSolicitado = {}): Observable<Metricas> {
    return this.http.get<Metricas>(`${API_BASE_URL}/admin/metricas`, {
      params: construirParametros({ desde: rango.desde, hasta: rango.hasta }),
    });
  }
}
