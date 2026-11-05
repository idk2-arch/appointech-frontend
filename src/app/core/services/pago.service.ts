import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type {
  Comprobante,
  Cotizacion,
  CostoFinalRequest,
  MetodoPago,
  MetodoPagoRequest,
  Pago,
  SincronizarPagoRequest,
} from '../models/pago';

/** Cotización, costo final, método de pago y comprobante de una cita. */
@Injectable({ providedIn: 'root' })
export class PagoService {
  constructor(private http: HttpClient) {}

  /** Valor estimado por especialidad; `disponible` es false si no hay costo de referencia. */
  cotizarEspecialidad(especialidadId: number): Observable<Cotizacion> {
    return this.http.get<Cotizacion>(`${API_BASE_URL}/especialidades/${especialidadId}/cotizacion`);
  }

  obtener(citaId: number): Observable<Pago> {
    return this.http.get<Pago>(`${API_BASE_URL}/citas/${citaId}/pago`);
  }

  /** Técnico asignado, con la cita FINALIZADA. El monto debe ser mayor que 0. */
  registrarCostoFinal(citaId: number, monto: number): Observable<Pago> {
    return this.http.patch<Pago>(`${API_BASE_URL}/citas/${citaId}/costo-final`, { monto } satisfies CostoFinalRequest);
  }

  /** En línea devuelve `urlPago`; 503 si el pago en línea no está disponible, 409 si ya hay uno en proceso. */
  elegirMetodo(citaId: number, metodo: MetodoPago): Observable<Pago> {
    return this.http.patch<Pago>(`${API_BASE_URL}/citas/${citaId}/pago/metodo`, { metodo } satisfies MetodoPagoRequest);
  }

  /** El técnico confirma que cobró en efectivo. */
  confirmarEfectivo(citaId: number): Observable<Pago> {
    return this.http.patch<Pago>(`${API_BASE_URL}/citas/${citaId}/pago/confirmar-efectivo`, {});
  }

  /**
   * Consulta a la pasarela el resultado del pago y actualiza su estado. Sin `idTransaccion` se usa la
   * referencia guardada; 409 si el pago no es en línea o no tiene referencia.
   */
  sincronizar(citaId: number, idTransaccion?: string): Observable<Pago> {
    const cuerpo: SincronizarPagoRequest = idTransaccion ? { idTransaccion } : {};
    return this.http.post<Pago>(`${API_BASE_URL}/citas/${citaId}/pago/sincronizar`, cuerpo);
  }

  /** Solo con el pago PAGADO; el backend lo genera, aquí únicamente se consulta. */
  obtenerComprobante(citaId: number): Observable<Comprobante> {
    return this.http.get<Comprobante>(`${API_BASE_URL}/citas/${citaId}/comprobante`);
  }
}
