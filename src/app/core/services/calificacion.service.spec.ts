import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import type { Calificacion } from '../models/calificacion';
import { CalificacionService } from './calificacion.service';
import { SesionService } from './sesion.service';

const CALIFICACION: Calificacion = { citaId: 19, puntuacion: 5, comentario: null, fecha: '2026-11-01T10:00:00' };

describe('CalificacionService', () => {
  let servicio: CalificacionService;
  let http: HttpTestingController;
  let sesion: SesionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(CalificacionService);
    sesion = TestBed.inject(SesionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('obtener', () => {
    it('consulta la calificación de una cita', () => {
      let resultado: unknown;
      servicio.obtener(19).subscribe((r) => (resultado = r));

      const req = http.expectOne(`${API_BASE_URL}/cliente/citas/19/calificacion`);
      expect(req.request.method).toBe('GET');
      req.flush(CALIFICACION);
      expect(resultado).toEqual(CALIFICACION);
    });

    it('el 404 (aún sin calificar) es lo normal: se entrega como null, no como error', () => {
      let resultado: unknown = 'sin respuesta';
      let error: unknown = null;
      servicio.obtener(5).subscribe({ next: (r) => (resultado = r), error: (e) => (error = e) });

      http.expectOne(`${API_BASE_URL}/cliente/citas/5/calificacion`).flush(null, { status: 404, statusText: 'Not Found' });

      expect(resultado).toBeNull();
      expect(error).toBeNull();
    });

    it('otros errores siguen siendo errores', () => {
      let error: { status?: number } | null = null;
      servicio.obtener(5).subscribe({ error: (e) => (error = e) });

      http.expectOne(`${API_BASE_URL}/cliente/citas/5/calificacion`).flush(null, { status: 500, statusText: 'Error' });

      expect(error).not.toBeNull();
      expect((error as { status?: number } | null)?.status).toBe(500);
    });

    it('un error no queda en caché: el siguiente intento vuelve a pedir', () => {
      servicio.obtener(5).subscribe({ error: () => undefined });
      http.expectOne(`${API_BASE_URL}/cliente/citas/5/calificacion`).flush(null, { status: 500, statusText: 'Error' });

      servicio.obtener(5).subscribe();
      http.expectOne(`${API_BASE_URL}/cliente/citas/5/calificacion`).flush(CALIFICACION);
    });

    it('lo ya consultado no se vuelve a pedir en la sesión (ni siquiera el "sin calificar")', () => {
      servicio.obtener(19).subscribe();
      http.expectOne(`${API_BASE_URL}/cliente/citas/19/calificacion`).flush(CALIFICACION);
      servicio.obtener(5).subscribe();
      http.expectOne(`${API_BASE_URL}/cliente/citas/5/calificacion`).flush(null, { status: 404, statusText: 'Not Found' });

      const recibidas: unknown[] = [];
      servicio.obtener(19).subscribe((r) => recibidas.push(r));
      servicio.obtener(5).subscribe((r) => recibidas.push(r));

      http.expectNone(`${API_BASE_URL}/cliente/citas/19/calificacion`);
      http.expectNone(`${API_BASE_URL}/cliente/citas/5/calificacion`);
      expect(recibidas).toEqual([CALIFICACION, null]);
    });

    it('dos pedidos a la vez de la misma cita comparten una sola petición', () => {
      const recibidas: unknown[] = [];
      servicio.obtener(19).subscribe((r) => recibidas.push(r));
      servicio.obtener(19).subscribe((r) => recibidas.push(r));

      http.expectOne(`${API_BASE_URL}/cliente/citas/19/calificacion`).flush(CALIFICACION);

      expect(recibidas).toEqual([CALIFICACION, CALIFICACION]);
    });

    it('olvidar una cita permite volver a consultarla (p. ej. tras un "ya calificada")', () => {
      servicio.obtener(19).subscribe();
      http.expectOne(`${API_BASE_URL}/cliente/citas/19/calificacion`).flush(null, { status: 404, statusText: 'Not Found' });

      servicio.olvidar(19);
      servicio.obtener(19).subscribe();
      http.expectOne(`${API_BASE_URL}/cliente/citas/19/calificacion`).flush(CALIFICACION);
    });

    it('al cerrar sesión se olvida todo lo guardado', () => {
      servicio.obtener(19).subscribe();
      http.expectOne(`${API_BASE_URL}/cliente/citas/19/calificacion`).flush(CALIFICACION);

      sesion.limpiar();
      servicio.obtener(19).subscribe();
      http.expectOne(`${API_BASE_URL}/cliente/citas/19/calificacion`).flush(CALIFICACION);
    });
  });

  describe('calificar', () => {
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

    it('lo calificado queda en la caché: la lista ya no tiene que consultarlo', () => {
      servicio.calificar(19, { puntuacion: 5 }).subscribe();
      http.expectOne(`${API_BASE_URL}/cliente/citas/19/calificacion`).flush(CALIFICACION);

      let resultado: unknown;
      servicio.obtener(19).subscribe((r) => (resultado = r));

      http.expectNone(`${API_BASE_URL}/cliente/citas/19/calificacion`);
      expect(resultado).toEqual(CALIFICACION);
    });
  });
});
