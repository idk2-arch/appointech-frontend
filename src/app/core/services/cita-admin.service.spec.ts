import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { CitaAdminService } from './cita-admin.service';

describe('CitaAdminService', () => {
  let servicio: CitaAdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    servicio = TestBed.inject(CitaAdminService);
  });

  afterEach(() => http.verify());

  it('consulta el detalle de cualquier cita', () => {
    servicio.obtener(12).subscribe();

    const req = http.expectOne(`${API_BASE_URL}/admin/citas/12`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('listar sin filtros consulta la URL base sin parámetros', () => {
    servicio.listar().subscribe();

    const req = http.expectOne((r) => r.url === `${API_BASE_URL}/admin/citas`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({});
  });

  it('listar envía solo los filtros con valor, más la página y el tamaño', () => {
    servicio
      .listar({ tecnicoId: 4, estado: 'CONFIRMADA', fechaDesde: '2026-11-01', fechaHasta: '', pagina: 0, tamanio: 10 })
      .subscribe();

    const req = http.expectOne((r) => r.url === `${API_BASE_URL}/admin/citas`);
    expect(req.request.params.get('tecnicoId')).toBe('4');
    expect(req.request.params.get('estado')).toBe('CONFIRMADA');
    expect(req.request.params.get('fechaDesde')).toBe('2026-11-01');
    expect(req.request.params.has('fechaHasta')).toBe(false);
    expect(req.request.params.get('pagina')).toBe('0');
    expect(req.request.params.get('tamanio')).toBe('10');
    req.flush({});
  });
});
