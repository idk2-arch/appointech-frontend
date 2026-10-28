import { Component, Input } from '@angular/core';

import { PreDiagnostico } from '../../core/models/cita';
import { claseUrgenciaSugerida, etiquetaUrgenciaSugerida } from '../../core/utils/urgencia';

/** Orientación generada por IA para el técnico: causas probables, urgencia sugerida y preguntas. */
@Component({
  selector: 'app-prediagnostico',
  standalone: false,
  templateUrl: './prediagnostico.component.html',
})
export class PrediagnosticoComponent {
  @Input({ required: true }) datos!: PreDiagnostico;

  readonly etiquetaUrgencia = etiquetaUrgenciaSugerida;
  readonly claseUrgencia = claseUrgenciaSugerida;
}
