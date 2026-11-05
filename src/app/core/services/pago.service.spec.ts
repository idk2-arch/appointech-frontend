import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { PagoService } from './pago.service';

describe('PagoService', () => {
  let servicio: PagoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(PagoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('cotiza por especialidad', () => {
    let resultado: unknown;
    servicio.cotizarEspecialidad(3).subscribe((r) => (resultado = r));

    const req = http.expectOne(`${API_BASE_URL}/especialidades/3/cotizacion`);
    expect(req.request.method).toBe('GET');
    req.flush({ disponible: true });
    expect(resultado).toEqual({ disponible: true });
  });

  it('consulta el pago de una cita', () => {
    servicio.obtener(7).subscribe();
    const req = http.expectOne(`${API_BASE_URL}/citas/7/pago`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('registra el costo final con el monto', () => {
    servicio.registrarCostoFinal(7, 120000).subscribe();
    const req = http.expectOne(`${API_BASE_URL}/citas/7/costo-final`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ monto: 120000 });
    req.flush({});
  });

  it('elige el método de pago', () => {
    servicio.elegirMetodo(7, 'EN_LINEA').subscribe();
    const req = http.expectOne(`${API_BASE_URL}/citas/7/pago/metodo`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ metodo: 'EN_LINEA' });
    req.flush({});
  });

  it('confirma el efectivo', () => {
    servicio.confirmarEfectivo(7).subscribe();
    const req = http.expectOne(`${API_BASE_URL}/citas/7/pago/confirmar-efectivo`);
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });

  it('sincroniza con cuerpo vacío cuando no hay id de transacción', () => {
    servicio.sincronizar(7).subscribe();
    const req = http.expectOne(`${API_BASE_URL}/citas/7/pago/sincronizar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});
  });

  it('sincroniza con el id de la transacción', () => {
    servicio.sincronizar(7, 'tx-1').subscribe();
    const req = http.expectOne(`${API_BASE_URL}/citas/7/pago/sincronizar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ idTransaccion: 'tx-1' });
    req.flush({});
  });

  it('consulta el comprobante', () => {
    servicio.obtenerComprobante(7).subscribe();
    const req = http.expectOne(`${API_BASE_URL}/citas/7/comprobante`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});
