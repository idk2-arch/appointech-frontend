import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface LoginRequest {
  correo: string;
  contrasena: string;
}

export interface AuthResponse {
  token: string;
  perfilCompleto: boolean;
}

export interface RegistroClienteRequest {
  nombre: string;
  correo: string;
  contrasena: string;
  telefono: string;
  numeroDocumento: string;
  direccion: string;
}

export interface RegistroResponse {
  token?: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export type TipoDocumento = 'CC' | 'CE' | 'PASAPORTE';

export interface CompletarPerfilRequest {
  telefono: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  direccion?: string;
}

export interface CompletarPerfilResponse {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
}

interface JwtPayload {
  sub: string;
  id: number;
  rol: string;
  exp: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'appointech_token';

  constructor(private http: HttpClient) {}

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/login`, request)
      .pipe(tap((response) => this.guardarToken(response.token)));
  }

  registrarCliente(request: RegistroClienteRequest): Observable<RegistroResponse> {
    return this.http.post<RegistroResponse>(`${API_BASE_URL}/auth/registro/cliente`, request).pipe(
      tap((response) => {
        if (response?.token) {
          this.guardarToken(response.token);
        }
      })
    );
  }

  loginConGoogle(idToken: string): Observable<AuthResponse> {
    const request: GoogleLoginRequest = { idToken };
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/google`, request)
      .pipe(tap((response) => this.guardarToken(response.token)));
  }

  completarPerfil(request: CompletarPerfilRequest): Observable<CompletarPerfilResponse> {
    return this.http.patch<CompletarPerfilResponse>(`${API_BASE_URL}/auth/completar-perfil`, request);
  }

  guardarToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  obtenerToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  cerrarSesion(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  estaAutenticado(): boolean {
    const token = this.obtenerToken();
    if (!token) return false;

    const payload = this.decodificarToken(token);
    if (!payload) return false;

    const ahora = Math.floor(Date.now() / 1000);
    return payload.exp > ahora;
  }

  obtenerRol(): string | null {
    const token = this.obtenerToken();
    if (!token) return null;

    const payload = this.decodificarToken(token);
    return payload?.rol ?? null;
  }

  redirigirSegunRol(router: Router): void {
    const ruta = this.obtenerRol() === 'ADMINISTRADOR' ? '/admin/usuarios' : '/';
    router.navigate([ruta]);
  }

  redirigirSegunRolYPerfil(router: Router, perfilCompleto: boolean): void {
    if (!perfilCompleto) {
      router.navigate(['/completar-perfil']);
      return;
    }
    this.redirigirSegunRol(router);
  }

  private decodificarToken(token: string): JwtPayload | null {
    try {
      const payloadBase64 = token.split('.')[1];
      const payloadJson = atob(payloadBase64);
      return JSON.parse(payloadJson) as JwtPayload;
    } catch {
      return null;
    }
  }
}
