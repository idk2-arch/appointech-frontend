import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

import { iniciales } from '../../core/utils/iniciales';
import { resolverUrlFoto } from '../../core/utils/url-foto';

export type TamanoAvatar = 'sm' | 'md' | 'lg';

/** Lado del círculo de cada tamaño (2, 2.5 y 5 rem). */
const LADO: Record<TamanoAvatar, string> = { sm: '2rem', md: '2.5rem', lg: '5rem' };

/**
 * Foto de una persona; si no hay foto, o no carga, un círculo con sus iniciales.
 * Solo muestra: subir o cambiar la foto es cosa de app-carga-foto.
 */
@Component({
  selector: 'app-avatar',
  standalone: false,
  templateUrl: './avatar.component.html',
  // El host es lo que participa en el flex del contenedor: con tamaño fijo y sin encogerse, ni un
  // nombre largo ni `max-width: 100%` de las imágenes pueden deformar el círculo.
  host: {
    style:
      'display:inline-block;flex:0 0 auto;flex-shrink:0;aspect-ratio:1/1;border-radius:50%;vertical-align:middle',
    '[style.width]': 'lado',
    '[style.min-width]': 'lado',
    '[style.height]': 'lado',
  },
})
export class AvatarComponent implements OnChanges {
  /** Ruta relativa que devuelve el backend (/api/fotos/...) o una URL completa. */
  @Input() fotoUrl: string | null | undefined = null;
  @Input() nombre: string | null | undefined = '';
  @Input() tamano: TamanoAvatar = 'md';

  src: string | null = null;
  fallo = false;

  get iniciales(): string {
    return iniciales(this.nombre);
  }

  get alt(): string {
    const nombre = this.nombre?.trim();
    return nombre ? `Foto de ${nombre}` : 'Foto de perfil';
  }

  get lado(): string {
    return LADO[this.tamano];
  }

  get claseTexto(): string {
    return { sm: 'fs-secundario', md: 'fs-cuerpo', lg: 'fs-titulo' }[this.tamano];
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['fotoUrl']) {
      this.src = resolverUrlFoto(this.fotoUrl);
      this.fallo = false;
    }
  }

  alFallar(): void {
    this.fallo = true;
  }
}
