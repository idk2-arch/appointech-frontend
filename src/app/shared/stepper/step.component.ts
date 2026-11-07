import { Component, Input, TemplateRef, ViewChild } from '@angular/core';

/**
 * Un paso del asistente `app-stepper`. Su contenido se proyecta dentro de una plantilla que el asistente
 * dibuja solo cuando el paso está a la vista; quien lo usa decide con `@if` cuándo existen sus componentes.
 */
@Component({
  selector: 'app-step',
  standalone: false,
  template: `
    <ng-template #contenido>
      <div class="stepper__step"><ng-content></ng-content></div>
    </ng-template>
  `,
})
export class StepComponent {
  /** Etiqueta bajo el indicador (o a su lado en vertical). */
  @Input() title = '';
  /** Segunda línea junto al indicador en la disposición vertical. */
  @Input() description = '';
  /** Trazado SVG (24 × 24, de contorno) que reemplaza el número dentro del indicador. */
  @Input() icon = '';
  /** Impide volver a este paso desde los indicadores (p. ej. cuando algo ya no se puede editar). */
  @Input() locked = false;

  @ViewChild('contenido', { static: true }) contenido!: TemplateRef<unknown>;
}
