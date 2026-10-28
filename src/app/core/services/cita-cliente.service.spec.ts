import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { CitaClienteService } from './cita-cliente.service';

describe('CitaClienteService', () => {
  let servicio: CitaClienteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(CitaClienteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista las citas del cliente', () => {
    let resultado: unknown;
    servicio.listar().subscribe((r) => (resultado = r));

    const req = http.expectOne(`${API_BASE_URL}/cliente/citas`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1 }]);
    expect(resultado).toEqual([{ id: 1 }]);
  });

  it('pide el detalle de una cita', () => {
    servicio.obtener(7).subscribe();
    const req = http.expectOne(`${API_BASE_URL}/cliente/citas/7`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('cancela con motivo', () => {
    servicio.cancelar(7, 'Ya no lo necesito').subscribe();
    const req = http.expectOne(`${API_BASE_URL}/cliente/citas/7/cancelar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ motivo: 'Ya no lo necesito' });
    req.flush({});
  });

  it('cancela sin motivo con un cuerpo vacío', () => {
    servicio.cancelar(7).subscribe();
    const req = http.expectOne(`${API_BASE_URL}/cliente/citas/7/cancelar`);
    expect(req.request.body).toEqual({});
    req.flush({});
  });

  it('reprograma enviando el nuevo inicio', () => {
    servicio.reprogramar(7, '2026-11-04T14:00:00').subscribe();
    const req = http.expectOne(`${API_BASE_URL}/cliente/citas/7/reprogramar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ inicio: '2026-11-04T14:00:00' });
    req.flush({});
  });
});
