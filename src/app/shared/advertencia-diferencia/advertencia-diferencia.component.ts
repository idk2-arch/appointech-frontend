import { Component, Input } from '@angular/core';

import { Pago } from '../../core/models/pago';
import { formatearPorcentaje } from '../../core/utils/moneda';

/** Aviso al cliente de que el costo final se aleja del estimado; va antes de elegir cómo pagar. */
@Component({
  selector: 'app-advertencia-diferencia',
  standalone: false,
  templateUrl: './advertencia-diferencia.component.html',
})
export class AdvertenciaDiferenciaComponent {
  @Input({ required: true }) pago!: Pago;

  get porcentaje(): string {
    return formatearPorcentaje(this.pago.porcentajeDiferencia);
  }
}
