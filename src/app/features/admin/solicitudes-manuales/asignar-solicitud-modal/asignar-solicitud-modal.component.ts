import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { SolicitudManualAdmin, SolicitudManualAdminService } from '../../../../core/services/solicitud-manual-admin.service';
import { TecnicoResponse, TecnicoService } from '../../../../core/services/tecnico.service';
import { OpcionSelect } from '../../../../shared/select/select.component';
import { aFechaHoraLocal, hoyIso } from '../../../../core/utils/fecha-local';
import { obtenerMensajeError, obtenerMensajeErrorEscritura } from '../../../../core/utils/manejo-errores';

function finDespuesDeInicio(grupo: AbstractControl): ValidationErrors | null {
  const inicio = grupo.get('horaInicio')?.value;
  const fin = grupo.get('horaFin')?.value;
  return inicio && fin && fin <= inicio ? { finAntesDeInicio: true } : null;
}

/** Asigna técnico, fecha y horario a una solicitud de agendamiento manual. */
@Component({
  selector: 'app-asignar-solicitud-modal',
  standalone: false,
  templateUrl: './asignar-solicitud-modal.component.html',
})
export class AsignarSolicitudModalComponent implements OnChanges, OnDestroy {
  @Input() abierto = false;
  @Input() solicitud: SolicitudManualAdmin | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() asignada = new EventEmitter<SolicitudManualAdmin>();

  readonly hoy = hoyIso();
  form: FormGroup;
  tecnicos: TecnicoResponse[] = [];
  opcionesTecnicos: OpcionSelect[] = [];
  cargandoTecnicos = false;
  errorTecnicos: string | null = null;
  cargando = false;
  errorMensaje: string | null = null;

  private cargaTecnicos?: Subscription;

  constructor(
    private fb: FormBuilder,
    private tecnicoService: TecnicoService,
    private solicitudService: SolicitudManualAdminService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.crearFormulario();
  }

  get tecnicoId() {
    return this.form.get('tecnicoId');
  }

  get fecha() {
    return this.form.get('fecha');
  }

  get horaInicio() {
    return this.form.get('horaInicio');
  }

  get horaFin() {
    return this.form.get('horaFin');
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (!cambios['abierto'] || !this.abierto || !this.solicitud) return;

    this.errorMensaje = null;
    this.cargando = false;
    this.form = this.crearFormulario();
    this.cargarTecnicos();
  }

  ngOnDestroy(): void {
    this.cargaTecnicos?.unsubscribe();
  }

  cargarTecnicos(): void {
    const solicitud = this.solicitud;
    if (!solicitud) return;

    this.cargaTecnicos?.unsubscribe();
    this.cargandoTecnicos = true;
    this.errorTecnicos = null;

    this.cargaTecnicos = this.tecnicoService.obtenerTecnicos().subscribe({
      next: (tecnicos) => {
        this.tecnicos = (Array.isArray(tecnicos) ? tecnicos : []).filter(
          (t) => t.activo && t.especialidades.some((e) => e.id === solicitud.especialidadId)
        );
        this.opcionesTecnicos = this.tecnicos.map((t) => ({ value: t.id, label: `${t.nombre} ${t.apellido}` }));
        this.cargandoTecnicos = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargandoTecnicos = false;
        this.errorTecnicos = obtenerMensajeError(err, 'No pudimos cargar los técnicos. Intenta de nuevo.');
        this.cdr.markForCheck();
      },
    });
  }

  onSubmit(): void {
    if (!this.solicitud) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const solicitud = this.solicitud;
    const { tecnicoId, fecha, horaInicio, horaFin } = this.form.value;
    this.errorMensaje = null;
    this.cargando = true;

    this.solicitudService
      .asignar(solicitud.id, {
        tecnicoId: Number(tecnicoId),
        fechaHoraInicio: aFechaHoraLocal(fecha, horaInicio),
        fechaHoraFin: aFechaHoraLocal(fecha, horaFin),
      })
      .subscribe({
        next: () => {
          this.cargando = false;
          this.asignada.emit(solicitud);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.cargando = false;
          this.errorMensaje = obtenerMensajeErrorEscritura(
            err,
            'asignar la solicitud',
            'Revisa el técnico, la fecha y el horario. La hora de fin debe ser después de la de inicio.',
            {
              404: 'Esta solicitud ya no existe o ya fue asignada. Actualiza la lista.',
              409: 'Ese técnico ya tiene una cita o un bloqueo en ese horario. Elige otro horario u otro técnico.',
            }
          );
          this.cdr.markForCheck();
        },
      });
  }

  private crearFormulario(): FormGroup {
    return this.fb.group(
      {
        tecnicoId: [null as number | null, [Validators.required]],
        fecha: ['', [Validators.required]],
        horaInicio: ['', [Validators.required]],
        horaFin: ['', [Validators.required]],
      },
      { validators: finDespuesDeInicio }
    );
  }
}
