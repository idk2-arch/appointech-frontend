import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { NotificacionService } from './notificacion.service';

describe('NotificacionService', () => {
  let servicio: NotificacionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(NotificacionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista con página y tamaño, y toma el total de X-Total-Count', () => {
    let resultado: unknown;
    servicio.listar({ page: 2, size: 10 }).subscribe((r) => (resultado = r));

    const req = http.expectOne((r) => r.url === `${API_BASE_URL}/notificaciones`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.has('soloNoLeidas')).toBe(false);
    req.flush([{ id: 1 }], { headers: { 'X-Total-Count': '25' } });
    expect(resultado).toEqual({ filas: [{ id: 1 }], total: 25 });
  });

  it('con soloNoLeidas lo envía como true', () => {
    servicio.listar({ soloNoLeidas: true }).subscribe();
    const req = http.expectOne((r) => r.url === `${API_BASE_URL}/notificaciones`);
    expect(req.request.params.get('soloNoLeidas')).toBe('true');
    req.flush([]);
  });

  it('sin filtro no envía parámetros', () => {
    servicio.listar().subscribe();
    const req = http.expectOne((r) => r.url === `${API_BASE_URL}/notificaciones`);
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
  });

  it('cuenta las no leídas', () => {
    let total = -1;
    servicio.contarNoLeidas().subscribe((t) => (total = t));
    const req = http.expectOne(`${API_BASE_URL}/notificaciones/no-leidas/conteo`);
    expect(req.request.method).toBe('GET');
    req.flush({ total: 4 });
    expect(total).toBe(4);
  });

  it('marca una como leída con PATCH', () => {
    servicio.marcarLeida(7).subscribe();
    const req = http.expectOne(`${API_BASE_URL}/notificaciones/7/leida`);
    expect(req.request.method).toBe('PATCH');
    req.flush(null);
  });

  it('marca todas como leídas y devuelve cuántas se actualizaron', () => {
    let actualizadas = -1;
    servicio.marcarTodasLeidas().subscribe((n) => (actualizadas = n));
    const req = http.expectOne(`${API_BASE_URL}/notificaciones/leer-todas`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ actualizadas: 3 });
    expect(actualizadas).toBe(3);
  });
});
