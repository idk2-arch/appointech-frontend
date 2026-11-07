import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { CalificacionService } from './calificacion.service';

describe('CalificacionService', () => {
  let servicio: CalificacionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(CalificacionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta la calificación de una cita', () => {
    let resultado: unknown;
    servicio.obtener(19).subscribe((r) => (resultado = r));

    const req = http.expectOne(`${API_BASE_URL}/cliente/citas/19/calificacion`);
    expect(req.request.method).toBe('GET');
    req.flush({ citaId: 19, puntuacion: 5, comentario: null, fecha: '2026-11-01T10:00:00' });
    expect(resultado).toMatchObject({ citaId: 19, puntuacion: 5 });
  });

  it('envía la calificación con puntuación y comentario', () => {
    servicio.calificar(19, { puntuacion: 4, comentario: 'Muy amable' }).subscribe();

    const req = http.expectOne(`${API_BASE_URL}/cliente/citas/19/calificacion`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ puntuacion: 4, comentario: 'Muy amable' });
    req.flush({});
  });

  it('envía solo la puntuación cuando no hay comentario', () => {
    servicio.calificar(19, { puntuacion: 3 }).subscribe();

    const req = http.expectOne(`${API_BASE_URL}/cliente/citas/19/calificacion`);
    expect(req.request.body).toEqual({ puntuacion: 3 });
    req.flush({});
  });
});
