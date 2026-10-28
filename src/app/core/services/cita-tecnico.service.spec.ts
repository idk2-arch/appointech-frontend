import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { CitaTecnicoService } from './cita-tecnico.service';

describe('CitaTecnicoService', () => {
  let servicio: CitaTecnicoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(CitaTecnicoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('cambia el estado con PATCH', () => {
    servicio.cambiarEstado(3, 'EN_CAMINO').subscribe();
    const req = http.expectOne(`${API_BASE_URL}/tecnico/citas/3/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado: 'EN_CAMINO' });
    req.flush({});
  });

  it('cancela enviando el motivo', () => {
    servicio.cancelar(3, 'Cliente ausente').subscribe();
    const req = http.expectOne(`${API_BASE_URL}/tecnico/citas/3/cancelar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ motivo: 'Cliente ausente' });
    req.flush({});
  });

  it('guarda el diagnóstico con PUT', () => {
    const cuerpo = { diagnostico: 'Falla en la bomba', recomendaciones: 'Cambiarla' };
    let resultado: unknown;
    servicio.guardarDiagnostico(3, cuerpo).subscribe((r) => (resultado = r));
    const req = http.expectOne(`${API_BASE_URL}/tecnico/citas/3/diagnostico`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(cuerpo);
    req.flush({ ...cuerpo, fecha: '2026-10-27T10:00:00' });
    expect(resultado).toMatchObject(cuerpo);
  });

  it('propaga el mensaje de negocio del 409', () => {
    let mensaje: unknown;
    servicio.cambiarEstado(3, 'FINALIZADA').subscribe({ error: (e) => (mensaje = e.error.error) });
    http
      .expectOne(`${API_BASE_URL}/tecnico/citas/3/estado`)
      .flush({ timestamp: 'x', status: 409, error: 'Transición no válida' }, { status: 409, statusText: 'Conflict' });
    expect(mensaje).toBe('Transición no válida');
  });
});
