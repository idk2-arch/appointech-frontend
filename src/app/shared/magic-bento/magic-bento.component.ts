import { booleanAttribute, Component, Input, numberAttribute } from '@angular/core';

/**
 * Cuadrícula "bento" de tarjetas de tamaños distintos (traducción a Angular de MagicBento, de React Bits).
 * Las columnas bajan solas de `columns` a 2 y a 1 según el ancho del propio contenedor (consultas de
 * contenedor en magic-bento.css). La luz del cursor y el brillo del borde, incluso entre tarjetas vecinas, los
 * pone la directiva de spotlight que ya existe en la app; la entrada escalonada y la onda del clic, el CSS y la tarjeta.
 *
 * Se dejan fuera del original el efecto de inclinación, el magnetismo, las estrellas y las ilustraciones.
 */
@Component({
  selector: 'app-magic-bento',
  standalone: false,
  template: `
    <div
      class="magic-bento"
      [style.--mb-columnas]="columns"
      [style.--mb-fila-alto.px]="rowHeight"
      [style.--mb-hueco.px]="gap"
      [style.--mb-radio.px]="radius"
      [attr.data-sin-animacion]="disableAnimations ? '' : null"
    >
      <ng-content></ng-content>
    </div>
  `,
})
export class MagicBentoComponent {
  /** Columnas en pantallas anchas (de 2 a 4); en las angostas baja a 2 y luego a 1. */
  @Input({ transform: numberAttribute }) columns = 4;
  @Input({ transform: numberAttribute }) rowHeight = 200;
  @Input({ transform: numberAttribute }) gap = 12;
  @Input({ transform: numberAttribute }) radius = 20;
  @Input({ transform: numberAttribute }) spotlightRadius = 300;
  /** Luz suave que sigue al cursor dentro de la tarjeta. */
  @Input({ transform: booleanAttribute }) enableSpotlight = true;
  /** Borde que brilla cerca del cursor, también en las tarjetas vecinas. */
  @Input({ transform: booleanAttribute }) enableBorderGlow = true;
  /** Onda de luz al hacer clic en una tarjeta interactiva. */
  @Input({ transform: booleanAttribute }) clickEffect = true;
  /** Apaga la entrada escalonada y todos los efectos de movimiento. */
  @Input({ transform: booleanAttribute }) disableAnimations = false;
}
