import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';
import { SesionService } from './sesion.service';

describe('SesionService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('guarda la foto, la publica y la recupera tras un refresco', async () => {
    const sesion = TestBed.inject(SesionService);
    sesion.establecerFoto('/api/fotos/abc');

    expect(await firstValueFrom(sesion.fotoUrl$)).toBe('/api/fotos/abc');
    expect(localStorage.getItem('appointech_foto_url')).toBe('/api/fotos/abc');

    TestBed.resetTestingModule();
    expect(TestBed.inject(SesionService).fotoUrl).toBe('/api/fotos/abc');
  });

  it('limpiar borra la foto de la memoria y del almacenamiento', () => {
    const sesion = TestBed.inject(SesionService);
    sesion.establecerFoto('/api/fotos/abc');

    sesion.limpiar();

    expect(sesion.fotoUrl).toBeNull();
    expect(localStorage.getItem('appointech_foto_url')).toBeNull();
  });
});

describe('AuthService y la foto de la sesión', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let sesion: SesionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    sesion = TestBed.inject(SesionService);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function iniciarSesion(fotoUrl?: string | null): void {
    auth.login({ correo: 'a@b.co', contrasena: 'x' }).subscribe();
    http
      .expectOne(`${API_BASE_URL}/auth/login`)
      .flush({ datos: { token: 'tkn', perfilCompleto: true, fotoUrl } });
  }

  it('el login guarda la foto que devuelve el backend', () => {
    iniciarSesion('/api/fotos/abc');
    expect(sesion.fotoUrl).toBe('/api/fotos/abc');
    expect(auth.obtenerToken()).toBe('tkn');
  });

  it('un login sin foto deja la sesión sin foto', () => {
    sesion.establecerFoto('/api/fotos/vieja');
    iniciarSesion(null);
    expect(sesion.fotoUrl).toBeNull();
  });

  it('cerrar sesión borra la foto', () => {
    iniciarSesion('/api/fotos/abc');
    auth.cerrarSesion();
    expect(sesion.fotoUrl).toBeNull();
  });
});
