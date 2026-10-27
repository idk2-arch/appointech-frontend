import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Cita } from '../../../../core/models/cita';
import { etiquetaEstadoCita } from '../../../../core/utils/estado-cita';
import { enlaceTelefono } from '../../../../core/utils/telefono';

/** Tarjeta de éxito tras confirmar la cita. */
@Component({
  selector: 'app-cita-confirmada',
  standalone: false,
  templateUrl: './cita-confirmada.component.html',
})
export class CitaConfirmadaComponent {
  @Input({ required: true }) cita!: Cita;
  /** Respaldo si la cita no trae el nombre de la especialidad. */
  @Input() especialidadNombre: string | null = null;
  @Output() volverInicio = new EventEmitter<void>();

  readonly enlaceTelefono = enlaceTelefono;
  readonly etiquetaEstado = etiquetaEstadoCita;

  get especialidad(): string | null {
    return this.cita.especialidadNombre || this.especialidadNombre;
  }
}
