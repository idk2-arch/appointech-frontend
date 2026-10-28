import { Component, Input } from '@angular/core';

import { EstadoCita } from '../../core/models/cita';
import { claseInsigniaEstado, etiquetaEstadoCita } from '../../core/utils/estado-cita';

/** Insignia de color con el estado de una cita. */
@Component({
  selector: 'app-insignia-estado',
  standalone: false,
  template: `
    <span class="inline-block whitespace-nowrap rounded-full border px-3 py-1 fs-secundario font-medium" [class]="clase">
      {{ etiqueta }}
    </span>
  `,
})
export class InsigniaEstadoComponent {
  @Input({ required: true }) estado!: EstadoCita;

  get clase(): string {
    return claseInsigniaEstado(this.estado);
  }

  get etiqueta(): string {
    return etiquetaEstadoCita(this.estado);
  }
}
