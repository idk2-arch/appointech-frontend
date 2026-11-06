import { booleanAttribute, Component, HostBinding, Input, numberAttribute, Optional } from '@angular/core';

import { SpotlightService } from '../spotlight/spotlight.service';
import { MagicBentoComponent } from './magic-bento.component';

interface Onda {
  id: number;
  x: number;
  y: number;
}

const INTENSIDAD_LUZ = 0.14;
const BRILLO_BORDE = 0.9;
/** Distancia (px) a la que el borde empieza a brillar: cubre el hueco entre tarjetas vecinas. */
const PROXIMIDAD_BORDE = 120;

/**
 * Tarjeta de un `app-magic-bento`: ocupa `colSpan` columnas y `rowSpan` filas y muestra lo que se proyecte
 * dentro. Con `enlace` es un <a routerLink> real (focusable y con onda de luz al hacer clic); sin él, un bloque
 * estático que no recibe foco. Con `luz` en falso (p. ej. un esqueleto de carga) no reacciona al cursor.
 */
@Component({
  selector: 'app-magic-bento-card',
  standalone: false,
  templateUrl: './magic-bento-card.component.html',
})
export class MagicBentoCardComponent {
  @Input({ transform: numberAttribute }) colSpan = 1;
  @Input({ transform: numberAttribute }) rowSpan = 1;
  /** Ruta a la que lleva la tarjeta; sin ella no es interactiva. */
  @Input() enlace: string | readonly string[] | null = null;
  @Input({ transform: booleanAttribute }) luz = true;
  /** Texto para lectores de pantalla cuando la tarjeta es un enlace. */
  @Input() etiqueta: string | null = null;

  ondas: Onda[] = [];

  private siguienteOnda = 1;
  /** Se lee una vez: con menos movimiento no hay luces que se muevan. */
  private readonly menosMovimiento: boolean;

  constructor(
    spotlight: SpotlightService,
    @Optional() private contenedor: MagicBentoComponent | null
  ) {
    this.menosMovimiento = spotlight.prefiereMenosMovimiento;
  }

  @HostBinding('style.--mb-col-span') get hostColumnas(): number {
    return Math.max(1, this.colSpan);
  }

  @HostBinding('style.--mb-row-span') get hostFilas(): number {
    return Math.max(1, this.rowSpan);
  }

  @HostBinding('attr.data-col') get hostCol(): number {
    return Math.max(1, this.colSpan);
  }

  get sinMovimiento(): boolean {
    return this.menosMovimiento || (this.contenedor?.disableAnimations ?? false);
  }

  private get conLuz(): boolean {
    return this.luz && !this.sinMovimiento;
  }

  get intensidad(): number {
    return this.conLuz && (this.contenedor?.enableSpotlight ?? true) ? INTENSIDAD_LUZ : 0;
  }

  get brillo(): number {
    return this.conLuz && (this.contenedor?.enableBorderGlow ?? true) ? BRILLO_BORDE : 0;
  }

  get proximidad(): number {
    return this.conLuz && (this.contenedor?.enableBorderGlow ?? true) ? PROXIMIDAD_BORDE : 0;
  }

  get radioLuz(): number {
    return this.contenedor?.spotlightRadius ?? 300;
  }

  private get ondaActiva(): boolean {
    return !!this.enlace && !this.sinMovimiento && (this.contenedor?.clickEffect ?? true);
  }

  /** Onda de luz desde el punto del clic (o desde el centro si se activó con el teclado). */
  alClic(evento: MouseEvent): void {
    if (!this.ondaActiva) return;
    const caja = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    const desdeTeclado = evento.detail === 0;
    this.ondas.push({
      id: this.siguienteOnda++,
      x: desdeTeclado ? caja.width / 2 : evento.clientX - caja.left,
      y: desdeTeclado ? caja.height / 2 : evento.clientY - caja.top,
    });
  }

  quitarOnda(id: number): void {
    this.ondas = this.ondas.filter((onda) => onda.id !== id);
  }
}
