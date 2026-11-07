import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { map, of, switchMap, tap } from 'rxjs';

import { Cita, CrearSolicitudRequest, SolicitudServicio } from '../../../../core/models/cita';
import { FranjaDisponible } from '../../../../core/models/disponibilidad';
import { CitaService } from '../../../../core/services/cita.service';
import { SolicitudService } from '../../../../core/services/solicitud.service';
import { EspecialidadResponse } from '../../../../core/services/tecnico.service';
import { obtenerMensajeError } from '../../../../core/utils/manejo-errores';

@Component({
  selector: 'app-confirmar-cita',
  standalone: false,
  templateUrl: './confirmar-cita.component.html',
})
export class ConfirmarCitaComponent {
  @Input({ required: true }) especialidad!: EspecialidadResponse;
  /** Lo que el cliente describió; la solicitud se crea aquí, al confirmar, y no antes. */
  @Input({ required: true }) datos!: CrearSolicitudRequest;
  /** Solicitud que un intento anterior ya alcanzó a crear (p. ej. el horario se ocupó): se reutiliza en vez de crear otra. */
  @Input() solicitud: SolicitudServicio | null = null;
  @Input({ required: true }) franja!: FranjaDisponible;
  @Output() confirmada = new EventEmitter<Cita>();
  /** La solicitud quedó creada en el backend (paso previo a confirmar); el padre la recuerda para reutilizarla o descartarla. */
  @Output() solicitudCreada = new EventEmitter<SolicitudServicio>();
  /** El backend la marcó para coordinación manual: no hay cita que confirmar. */
  @Output() manualDetectada = new EventEmitter<SolicitudServicio>();
  /** 409: la franja se ocupó (u otro conflicto); el padre recarga las franjas del día. */
  @Output() franjaNoDisponible = new EventEmitter<string>();
  @Output() volver = new EventEmitter<void>();

  cargando = false;
  errorMensaje: string | null = null;

  constructor(
    private solicitudService: SolicitudService,
    private citaService: CitaService,
    private cdr: ChangeDetectorRef
  ) {}

  /** Un solo momento: crea la solicitud (si aún no existe) y enseguida confirma la cita con la franja elegida. */
  confirmar(): void {
    this.cargando = true;
    this.errorMensaje = null;

    const solicitud$ = this.solicitud
      ? of(this.solicitud)
      : this.solicitudService.crearSolicitud(this.datos).pipe(tap((creada) => this.solicitudCreada.emit(creada)));

    // Se envían exactamente los valores de la franja elegida, sin reformatear.
    solicitud$
      .pipe(
        switchMap((solicitud) =>
          solicitud.agendamientoManual === true
            ? of({ manual: solicitud })
            : this.citaService
                .confirmarCita({
                  solicitudId: solicitud.id,
                  tecnicoId: this.franja.tecnicoId,
                  inicio: this.franja.inicio,
                  fin: this.franja.fin,
                })
                .pipe(map((cita) => ({ cita })))
        )
      )
      .subscribe({
        next: (resultado) => {
          this.cargando = false;
          if ('manual' in resultado) this.manualDetectada.emit(resultado.manual);
          else this.confirmada.emit(resultado.cita);
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
