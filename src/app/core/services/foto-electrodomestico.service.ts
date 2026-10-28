import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, concatMap, from, map, Observable, of, toArray } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { FotoElectrodomestico } from '../models/cita';
import type { FotoRequest } from '../models/foto';
import { obtenerMensajeError } from '../utils/manejo-errores';

export interface ResultadoSubidaFotos {
  subidas: FotoElectrodomestico[];
  /** Imágenes (data URL) que no se pudieron subir, para poder reintentarlas. */
  fallidas: string[];
  /** Mensaje del primer fallo, listo para mostrar. */
  mensajeError: string | null;
}

/** Fotos del electrodoméstico de una cita (máximo 3, mientras esté PENDIENTE o CONFIRMADA). */
@Injectable({ providedIn: 'root' })
export class FotoElectrodomesticoService {
  constructor(private http: HttpClient) {}

  subir(citaId: number, imagenBase64: string): Observable<FotoElectrodomestico> {
    const cuerpo: FotoRequest = { imagenBase64 };
    return this.http.post<FotoElectrodomestico>(`${API_BASE_URL}/cliente/citas/${citaId}/fotos`, cuerpo);
  }

  /** Responde 204 sin cuerpo. */
  eliminar(citaId: number, fotoId: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/cliente/citas/${citaId}/fotos/${fotoId}`);
  }

  /**
   * Sube las imágenes una por una. Si alguna falla, las demás siguen: el resultado dice cuáles
   * quedaron subidas y cuáles no, sin cortar el flujo de quien lo usa.
   */
  subirVarias(citaId: number, imagenes: string[]): Observable<ResultadoSubidaFotos> {
    return from(imagenes).pipe(
      concatMap((imagen) =>
        this.subir(citaId, imagen).pipe(
          map((foto) => ({ imagen, foto, error: null as string | null })),
          catchError((err) =>
            of({ imagen, foto: null, error: obtenerMensajeError(err, 'No fue posible subir la foto.') })
          )
        )
      ),
      toArray(),
      map((resultados) => ({
        subidas: resultados.flatMap((r) => (r.foto ? [r.foto] : [])),
        fallidas: resultados.filter((r) => !r.foto).map((r) => r.imagen),
        mensajeError: resultados.find((r) => r.error)?.error ?? null,
      }))
    );
  }
}
