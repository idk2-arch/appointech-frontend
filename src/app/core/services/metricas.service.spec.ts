import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { MetricasService } from './metricas.service';

describe('MetricasService', () => {
  let servicio: MetricasService;
  let http: HttpTestingController;
  const URL = `${API_BASE_URL}/admin/metricas`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(MetricasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sin rango no envía parámetros (el servidor usa los últimos 30 días)', () => {
    let resultado: unknown;
    servicio.obtener().subscribe((r) => (resultado = r));

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ citas: { total: 20 } });

    expect(resultado).toEqual({ citas: { total: 20 } });
  });

  it('con rango envía desde y hasta', () => {
    servicio.obtener({ desde: '2026-10-01', hasta: '2026-10-31' }).subscribe();
    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('desde')).toBe('2026-10-01');
    expect(req.request.params.get('hasta')).toBe('2026-10-31');
    req.flush({});
  });

  it('solo desde, o fechas vacías o nulas: no se manda lo que falta', () => {
    servicio.obtener({ desde: '2026-10-01' }).subscribe();
    const solo = http.expectOne((r) => r.url === URL);
    expect(solo.request.params.keys()).toEqual(['desde']);
    solo.flush({});

    servicio.obtener({ desde: '', hasta: null }).subscribe();
    const vacio = http.expectOne((r) => r.url === URL);
    expect(vacio.request.params.keys()).toEqual([]);
    vacio.flush({});
  });
});
