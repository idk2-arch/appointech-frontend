import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { FotoElectrodomesticoService, ResultadoSubidaFotos } from './foto-electrodomestico.service';

describe('FotoElectrodomesticoService', () => {
  let servicio: FotoElectrodomesticoService;
  let http: HttpTestingController;
  const url = (citaId: number): string => `${API_BASE_URL}/cliente/citas/${citaId}/fotos`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(FotoElectrodomesticoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sube una foto con POST y devuelve su id y su URL', () => {
    let resultado: unknown;
    servicio.subir(7, 'data:image/jpeg;base64,AAAA').subscribe((r) => (resultado = r));

    const req = http.expectOne(url(7));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ imagenBase64: 'data:image/jpeg;base64,AAAA' });
    req.flush({ id: 3, url: '/api/citas/7/fotos/3' }, { status: 201, statusText: 'Created' });
    expect(resultado).toEqual({ id: 3, url: '/api/citas/7/fotos/3' });
  });

  it('elimina una foto con DELETE', () => {
    let completo = false;
    servicio.eliminar(7, 3).subscribe({ complete: () => (completo = true) });

    const req = http.expectOne(`${url(7)}/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(completo).toBe(true);
  });

  describe('subirVarias', () => {
    let resultado: ResultadoSubidaFotos | undefined;

    beforeEach(() => (resultado = undefined));

    it('sube de una en una, en orden', () => {
      servicio.subirVarias(7, ['a', 'b']).subscribe((r) => (resultado = r));

      const primera = http.expectOne(url(7));
      expect(primera.request.body).toEqual({ imagenBase64: 'a' });
      http.expectNone(url(7)); // la segunda espera a que termine la primera
      primera.flush({ id: 1, url: '/f/1' });

      const segunda = http.expectOne(url(7));
      expect(segunda.request.body).toEqual({ imagenBase64: 'b' });
      segunda.flush({ id: 2, url: '/f/2' });

      expect(resultado).toEqual({
        subidas: [
          { id: 1, url: '/f/1' },
          { id: 2, url: '/f/2' },
        ],
        fallidas: [],
        mensajeError: null,
      });
    });

    it('si una falla, las demás siguen y quedan registradas las que no subieron', () => {
      servicio.subirVarias(7, ['a', 'b', 'c']).subscribe((r) => (resultado = r));

      http.expectOne(url(7)).flush({ id: 1, url: '/f/1' });
      http
        .expectOne(url(7))
        .flush({ timestamp: 't', status: 409, error: 'La cita ya no admite fotos' }, { status: 409, statusText: 'Conflict' });
      http.expectOne(url(7)).flush({ id: 3, url: '/f/3' });

      expect(resultado?.subidas.map((f) => f.id)).toEqual([1, 3]);
      expect(resultado?.fallidas).toEqual(['b']);
      expect(resultado?.mensajeError).toBe('La cita ya no admite fotos');
    });

    it('si todas fallan, devuelve todas como fallidas', () => {
      servicio.subirVarias(7, ['a', 'b']).subscribe((r) => (resultado = r));

      http.expectOne(url(7)).flush('x', { status: 500, statusText: 'Error' });
      http.expectOne(url(7)).flush('x', { status: 500, statusText: 'Error' });

      expect(resultado?.subidas).toEqual([]);
      expect(resultado?.fallidas).toEqual(['a', 'b']);
      expect(resultado?.mensajeError).toBe('No fue posible subir la foto.');
    });

    it('sin imágenes termina enseguida sin pedir nada', () => {
      servicio.subirVarias(7, []).subscribe((r) => (resultado = r));
      http.expectNone(url(7));
      expect(resultado).toEqual({ subidas: [], fallidas: [], mensajeError: null });
    });
  });
});
