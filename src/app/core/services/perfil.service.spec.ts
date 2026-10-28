import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { PerfilService } from './perfil.service';

describe('PerfilService', () => {
  let servicio: PerfilService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(PerfilService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('obtiene el perfil con GET /perfil', () => {
    let perfil: unknown;
    servicio.obtener().subscribe((p) => (perfil = p));

    const req = http.expectOne(`${API_BASE_URL}/perfil`);
    expect(req.request.method).toBe('GET');
    req.flush({ nombre: 'Ana', apellido: 'Pérez', correo: 'ana@correo.co', telefono: null, tipoDocumento: 'CC', numeroDocumento: '1' });
    expect(perfil).toMatchObject({ nombre: 'Ana', correo: 'ana@correo.co' });
  });

  it('actualiza con PUT /perfil enviando solo los campos editables', () => {
    let perfil: unknown;
    servicio.actualizar({ nombre: 'Ana', apellido: 'Gómez', telefono: '3001234567', direccion: 'Calle 6 # 12-34' }).subscribe((p) => (perfil = p));

    const req = http.expectOne(`${API_BASE_URL}/perfil`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nombre: 'Ana', apellido: 'Gómez', telefono: '3001234567', direccion: 'Calle 6 # 12-34' });
    req.flush({ nombre: 'Ana', apellido: 'Gómez' });
    expect(perfil).toMatchObject({ apellido: 'Gómez' });
  });

  it('propaga el mensaje de negocio del backend', () => {
    let mensaje: unknown;
    servicio.actualizar({ nombre: '', apellido: '' }).subscribe({ error: (e) => (mensaje = e.error.error) });
    http
      .expectOne(`${API_BASE_URL}/perfil`)
      .flush({ timestamp: 't', status: 400, error: 'El nombre es obligatorio' }, { status: 400, statusText: 'Bad Request' });
    expect(mensaje).toBe('El nombre es obligatorio');
  });
});
