import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Datos de la persona con sesión iniciada que la interfaz necesita mostrar (hoy, su foto).
 * Se guarda en localStorage para que sobreviva a un refresco de la página.
 */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly FOTO_KEY = 'appointech_foto_url';
  private readonly foto = new BehaviorSubject<string | null>(this.leerFoto());

  readonly fotoUrl$: Observable<string | null> = this.foto.asObservable();

  get fotoUrl(): string | null {
    return this.foto.value;
  }

  establecerFoto(fotoUrl: string | null | undefined): void {
    const valor = fotoUrl || null;
    try {
      if (valor) localStorage.setItem(this.FOTO_KEY, valor);
      else localStorage.removeItem(this.FOTO_KEY);
    } catch {
      // Sin almacenamiento disponible la foto vale solo mientras la página siga abierta.
    }
    this.foto.next(valor);
  }

  limpiar(): void {
    this.establecerFoto(null);
  }

  private leerFoto(): string | null {
    try {
      return localStorage.getItem(this.FOTO_KEY);
    } catch {
      return null;
    }
  }
}
