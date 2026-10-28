import { Component, EventEmitter, Input, Output } from '@angular/core';

import { DetalleCita, FotoElectrodomestico, HistorialCita } from '../../core/models/cita';
import { etiquetaEstadoCita } from '../../core/utils/estado-cita';
import { enlaceTelefono } from '../../core/utils/telefono';
import { equipoDeCita, etiquetaUrgencia } from '../../core/utils/urgencia';

/**
 * Datos, fotos, pre-diagnóstico, técnico, diagnóstico e historial de una cita; lo usan el cliente
 * y el administrador. Con `fotosEditables`, el contenido marcado con `fotosAcciones` se muestra
 * dentro de la sección de fotos (para agregar nuevas).
 */
@Component({
  selector: 'app-detalle-cita',
  standalone: false,
  templateUrl: './detalle-cita.component.html',
})
export class DetalleCitaComponent {
  @Input({ required: true }) cita!: DetalleCita;
  @Input() fotosEditables = false;
  @Input() fotosOcupadas = false;
  @Output() quitarFoto = new EventEmitter<FotoElectrodomestico>();

  readonly enlaceTelefono = enlaceTelefono;
  readonly etiquetaUrgencia = etiquetaUrgencia;

  get equipo(): string | null {
    return equipoDeCita(this.cita.marcaElectrodomestico, this.cita.modeloElectrodomestico);
  }

  get hayFotos(): boolean {
    return (this.cita.fotosElectrodomestico?.length ?? 0) > 0;
  }

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
