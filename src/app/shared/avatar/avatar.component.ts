import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

import { iniciales } from '../../core/utils/iniciales';
import { resolverUrlFoto } from '../../core/utils/url-foto';

export type TamanoAvatar = 'sm' | 'md' | 'lg';

/**
 * Foto de una persona; si no hay foto, o no carga, un círculo con sus iniciales.
 * Solo muestra: subir o cambiar la foto es cosa de app-carga-foto.
 */
@Component({
  selector: 'app-avatar',
  standalone: false,
  templateUrl: './avatar.component.html',
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

  get clasesTamano(): string {
    return { sm: 'h-8 w-8 fs-secundario', md: 'h-10 w-10 fs-cuerpo', lg: 'h-20 w-20 fs-titulo' }[this.tamano];
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
