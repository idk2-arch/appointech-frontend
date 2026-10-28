import { Component, Input } from '@angular/core';

import { DetalleCita, HistorialCita } from '../../core/models/cita';
import { etiquetaEstadoCita } from '../../core/utils/estado-cita';
import { enlaceTelefono } from '../../core/utils/telefono';

/** Datos, técnico, diagnóstico e historial de una cita; lo usan el cliente y el administrador. */
@Component({
  selector: 'app-detalle-cita',
  standalone: false,
  templateUrl: './detalle-cita.component.html',
})
export class DetalleCitaComponent {
  @Input({ required: true }) cita!: DetalleCita;

  readonly enlaceTelefono = enlaceTelefono;

  /** Una reprogramación se registra con el mismo estado antes y después. */
  esReprogramacion(fila: HistorialCita): boolean {
    return fila.estadoAnterior === fila.estadoNuevo;
  }

  titulo(fila: HistorialCita): string {
    if (this.esReprogramacion(fila)) return 'Cita reprogramada';
    if (!fila.estadoAnterior) return `Cita registrada como ${etiquetaEstadoCita(fila.estadoNuevo).toLowerCase()}`;
    return `${etiquetaEstadoCita(fila.estadoAnterior)} → ${etiquetaEstadoCita(fila.estadoNuevo)}`;
  }
}
