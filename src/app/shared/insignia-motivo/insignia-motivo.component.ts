import { Component, Input } from '@angular/core';

import { MotivoSolicitudEspecial } from '../../core/models/cita';
import { etiquetaMotivoSolicitud } from '../../core/utils/motivo-solicitud-especial';

/** Por qué una solicitud la coordina un administrador. No muestra nada en las filas antiguas, sin motivo. */
@Component({
  selector: 'app-insignia-motivo',
  standalone: false,
  template: `
    @if (etiqueta) {
      <span
        class="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-0.5 fs-secundario font-medium text-amber-200"
      >
        <span aria-hidden="true">◆</span>
        <span>{{ etiqueta }}</span>
      </span>
    }
  `,
})
export class InsigniaMotivoComponent {
  @Input() motivo: MotivoSolicitudEspecial | null | undefined;

  get etiqueta(): string | null {
    return etiquetaMotivoSolicitud(this.motivo);
  }
}
