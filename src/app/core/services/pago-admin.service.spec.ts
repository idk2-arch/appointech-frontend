import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { PagoAdminService } from './pago-admin.service';

describe('PagoAdminService', () => {
  let servicio: PagoAdminService;
  let http: HttpTestingController;
  const URL = `${API_BASE_URL}/admin/pagos`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(PagoAdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista sin filtros y toma el total de X-Total-Count', () => {
    let resultado: unknown;
    servicio.listar().subscribe((r) => (resultado = r));

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([{ citaId: 1 }], { headers: { 'X-Total-Count': '41' } });

    expect(resultado).toEqual({ filas: [{ citaId: 1 }], total: 41 });
  });

  it('envía todos los filtros con su nombre y omite los vacíos', () => {
    servicio
      .listar({ estado: 'PAGADO', metodo: 'EN_LINEA', clienteId: 5, tecnicoId: 9, desde: '2026-11-01', hasta: '2026-11-30', page: 1, size: 20 })
      .subscribe();
    const req = http.expectOne((r) => r.url === URL);
    const params = Object.fromEntries(req.request.params.keys().map((k) => [k, req.request.params.get(k)]));
    expect(params).toEqual({
      estado: 'PAGADO',
      metodo: 'EN_LINEA',
      clienteId: '5',
      tecnicoId: '9',
      desde: '2026-11-01',
      hasta: '2026-11-30',
      page: '1',
      size: '20',
    });
    req.flush([]);

    servicio.listar({ estado: '', metodo: null, clienteId: null, desde: '' }).subscribe();
    const vacia = http.expectOne((r) => r.url === URL);
    expect(vacia.request.params.keys()).toEqual([]);
    vacia.flush([]);
  });
});
