import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { GOOGLE_CLIENT_ID } from '../config/api.config';

const URL_SCRIPT = 'https://accounts.google.com/gsi/client';
/** Lo que se espera a que el script de Google cargue antes de rendirse. */
const ESPERA_MAXIMA_MS = 5000;

interface GoogleId {
  initialize(opciones: { client_id: string; callback: (respuesta: { credential: string }) => void }): void;
  renderButton(contenedor: HTMLElement, opciones: Record<string, unknown>): void;
}
type GoogleGlobal = { accounts?: { id?: GoogleId } };

/**
 * Google Identity Services, una sola vez por carga de página: el script se pide cuando hace falta (después del primer
 * pintado, no en el `index.html`), `initialize` se llama una única vez (Google solo usa la última llamada y avisa si
 * se repite) y las credenciales llegan por un Subject para que cada pantalla con botón se suscriba sin tocar a Google.
 */
@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private readonly credenciales = new Subject<string>();
  /** El token (ID token de Google) cuando la persona elige su cuenta. */
  readonly credencial$: Observable<string> = this.credenciales.asObservable();

  private carga?: Promise<void>;
  private inicializado = false;

  /** Dibuja el botón de Google en `contenedor`; carga e inicializa Google si todavía no se había hecho. */
  async dibujarBoton(contenedor: HTMLElement, ancho: number): Promise<void> {
    const google = await this.listo();
    google.renderButton(contenedor, {
      theme: 'filled_black',
      size: 'large',
      text: 'signin_with',
      locale: 'es',
      shape: 'rectangular',
      width: ancho,
    });
  }

  private async listo(): Promise<GoogleId> {
    await this.cargarScript();
    const google = this.google();
    if (!google) throw new Error('Google Identity Services no está disponible');
    if (!this.inicializado) {
      this.inicializado = true;
      google.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (respuesta) => this.credenciales.next(respuesta.credential) });
    }
    return google;
  }

  private google(): GoogleId | undefined {
    return (globalThis as { google?: GoogleGlobal }).google?.accounts?.id;
  }

  /** Un solo script por página; si falla, el siguiente intento lo vuelve a pedir. */
  private cargarScript(): Promise<void> {
    if (this.google()) return Promise.resolve();
    this.carga ??= new Promise<void>((resolver, rechazar) => {
      const script = document.createElement('script');
      script.src = URL_SCRIPT;
      script.async = true;
      script.defer = true;
      const limite = setTimeout(() => fallar(new Error('Google tardó demasiado en cargar')), ESPERA_MAXIMA_MS);
      const fallar = (error: Error): void => {
        clearTimeout(limite);
        script.remove();
        this.carga = undefined;
        rechazar(error);
      };
      script.onload = () => {
        clearTimeout(limite);
        resolver();
      };
      script.onerror = () => fallar(new Error('No se pudo cargar el script de Google'));
      document.head.appendChild(script);
    });
    return this.carga;
  }
}
