import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';

/** Un JWT sin firma real: al frontend solo le importa el payload. */
function jwt(payload: object): string {
  return `cabecera.${btoa(JSON.stringify(payload))}.firma`;
}

const AHORA = Math.floor(Date.now() / 1000);

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  describe('peticiones', () => {
    it('login: envía las credenciales, guarda el token y devuelve los datos', () => {
      let datos: unknown;
      auth.login({ correo: 'ana@correo.co', contrasena: 'secreta123' }).subscribe((d) => (datos = d));

      const req = http.expectOne(`${API_BASE_URL}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ correo: 'ana@correo.co', contrasena: 'secreta123' });
      req.flush({ datos: { token: 'tok-1', perfilCompleto: true } });

      expect(datos).toEqual({ token: 'tok-1', perfilCompleto: true });
      expect(auth.obtenerToken()).toBe('tok-1');
    });

    it('login con credenciales incorrectas propaga el 401 y no guarda token', () => {
      let estado = 0;
      auth.login({ correo: 'a@b.co', contrasena: 'mala' }).subscribe({ error: (e) => (estado = e.status) });
      http.expectOne(`${API_BASE_URL}/auth/login`).flush({}, { status: 401, statusText: 'Unauthorized' });

      expect(estado).toBe(401);
      expect(auth.obtenerToken()).toBeNull();
    });

    it('loginConGoogle: envía el idToken y guarda el token', () => {
      auth.loginConGoogle('id-token-google').subscribe();

      const req = http.expectOne(`${API_BASE_URL}/auth/google`);
      expect(req.request.body).toEqual({ idToken: 'id-token-google' });
      req.flush({ datos: { token: 'tok-g', perfilCompleto: false } });

      expect(auth.obtenerToken()).toBe('tok-g');
    });

    const registro = {
      nombre: 'Ana',
      apellido: 'Pérez',
      correo: 'ana@correo.co',
      contrasena: 'secreta123',
      tipoDocumento: 'CC' as const,
      direccion: 'Calle 6',
    };

    it('registrarCliente: si el backend devuelve token, inicia la sesión', () => {
      let datos: unknown;
      auth.registrarCliente(registro).subscribe((d) => (datos = d));

      const req = http.expectOne(`${API_BASE_URL}/auth/registro/cliente`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(registro);
      req.flush({ datos: { token: 'tok-r' } });

      expect(datos).toEqual({ token: 'tok-r' });
      expect(auth.obtenerToken()).toBe('tok-r');
    });

    it('registrarCliente: si no devuelve token, no toca la sesión', () => {
      auth.registrarCliente(registro).subscribe();
      http.expectOne(`${API_BASE_URL}/auth/registro/cliente`).flush({ datos: {} });
      expect(auth.obtenerToken()).toBeNull();
    });

    it('completarPerfil: usa PATCH y devuelve los datos de la persona', () => {
      let datos: unknown;
      auth
        .completarPerfil({ telefono: '3001234567', tipoDocumento: 'CC', numeroDocumento: '1', direccion: 'Calle 6' })
        .subscribe((d) => (datos = d));

      const req = http.expectOne(`${API_BASE_URL}/auth/completar-perfil`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ datos: { id: 1, nombre: 'Ana', apellido: 'Pérez', correo: 'ana@correo.co', rol: 'CLIENTE' } });

      expect(datos).toMatchObject({ id: 1, rol: 'CLIENTE' });
    });
  });

  describe('sesión y token', () => {
    it('guarda y devuelve el token; cerrarSesion lo borra', () => {
      auth.guardarToken('tok');
      expect(auth.obtenerToken()).toBe('tok');

      auth.cerrarSesion();
      expect(auth.obtenerToken()).toBeNull();
    });

    it('sin token no está autenticado ni tiene rol', () => {
      expect(auth.estaAutenticado()).toBe(false);
      expect(auth.obtenerRol()).toBeNull();
    });

    it('con un token vigente está autenticado y conoce el rol', () => {
      auth.guardarToken(jwt({ sub: 'ana@correo.co', id: 1, rol: 'CLIENTE', exp: AHORA + 3600 }));
      expect(auth.estaAutenticado()).toBe(true);
      expect(auth.obtenerRol()).toBe('CLIENTE');
    });

    it('con un token vencido no está autenticado', () => {
      auth.guardarToken(jwt({ sub: 'ana@correo.co', id: 1, rol: 'CLIENTE', exp: AHORA - 10 }));
      expect(auth.estaAutenticado()).toBe(false);
    });

    it('un token ilegible no está autenticado y no rompe', () => {
      auth.guardarToken('esto-no-es-un-jwt');
      expect(auth.estaAutenticado()).toBe(false);
      expect(auth.obtenerRol()).toBeNull();

      auth.guardarToken('a.%%%.c');
      expect(auth.estaAutenticado()).toBe(false);
    });

    it('un token sin rol devuelve rol nulo', () => {
      auth.guardarToken(jwt({ sub: 'x', id: 1, exp: AHORA + 60 }));
      expect(auth.obtenerRol()).toBeNull();
    });
  });

  describe('redirecciones', () => {
    let navegar: ReturnType<typeof vi.fn>;
    let router: Router;

    beforeEach(() => {
      navegar = vi.fn().mockResolvedValue(true);
      router = { navigate: navegar } as unknown as Router;
    });

    it.each([
      ['ADMINISTRADOR', '/admin/usuarios'],
      ['CLIENTE', '/cliente'],
      ['TECNICO', '/tecnico'],
    ])('el rol %s va a %s', (rol, ruta) => {
      auth.guardarToken(jwt({ sub: 'x', id: 1, rol, exp: AHORA + 60 }));
      auth.redirigirSegunRol(router);
      expect(navegar).toHaveBeenCalledWith([ruta]);
    });

    it('un rol desconocido o sin sesión va a la raíz', () => {
      auth.redirigirSegunRol(router);
      expect(navegar).toHaveBeenCalledWith(['/']);

      auth.guardarToken(jwt({ sub: 'x', id: 1, rol: 'OTRO', exp: AHORA + 60 }));
      auth.redirigirSegunRol(router);
      expect(navegar).toHaveBeenLastCalledWith(['/']);
    });

    it('con el perfil incompleto, primero a completar el perfil', () => {
      auth.guardarToken(jwt({ sub: 'x', id: 1, rol: 'CLIENTE', exp: AHORA + 60 }));
      auth.redirigirSegunRolYPerfil(router, false);
      expect(navegar).toHaveBeenCalledWith(['/completar-perfil']);
    });

    it('con el perfil completo, según el rol', () => {
      auth.guardarToken(jwt({ sub: 'x', id: 1, rol: 'TECNICO', exp: AHORA + 60 }));
      auth.redirigirSegunRolYPerfil(router, true);
      expect(navegar).toHaveBeenCalledWith(['/tecnico']);
    });
  });
});
