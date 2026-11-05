import { Component, Input } from '@angular/core';

import { EstadoPagoVisible } from '../../core/models/pago';
import { claseInsigniaEstadoPago, etiquetaEstadoPago, simboloEstadoPago } from '../../core/utils/estado-pago';

/** Insignia con el estado de un pago: texto en español y un símbolo, además del color. */
@Component({
  selector: 'app-insignia-pago',
  standalone: false,
  template: `
    <span
      class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 fs-secundario font-medium"
      [class]="clase"
    >
      <span aria-hidden="true">{{ simbolo }}</span>
      <span>{{ etiqueta }}</span>
    </span>
  `,
})
export class InsigniaPagoComponent {
  @Input({ required: true }) estado!: EstadoPagoVisible;

  get clase(): string {
    return claseInsigniaEstadoPago(this.estado);
  }

  get etiqueta(): string {
    return etiquetaEstadoPago(this.estado);
  }

  get simbolo(): string {
    return simboloEstadoPago(this.estado);
  }
}
