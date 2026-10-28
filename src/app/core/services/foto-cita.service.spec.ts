import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { FotoCitaService } from './foto-cita.service';

const RUTA = '/api/citas/4/fotos/9';
const DIRECCION = `${new URL(API_BASE_URL).origin}${RUTA}`;

describe('FotoCitaService', () => {
  let servicio: FotoCitaService;
  let http: HttpTestingController;
  let crearUrl: ReturnType<typeof vi.fn>;
  let revocarUrl: ReturnType<typeof vi.fn>;
  let contador: number;

  beforeEach(() => {
    contador = 0;
    crearUrl = vi.fn(() => `blob:objeto-${++contador}`);
    revocarUrl = vi.fn();
    // jsdom no implementa las URL de objeto.
    Object.defineProperty(URL, 'createObjectURL', { value: crearUrl, configurable: true, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revocarUrl, configurable: true, writable: true });

    TestBed.configureTestingModule({
      providers: [FotoCitaService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(FotoCitaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  function pedir(ruta = RUTA): string[] {
    const recibidas: string[] = [];
    servicio.urlSegura(ruta).subscribe((url) => recibidas.push(url));
    return recibidas;
  }

  it('descarga la foto como blob desde la URL completa del servidor y entrega una URL de objeto', () => {
    const recibidas = pedir();

    const req = http.expectOne(DIRECCION);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x'], { type: 'image/jpeg' }));

    expect(recibidas).toEqual(['blob:objeto-1']);
    expect(crearUrl).toHaveBeenCalledTimes(1);
  });

  it('guarda en caché: pedir otra vez la misma foto no vuelve a descargar', () => {
    const primera = pedir();
    http.expectOne(DIRECCION).flush(new Blob(['x']));

    const segunda = pedir();

    http.expectNone(DIRECCION);
    expect(segunda).toEqual(primera);
    expect(crearUrl).toHaveBeenCalledTimes(1);
  });

  it('pedidas a la vez, comparten una sola descarga', () => {
    const a = pedir();
    const b = pedir();

    http.expectOne(DIRECCION).flush(new Blob(['x']));

    expect(a).toEqual(['blob:objeto-1']);
    expect(b).toEqual(['blob:objeto-1']);
  });

  it('una foto distinta se descarga aparte', () => {
    pedir(RUTA);
    pedir('/api/citas/4/fotos/10');

    http.expectOne(DIRECCION).flush(new Blob(['x']));
    http.expectOne(`${new URL(API_BASE_URL).origin}/api/citas/4/fotos/10`).flush(new Blob(['y']));

    expect(crearUrl).toHaveBeenCalledTimes(2);
  });

  it('si la descarga falla propaga el error y no lo guarda: el siguiente intento vuelve a pedir', () => {
    let fallo = false;
    servicio.urlSegura(RUTA).subscribe({ error: () => (fallo = true) });
    http.expectOne(DIRECCION).error(new ProgressEvent('error'), { status: 404, statusText: 'Not Found' });
    expect(fallo).toBe(true);

    const reintento = pedir();
    http.expectOne(DIRECCION).flush(new Blob(['x']));

    expect(reintento).toEqual(['blob:objeto-1']);
  });

  it('liberar revoca la URL de esa foto y la vuelve a descargar si se pide otra vez', () => {
    pedir();
    http.expectOne(DIRECCION).flush(new Blob(['x']));

    servicio.liberar(RUTA);

    expect(revocarUrl).toHaveBeenCalledWith('blob:objeto-1');
    pedir();
    http.expectOne(DIRECCION).flush(new Blob(['x']));
  });

  it('liberar una foto que nunca se cargó no hace nada', () => {
    servicio.liberar('/api/citas/1/fotos/1');
    expect(revocarUrl).not.toHaveBeenCalled();
  });

  it('al destruirse revoca todas las URLs de objeto', () => {
    pedir(RUTA);
    pedir('/api/citas/4/fotos/10');
    http.expectOne(DIRECCION).flush(new Blob(['x']));
    http.expectOne(`${new URL(API_BASE_URL).origin}/api/citas/4/fotos/10`).flush(new Blob(['y']));

    servicio.ngOnDestroy();

    expect(revocarUrl).toHaveBeenCalledTimes(2);
    expect(revocarUrl).toHaveBeenCalledWith('blob:objeto-1');
    expect(revocarUrl).toHaveBeenCalledWith('blob:objeto-2');
  });

  it('destruirse dos veces no revoca dos veces', () => {
    pedir();
    http.expectOne(DIRECCION).flush(new Blob(['x']));

    servicio.ngOnDestroy();
    servicio.ngOnDestroy();

    expect(revocarUrl).toHaveBeenCalledTimes(1);
  });
});
