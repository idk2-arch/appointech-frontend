import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;
  let obtenerToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    obtenerToken = vi.fn().mockReturnValue('abc.def.ghi');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { obtenerToken } },
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controlador.verify());

  it('añade el token a las peticiones a nuestra API', () => {
    http.get(`${API_BASE_URL}/perfil`).subscribe();

    const req = controlador.expectOne(`${API_BASE_URL}/perfil`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc.def.ghi');
    req.flush({});
  });

  it('sin token no añade la cabecera', () => {
    obtenerToken.mockReturnValue(null);
    http.get(`${API_BASE_URL}/auth/login`).subscribe();

    const req = controlador.expectOne(`${API_BASE_URL}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('nunca envía el token a servicios externos como Geoapify', () => {
    http.get('https://api.geoapify.com/v1/geocode/search').subscribe();

    const req = controlador.expectOne('https://api.geoapify.com/v1/geocode/search');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(obtenerToken).not.toHaveBeenCalled();
    req.flush({});
  });

  it('no modifica el cuerpo ni el método de la petición', () => {
    http.put(`${API_BASE_URL}/perfil`, { nombre: 'Ana' }).subscribe();

    const req = controlador.expectOne(`${API_BASE_URL}/perfil`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nombre: 'Ana' });
    req.flush({});
  });
});
