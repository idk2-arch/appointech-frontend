import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

import type { Perfil } from '../models/perfil';

/**
 * Datos de la persona con sesión iniciada que la interfaz necesita mostrar (su foto y su nombre).
 * Se guardan en localStorage para que sobrevivan a un refresco de la página.
 */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly FOTO_KEY = 'appointech_foto_url';
  private readonly NOMBRE_KEY = 'appointech_nombre';
  private readonly foto = new BehaviorSubject<string | null>(this.leer(this.FOTO_KEY));
  private readonly nombre = new BehaviorSubject<string | null>(this.leer(this.NOMBRE_KEY));

  readonly fotoUrl$: Observable<string | null> = this.foto.asObservable();
  readonly nombre$: Observable<string | null> = this.nombre.asObservable();

  get fotoUrl(): string | null {
    return this.foto.value;
  }

  /**
   * Último perfil conocido de esta sesión, solo en memoria: trae documento y dirección, así que nunca se
   * guarda en el almacenamiento del navegador y se borra al cerrar sesión. Sirve para pintar Mi perfil al instante.
   */
  private perfil: Perfil | null = null;

  get perfilActual(): Perfil | null {
    return this.perfil;
  }

  establecerPerfil(perfil: Perfil | null): void {
    this.perfil = perfil;
  }

  get nombreActual(): string | null {
    return this.nombre.value;
  }

  establecerFoto(fotoUrl: string | null | undefined): void {
    this.foto.next(this.guardar(this.FOTO_KEY, fotoUrl));
  }

  establecerNombre(nombre: string | null | undefined): void {
    this.nombre.next(this.guardar(this.NOMBRE_KEY, nombre));
  }

  private readonly limpiado = new Subject<void>();
  /** Avisa cuando se cierra la sesión: lo guardado en memoria de esa persona debe olvidarse. */
  readonly limpiado$ = this.limpiado.asObservable();

  limpiar(): void {
    this.perfil = null;
    this.limpiado.next();
    this.establecerFoto(null);
    this.establecerNombre(null);
  }

  /** Guarda (o borra, si no hay valor) y devuelve el valor normalizado. */
  private guardar(clave: string, valor: string | null | undefined): string | null {
    const normalizado = valor?.trim() || null;
    try {
      if (normalizado) localStorage.setItem(clave, normalizado);
      else localStorage.removeItem(clave);
    } catch {
      // Sin almacenamiento disponible el dato vale solo mientras la página siga abierta.
    }
    return normalizado;
  }

  private leer(clave: string): string | null {
    try {
      return localStorage.getItem(clave);
    } catch {
      return null;
    }
  }
}
