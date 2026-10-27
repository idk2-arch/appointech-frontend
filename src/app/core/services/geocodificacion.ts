import { Observable } from 'rxjs';

export interface ResultadoDireccion {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
}

/** Sugerencias de direcciones mientras la persona escribe. */
export abstract class BuscadorDirecciones {
  /** Debe emitir error si falla el proveedor, para que la vista pueda avisar. */
  abstract sugerirDirecciones(texto: string): Observable<ResultadoDireccion[]>;
}

/** Dirección en texto a partir de un punto del mapa. */
export abstract class GeocodificadorInverso {
  /** Emite null cuando el proveedor no conoce el punto. */
  abstract buscarPorCoordenadas(latitud: number, longitud: number): Observable<string | null>;
}
