import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GEOAPIFY_URL } from '../config/api.config';
import { ResultadoDireccion } from './geocodificacion';
import { GeocodificacionService } from './geocodificacion.service';

describe('GeocodificacionService', () => {
  let servicio: GeocodificacionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(GeocodificacionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const autocompletar = (r: { url: string }): boolean => r.url === `${GEOAPIFY_URL}/autocomplete`;
  const inversa = (r: { url: string }): boolean => r.url === `${GEOAPIFY_URL}/reverse`;

  describe('sugerirDirecciones', () => {
    it('un texto vacío no consulta nada', () => {
      let resultado: ResultadoDireccion[] | undefined;
      servicio.sugerirDirecciones('   ').subscribe((r) => (resultado = r));
      http.expectNone(autocompletar);
      expect(resultado).toEqual([]);
    });

    it('consulta Geoapify limitando a Colombia, en español y con máximo 5 resultados', () => {
      servicio.sugerirDirecciones('  Calle 6 Fusagasugá ').subscribe();

      const req = http.expectOne(autocompletar);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('text')).toBe('Calle 6 Fusagasugá');
      expect(req.request.params.get('filter')).toBe('countrycode:co');
      expect(req.request.params.get('bias')).toBe('countrycode:co');
      expect(req.request.params.get('lang')).toBe('es');
      expect(req.request.params.get('limit')).toBe('5');
      expect(req.request.params.has('apiKey')).toBe(true);
      req.flush({ features: [] });
    });

    it('convierte la respuesta GeoJSON a direcciones (latitud primero)', () => {
      let resultado: ResultadoDireccion[] = [];
      servicio.sugerirDirecciones('calle').subscribe((r) => (resultado = r));

      http.expectOne(autocompletar).flush({
        features: [
          { properties: { formatted: 'Calle 6 # 12-34, Fusagasugá', lat: 4.34, lon: -74.36, place_id: 'abc' } },
          { properties: { formatted: 'Sin id' }, geometry: { coordinates: [-74.1, 4.7] } },
        ],
      });

      expect(resultado).toEqual([
        { id: 'abc', nombre: 'Calle 6 # 12-34, Fusagasugá', latitud: 4.34, longitud: -74.36 },
        { id: '1', nombre: 'Sin id', latitud: 4.7, longitud: -74.1 },
      ]);
    });

    it('descarta resultados sin texto o sin coordenadas válidas', () => {
      let resultado: ResultadoDireccion[] = [];
      servicio.sugerirDirecciones('calle').subscribe((r) => (resultado = r));

      http.expectOne(autocompletar).flush({
        features: [
          { properties: { lat: 4, lon: -74 } },
          { properties: { formatted: 'Sin coordenadas' } },
          { properties: { formatted: 'Coordenadas inválidas', lat: 'x', lon: 'y' } },
          { properties: { formatted: 'Buena', lat: 4.3, lon: -74.3, place_id: 'ok' } },
        ],
      });

      expect(resultado.map((r) => r.nombre)).toEqual(['Buena']);
    });

    it('una respuesta sin "features" da una lista vacía', () => {
      let resultado: ResultadoDireccion[] | undefined;
      servicio.sugerirDirecciones('calle').subscribe((r) => (resultado = r));
      http.expectOne(autocompletar).flush({});
      expect(resultado).toEqual([]);
    });

    it('guarda en caché: la misma búsqueda (sin importar mayúsculas) no vuelve a pedir', () => {
      servicio.sugerirDirecciones('Calle 6').subscribe();
      http.expectOne(autocompletar).flush({ features: [{ properties: { formatted: 'Calle 6', lat: 4, lon: -74, place_id: '1' } }] });

      let segunda: ResultadoDireccion[] = [];
      servicio.sugerirDirecciones('  calle 6 ').subscribe((r) => (segunda = r));

      http.expectNone(autocompletar);
      expect(segunda).toHaveLength(1);
    });

    it('si falla la red, el error llega a quien consulta y no se guarda en caché', () => {
      let fallo = false;
      servicio.sugerirDirecciones('calle').subscribe({ error: () => (fallo = true) });
      http.expectOne(autocompletar).error(new ProgressEvent('error'));
      expect(fallo).toBe(true);

      servicio.sugerirDirecciones('calle').subscribe();
      http.expectOne(autocompletar).flush({ features: [] });
    });
  });

  describe('buscarPorCoordenadas', () => {
    it('consulta la geocodificación inversa con el punto', () => {
      servicio.buscarPorCoordenadas(4.3365, -74.3638).subscribe();

      const req = http.expectOne(inversa);
      expect(req.request.params.get('lat')).toBe('4.3365');
      expect(req.request.params.get('lon')).toBe('-74.3638');
      expect(req.request.params.get('lang')).toBe('es');
      req.flush({ features: [] });
    });

    it('devuelve la dirección encontrada', () => {
      let direccion: string | null | undefined;
      servicio.buscarPorCoordenadas(4.3, -74.3).subscribe((d) => (direccion = d));
      http.expectOne(inversa).flush({ features: [{ properties: { formatted: 'Carrera 7 # 1-1', lat: 4.3, lon: -74.3 } }] });
      expect(direccion).toBe('Carrera 7 # 1-1');
    });

    it('devuelve null si el proveedor no conoce el punto', () => {
      let direccion: string | null | undefined;
      servicio.buscarPorCoordenadas(0, 0).subscribe((d) => (direccion = d));
      http.expectOne(inversa).flush({ features: [] });
      expect(direccion).toBeNull();
    });

    it('guarda en caché (también los puntos sin dirección) agrupando por cinco decimales', () => {
      servicio.buscarPorCoordenadas(4.123456, -74.123456).subscribe();
      http.expectOne(inversa).flush({ features: [] });

      let segunda: string | null | undefined = 'sin-resolver';
      servicio.buscarPorCoordenadas(4.123456, -74.123456).subscribe((d) => (segunda = d));

      http.expectNone(inversa);
      expect(segunda).toBeNull();
    });

    it('propaga el error de red', () => {
      let fallo = false;
      servicio.buscarPorCoordenadas(4.3, -74.3).subscribe({ error: () => (fallo = true) });
      http.expectOne(inversa).error(new ProgressEvent('error'));
      expect(fallo).toBe(true);
    });
  });
});
