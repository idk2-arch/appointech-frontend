import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { FotoPerfilService } from './foto-perfil.service';

describe('FotoPerfilService', () => {
  let servicio: FotoPerfilService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(FotoPerfilService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sube la foto propia con PUT /perfil/foto', () => {
    let resultado: unknown;
    servicio.subirPropia('data:image/jpeg;base64,AAAA').subscribe((r) => (resultado = r));

    const req = http.expectOne(`${API_BASE_URL}/perfil/foto`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ imagenBase64: 'data:image/jpeg;base64,AAAA' });
    req.flush({ fotoUrl: '/api/fotos/abc' });
    expect(resultado).toEqual({ fotoUrl: '/api/fotos/abc' });
  });

  it('quita la foto propia con DELETE /perfil/foto', () => {
    let completo = false;
    servicio.quitarPropia().subscribe({ complete: () => (completo = true) });

    const req = http.expectOne(`${API_BASE_URL}/perfil/foto`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(completo).toBe(true);
  });

  it('el administrador sube la foto de otro usuario con PUT /admin/usuarios/{id}/foto', () => {
    servicio.subirDeUsuario(9, 'data:image/jpeg;base64,BBBB').subscribe();

    const req = http.expectOne(`${API_BASE_URL}/admin/usuarios/9/foto`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ imagenBase64: 'data:image/jpeg;base64,BBBB' });
    req.flush({ fotoUrl: '/api/fotos/xyz' });
  });

  it('propaga el mensaje de negocio del backend', () => {
    let mensaje: unknown;
    servicio.subirPropia('x').subscribe({ error: (e) => (mensaje = e.error.error) });
    http
      .expectOne(`${API_BASE_URL}/perfil/foto`)
      .flush({ timestamp: 't', status: 400, error: 'Imagen inválida' }, { status: 400, statusText: 'Bad Request' });
    expect(mensaje).toBe('Imagen inválida');
  });
});
