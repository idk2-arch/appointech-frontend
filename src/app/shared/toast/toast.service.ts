import { Injectable, signal } from '@angular/core';

import { TipoToast } from './toast.utils';

export interface AccionToast {
  etiqueta: string;
  accion: () => void;
}

/** Lo que cualquier código (hoy los componentes; mañana, p. ej., un servicio de notificaciones) pasa a `mostrar()`. */
export interface ConfigToast {
  tipo?: TipoToast;
  titulo: string;
  descripcion?: string;
  accion?: AccionToast;
  /** Milisegundos hasta que se cierra solo. Por defecto depende del tipo; 0 lo deja hasta que se cierre. */
  duracion?: number;
}

export interface ToastActivo {
  id: number;
  tipo: TipoToast;
  titulo: string;
  descripcion: string;
  accion: AccionToast | null;
  duracion: number;
}

export const MAXIMO_VISIBLES = 3;

/** Los errores y las advertencias se quedan más tiempo: hay más que leer. */
const DURACION_POR_TIPO: Record<TipoToast, number> = {
  exito: 4000,
  info: 4000,
  advertencia: 6000,
  error: 8000,
};

const claveDe = (aviso: Pick<ToastActivo, 'tipo' | 'titulo' | 'descripcion'>): string =>
  `${aviso.tipo}|${aviso.titulo}|${aviso.descripcion}`;

/**
 * Avisos emergentes de toda la app. Muestra como máximo `MAXIMO_VISIBLES` a la vez (los demás esperan en
 * cola) y descarta un aviso idéntico a otro que sigue visible o en espera.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _visibles = signal<readonly ToastActivo[]>([]);
  private cola: ToastActivo[] = [];
  private siguienteId = 1;

  readonly visibles = this._visibles.asReadonly();

  exito(titulo: string, descripcion?: string, accion?: AccionToast): number | null {
    return this.mostrar({ tipo: 'exito', titulo, descripcion, accion });
  }

  info(titulo: string, descripcion?: string, accion?: AccionToast): number | null {
    return this.mostrar({ tipo: 'info', titulo, descripcion, accion });
  }

  advertencia(titulo: string, descripcion?: string, accion?: AccionToast): number | null {
    return this.mostrar({ tipo: 'advertencia', titulo, descripcion, accion });
  }

  error(titulo: string, descripcion?: string, accion?: AccionToast): number | null {
    return this.mostrar({ tipo: 'error', titulo, descripcion, accion });
  }

  /** Devuelve el id del aviso, o `null` si se descartó por repetido. */
  mostrar(config: ConfigToast): number | null {
    const tipo = config.tipo ?? 'info';
    const aviso: ToastActivo = {
      id: this.siguienteId,
      tipo,
      titulo: config.titulo,
      descripcion: config.descripcion ?? '',
      accion: config.accion ?? null,
      duracion: config.duracion ?? DURACION_POR_TIPO[tipo],
    };
    const clave = claveDe(aviso);
    if ([...this._visibles(), ...this.cola].some((existente) => claveDe(existente) === clave)) return null;

    this.siguienteId++;
    if (this._visibles().length < MAXIMO_VISIBLES) this._visibles.update((lista) => [...lista, aviso]);
    else this.cola.push(aviso);
    return aviso.id;
  }

  /** Quita un aviso (el contenedor lo llama cuando termina su salida) y deja entrar al siguiente en espera. */
  cerrar(id: number): void {
    this._visibles.update((lista) => lista.filter((aviso) => aviso.id !== id));
    this.cola = this.cola.filter((aviso) => aviso.id !== id);
    const siguiente = this.cola.shift();
    if (siguiente && this._visibles().length < MAXIMO_VISIBLES) this._visibles.update((lista) => [...lista, siguiente]);
  }
}
