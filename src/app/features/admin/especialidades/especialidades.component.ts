import { Component } from '@angular/core';

import { RubberSegmentItem } from '../../../shared/rubber-segment/rubber-segment.component';

@Component({
  selector: 'app-especialidades',
  standalone: false,
  templateUrl: './especialidades.component.html',
})
export class EspecialidadesComponent {
  readonly tabs: RubberSegmentItem[] = [
    { value: 'catalogo', label: 'Catálogo' },
    { value: 'asignar', label: 'Asignar a técnicos' },
  ];

  tabActiva = 'catalogo';
}
