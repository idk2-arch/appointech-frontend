import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, shareReplay, throwError } from 'rxjs';

import { resolverUrlFoto } from '../utils/url-foto';

/**
 * Descarga las fotos de una cita con el token JWT (el interceptor lo añade) y las entrega como URL
 * de objeto, porque un <img src> directo no puede enviar la cabecera Authorization.
 *
 * No es un singleton: lo provee cada componente que muestra fotos, de modo que sus URLs de objeto
 * se liberan (revokeObjectURL) cuando el componente se destruye.
 */
@Injectable()
export class FotoCitaService implements OnDestroy {
  private readonly pendientes = new Map<string, Observable<string>>();
  private readonly objetos = new Map<string, string>();

  constructor(private http: HttpClient) {}

  /** URL de objeto de la foto; una sola descarga por foto aunque se pida varias veces. */
  urlSegura(rutaFoto: string): Observable<string> {
    const enCache = this.pendientes.get(rutaFoto);
    if (enCache) return enCache;

    const direccion = resolverUrlFoto(rutaFoto) ?? rutaFoto;
    const descarga = this.http.get(direccion, { responseType: 'blob' }).pipe(
      map((contenido) => {
        const objeto = URL.createObjectURL(contenido);
        this.objetos.set(rutaFoto, objeto);
        return objeto;
      }),
      catchError((error) => {
        // Un fallo no se guarda: el siguiente intento vuelve a descargar.
        this.pendientes.delete(rutaFoto);
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.pendientes.set(rutaFoto, descarga);
    return descarga;
  }

  /** Libera una foto en particular (por ejemplo, cuando se elimina). */
  liberar(rutaFoto: string): void {
    const objeto = this.objetos.get(rutaFoto);
    if (objeto) URL.revokeObjectURL(objeto);
    this.objetos.delete(rutaFoto);
    this.pendientes.delete(rutaFoto);
  }

  ngOnDestroy(): void {
    this.objetos.forEach((objeto) => URL.revokeObjectURL(objeto));
    this.objetos.clear();
    this.pendientes.clear();
  }
}
