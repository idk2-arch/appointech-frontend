import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { ESPERA_MAXIMA_PREDIAGNOSTICO_MS, PreDiagnosticoService } from './pre-diagnostico.service';

describe('PreDiagnosticoService', () => {
  let http: HttpTestingController;
  let servicio: PreDiagnosticoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    servicio = TestBed.inject(PreDiagnosticoService);
  });

  afterEach(() => http.verify());

  it('hace POST a /solicitudes/pre-diagnostico con el cuerpo tal cual y devuelve la respuesta', () => {
    const respuesta = vi.fn();
    servicio.sugerir({ descripcionProblema: 'No enfría', especialidad: 'Neveras' }).subscribe(respuesta);

    const req = http.expectOne(`${API_BASE_URL}/solicitudes/pre-diagnostico`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ descripcionProblema: 'No enfría', especialidad: 'Neveras' });
    req.flush({ disponible: true, sugerencia: 'Revisa el termostato' });

    expect(respuesta).toHaveBeenCalledWith({ disponible: true, sugerencia: 'Revisa el termostato' });
  });

  it('la especialidad es opcional', () => {
    servicio.sugerir({ descripcionProblema: 'Hace ruido' }).subscribe();
    const req = http.expectOne(`${API_BASE_URL}/solicitudes/pre-diagnostico`);
    expect(req.request.body).toEqual({ descripcionProblema: 'Hace ruido' });
    req.flush({ disponible: false, sugerencia: '' });
  });

  it('propaga los errores HTTP', () => {
    const error = vi.fn();
    servicio.sugerir({ descripcionProblema: 'x' }).subscribe({ error });
    http.expectOne(`${API_BASE_URL}/solicitudes/pre-diagnostico`).flush('fallo', { status: 500, statusText: 'Error' });
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('si la IA tarda más del límite, falla por tiempo agotado y corta la petición', () => {
    vi.useFakeTimers();
    try {
      const error = vi.fn();
      servicio.sugerir({ descripcionProblema: 'x' }).subscribe({ error });
      const req = http.expectOne(`${API_BASE_URL}/solicitudes/pre-diagnostico`);

      vi.advanceTimersByTime(ESPERA_MAXIMA_PREDIAGNOSTICO_MS + 1);

      expect(error).toHaveBeenCalledTimes(1);
      expect(req.cancelled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  describe('redactarTecnico', () => {
    it('hace POST a /solicitudes/redactar-tecnico y devuelve la respuesta', () => {
      const respuesta = vi.fn();
      servicio.redactarTecnico({ descripcionProblema: 'no enfria', especialidad: 'Neveras' }).subscribe(respuesta);

      const req = http.expectOne(`${API_BASE_URL}/solicitudes/redactar-tecnico`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ descripcionProblema: 'no enfria', especialidad: 'Neveras' });
      req.flush({ disponible: true, textoTecnico: 'El equipo no alcanza la temperatura de operación.' });

      expect(respuesta).toHaveBeenCalledWith({ disponible: true, textoTecnico: 'El equipo no alcanza la temperatura de operación.' });
    });

    it('devuelve disponible=false tal cual, sin tratarlo como error', () => {
      const respuesta = vi.fn();
      const error = vi.fn();
      servicio.redactarTecnico({ descripcionProblema: 'x' }).subscribe({ next: respuesta, error });

      http.expectOne(`${API_BASE_URL}/solicitudes/redactar-tecnico`).flush({ disponible: false, textoTecnico: '' });

      expect(respuesta).toHaveBeenCalledWith({ disponible: false, textoTecnico: '' });
      expect(error).not.toHaveBeenCalled();
    });

    it('propaga los errores HTTP', () => {
      const error = vi.fn();
      servicio.redactarTecnico({ descripcionProblema: 'x' }).subscribe({ error });
      http.expectOne(`${API_BASE_URL}/solicitudes/redactar-tecnico`).flush('fallo', { status: 500, statusText: 'Error' });
      expect(error).toHaveBeenCalledTimes(1);
    });

    it('si tarda más del límite, falla por tiempo agotado y corta la petición', () => {
      vi.useFakeTimers();
      try {
        const error = vi.fn();
        servicio.redactarTecnico({ descripcionProblema: 'x' }).subscribe({ error });
        const req = http.expectOne(`${API_BASE_URL}/solicitudes/redactar-tecnico`);

        vi.advanceTimersByTime(ESPERA_MAXIMA_PREDIAGNOSTICO_MS + 1);

        expect(error).toHaveBeenCalledTimes(1);
        expect(req.cancelled).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
