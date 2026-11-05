import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { citaFinalizadaDe } from '../models/pago.mock';
import { AgendaTecnicoService } from './agenda-tecnico.service';

describe('AgendaTecnicoService', () => {
  let servicio: AgendaTecnicoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(AgendaTecnicoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide las citas activas del día', () => {
    servicio.obtenerCitas('2026-11-05').subscribe();
    const req = http.expectOne((r) => r.url === `${API_BASE_URL}/tecnico/citas`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('fecha')).toBe('2026-11-05');
    req.flush([]);
  });

  it('pide las citas finalizadas con el estado de su pago', () => {
    let resultado: unknown;
    servicio.obtenerFinalizadas().subscribe((r) => (resultado = r));

    const req = http.expectOne(`${API_BASE_URL}/tecnico/citas/finalizadas`);
    expect(req.request.method).toBe('GET');
    req.flush([citaFinalizadaDe()]);

    expect(resultado).toEqual([citaFinalizadaDe()]);
  });
});
