import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { AlertasAdminService } from './alertas-admin.service';

describe('AlertasAdminService', () => {
  let servicio: AlertasAdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(AlertasAdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('arranca sin total conocido', () => {
    expect(servicio.total()).toBeNull();
  });

  it('pide las alertas y guarda el total para el indicador', () => {
    let resultado: unknown;
    servicio.obtener().subscribe((r) => (resultado = r));

    const req = http.expectOne(`${API_BASE_URL}/admin/alertas`);
    expect(req.request.method).toBe('GET');
    req.flush({ total: 2, alertas: [{ solicitudId: 1 }, { solicitudId: 2 }] });

    expect(servicio.total()).toBe(2);
    expect(resultado).toMatchObject({ total: 2 });
  });

  it('con la lista vacía el total es 0, no desconocido', () => {
    servicio.obtener().subscribe();
    http.expectOne(`${API_BASE_URL}/admin/alertas`).flush({ total: 0, alertas: [] });
    expect(servicio.total()).toBe(0);
  });

  it('si falla conserva el último total conocido', () => {
    servicio.obtener().subscribe();
    http.expectOne(`${API_BASE_URL}/admin/alertas`).flush({ total: 3, alertas: [] });

    servicio.obtener().subscribe({ error: () => undefined });
    http.expectOne(`${API_BASE_URL}/admin/alertas`).flush({}, { status: 500, statusText: 'Error' });

    expect(servicio.total()).toBe(3);
  });
});
