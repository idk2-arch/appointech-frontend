import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { Cita, SolicitudServicio } from '../../../../core/models/cita';
import { FranjaDisponible } from '../../../../core/models/disponibilidad';
import { CitaService } from '../../../../core/services/cita.service';
import { EspecialidadResponse } from '../../../../core/services/tecnico.service';
import { obtenerMensajeError } from '../../../../core/utils/manejo-errores';

@Component({
  selector: 'app-confirmar-cita',
  standalone: false,
  templateUrl: './confirmar-cita.component.html',
})
export class ConfirmarCitaComponent {
  @Input({ required: true }) especialidad!: EspecialidadResponse;
  @Input({ required: true }) solicitud!: SolicitudServicio;
  @Input({ required: true }) franja!: FranjaDisponible;
  @Output() confirmada = new EventEmitter<Cita>();
  /** 409: la franja se ocupó (u otro conflicto); el padre recarga las franjas del día. */
  @Output() franjaNoDisponible = new EventEmitter<string>();
  @Output() volver = new EventEmitter<void>();

  cargando = false;
  errorMensaje: string | null = null;

  constructor(
    private citaService: CitaService,
    private cdr: ChangeDetectorRef
  ) {}

  confirmar(): void {
    this.cargando = true;
    this.errorMensaje = null;

    // Se envían exactamente los valores de la franja elegida, sin reformatear.
    this.citaService
      .confirmarCita({
        solicitudId: this.solicitud.id,
        tecnicoId: this.franja.tecnicoId,
        inicio: this.franja.inicio,
        fin: this.franja.fin,
      })
      .subscribe({
        next: (cita) => {
          this.cargando = false;
          this.confirmada.emit(cita);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.cargando = false;
          const mensaje = obtenerMensajeError(err, 'No fue posible confirmar la cita. Intenta de nuevo.');
          if (err instanceof HttpErrorResponse && err.status === 409) {
            this.franjaNoDisponible.emit(mensaje);
          } else {
            this.errorMensaje = mensaje;
          }
          this.cdr.markForCheck();
        },
      });
  }
}
