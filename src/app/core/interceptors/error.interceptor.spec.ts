import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;
  let authService: { cerrarSesion: ReturnType<typeof vi.fn>; estaAutenticado: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { cerrarSesion: vi.fn(), estaAutenticado: vi.fn().mockReturnValue(true) };
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controlador.verify());

  /** Hace la petición, la responde con `status` y devuelve el error que le llega a quien la pidió. */
  function responder(url: string, status: number): unknown {
    let error: unknown;
    http.get(url).subscribe({ error: (e) => (error = e) });
    controlador.expectOne(url).flush({ error: 'x' }, { status, statusText: 'Error' });
    return error;
  }

  it('401 en una ruta normal cierra la sesión y lleva al login', () => {
    responder(`${API_BASE_URL}/cliente/citas`, 401);

    expect(authService.cerrarSesion).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('401 en /auth/login no redirige y deja pasar el error al formulario', () => {
    const error = responder(`${API_BASE_URL}/auth/login`, 401);

    expect(authService.cerrarSesion).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(error).toMatchObject({ status: 401 });
  });

  it('403 sin sesión válida cierra la sesión y lleva al login', () => {
    authService.estaAutenticado.mockReturnValue(false);

    responder(`${API_BASE_URL}/admin/citas`, 403);

    expect(authService.cerrarSesion).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('403 con sesión vigente no redirige y propaga el error', () => {
    const error = responder(`${API_BASE_URL}/admin/citas`, 403);

    expect(authService.cerrarSesion).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(error).toMatchObject({ status: 403 });
  });

  it('un error en una URL externa no redirige', () => {
    responder('https://api.geoapify.com/v1/geocode/search', 401);

    expect(authService.cerrarSesion).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
