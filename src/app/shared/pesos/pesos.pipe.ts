import { Pipe, PipeTransform } from '@angular/core';

import { formatearPesos } from '../../core/utils/moneda';

/** Dinero en pesos colombianos: `120000 | pesos` → "$ 120.000". */
@Pipe({
  name: 'pesos',
  standalone: false,
})
export class PesosPipe implements PipeTransform {
  transform(monto: number | null | undefined): string {
    return formatearPesos(monto);
  }
}
