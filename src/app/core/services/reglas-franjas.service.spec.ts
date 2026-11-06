import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { ReglasFranjasService } from './reglas-franjas.service';

describe('ReglasFranjasService', () => {
  let servicio: ReglasFranjasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(ReglasFranjasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lee las reglas con GET', () => {
    let resultado: unknown;
    servicio.obtener().subscribe((r) => (resultado = r));

    const req = http.expectOne(`${API_BASE_URL}/admin/configuracion/franjas`);
    expect(req.request.method).toBe('GET');
    const cuerpo = { radioMaximoKm: 10, duracionBloqueMinutos: 120, horaInicioJornada: '08:00:00', horaFinJornada: '18:00:00' };
    req.flush(cuerpo);

    expect(resultado).toEqual(cuerpo);
  });

  it('guarda las cuatro reglas con PUT y devuelve la advertencia del servidor', () => {
    let resultado: unknown;
    const peticion = { radioMaximoKm: 20, duracionBloqueMinutos: 90, horaInicioJornada: '07:30', horaFinJornada: '17:00' };
    servicio.actualizar(peticion).subscribe((r) => (resultado = r));

    const req = http.expectOne(`${API_BASE_URL}/admin/configuracion/franjas`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(peticion);
    req.flush({ ...peticion, franjasOfrecidasInvalidadas: true, advertencia: 'Las franjas ofrecidas ya no se pueden confirmar.' });

    expect(resultado).toMatchObject({ franjasOfrecidasInvalidadas: true, advertencia: 'Las franjas ofrecidas ya no se pueden confirmar.' });
  });
});
