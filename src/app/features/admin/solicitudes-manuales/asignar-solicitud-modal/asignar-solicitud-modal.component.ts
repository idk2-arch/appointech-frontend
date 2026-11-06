import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { SolicitudManualAdmin, SolicitudManualAdminService, TecnicoDisponible } from '../../../../core/services/solicitud-manual-admin.service';
import { formatearDistanciaKm } from '../../../../core/utils/distancia';
import { aFechaHoraInput, aLocalDateTime } from '../../../../core/utils/fecha-local';
import { esSolicitudYaAsignada, obtenerMensajeErrorEscritura } from '../../../../core/utils/manejo-errores';
import { nombreCompleto } from '../../../../core/utils/nombre-persona';
import { enlaceTelefono } from '../../../../core/utils/telefono';
import { ToastService } from '../../../../shared/toast/toast.service';

function finDespuesDeInicio(grupo: AbstractControl): ValidationErrors | null {
  const inicio = grupo.get('inicio')?.value;
  const fin = grupo.get('fin')?.value;
  return inicio && fin && fin <= inicio ? { finAntesDeInicio: true } : null;
}

/** El inicio debe estar en el futuro: se compara el texto del campo ("2026-11-04T10:00"), que ordena igual que las fechas. */
function inicioEnFuturo(control: AbstractControl): ValidationErrors | null {
  return control.value && control.value <= aFechaHoraInput(new Date()) ? { inicioPasado: true } : null;
}

/**
 * Asigna técnico y horario a una solicitud de agendamiento manual: el administrador elige el horario, busca los
 * técnicos libres (del más cercano al más lejano), elige uno y confirma.
 */
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
  /** La solicitud ya no está pendiente: la lista que la mostraba debe recargarse. */
  @Output() desactualizada = new EventEmitter<void>();

  @ViewChild('campoInicio') private campoInicio?: ElementRef<HTMLInputElement>;

  readonly enlaceTelefono = enlaceTelefono;
  readonly formatearDistancia = formatearDistanciaKm;

  form: FormGroup;
  minimoInicio = aFechaHoraInput(new Date());
  /** Null mientras no se haya buscado con el horario actual. */
  tecnicos: TecnicoDisponible[] | null = null;
  buscando = false;
  errorBusqueda: string | null = null;
  seleccionadoId: number | null = null;
  falta = false;
  confirmando = false;
  cargando = false;
  errorMensaje: string | null = null;

  private busqueda?: Subscription;
  private asignacion?: Subscription;
  private cambiosHorario?: Subscription;

  constructor(
    private fb: FormBuilder,
    private solicitudService: SolicitudManualAdminService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.crearFormulario();
  }

  get inicio(): AbstractControl {
    return this.form.controls['inicio'];
  }

  get fin(): AbstractControl {
    return this.form.controls['fin'];
  }

  get tecnicoSeleccionado(): TecnicoDisponible | null {
    return this.tecnicos?.find((t) => t.tecnicoId === this.seleccionadoId) ?? null;
  }

  get textoEnviar(): string {
    return this.confirmando ? 'Confirmar asignación' : 'Asignar';
  }

  get errorInicio(): string | null {
    if (!this.inicio.touched) return null;
    if (this.inicio.hasError('required')) return 'Elige la fecha y hora de inicio.';
    return this.inicio.hasError('inicioPasado') ? 'El inicio debe ser en el futuro.' : null;
  }

  get errorFin(): string | null {
    if (!this.fin.touched) return null;
    if (this.fin.hasError('required')) return 'Elige la fecha y hora de fin.';
    return this.form.hasError('finAntesDeInicio') ? 'El fin debe ser posterior al inicio.' : null;
  }

  nombreDe(tecnico: TecnicoDisponible): string {
    return nombreCompleto(tecnico.nombre, tecnico.apellido);
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (!cambios['abierto'] || !this.abierto || !this.solicitud) return;
    this.reiniciar();
  }

  ngOnDestroy(): void {
    this.busqueda?.unsubscribe();
    this.asignacion?.unsubscribe();
    this.cambiosHorario?.unsubscribe();
  }

  /** Lo que hace Enter o el botón principal: buscar si falta, pedir que elija, confirmar y por fin asignar. */
  alEnviar(): void {
    if (this.tecnicos === null) {
      this.buscar();
    } else if (!this.tecnicoSeleccionado) {
      this.falta = true;
    } else if (this.confirmando) {
      this.confirmar();
    } else {
      this.confirmando = true;
    }
  }

  buscar(): void {
    const solicitud = this.solicitud;
    if (!solicitud || this.buscando) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.busqueda?.unsubscribe();
    this.buscando = true;
    this.errorBusqueda = null;
    this.errorMensaje = null;
    this.seleccionadoId = null;

    this.busqueda = this.solicitudService
      .tecnicosDisponibles(solicitud.id, aLocalDateTime(this.inicio.value), aLocalDateTime(this.fin.value))
      .subscribe({
        next: (tecnicos) => {
          this.tecnicos = Array.isArray(tecnicos) ? tecnicos : [];
          this.buscando = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.buscando = false;
          this.errorBusqueda = obtenerMensajeErrorEscritura(err, 'buscar los técnicos disponibles', 'Revisa las fechas: el fin debe ser posterior al inicio.');
          this.toast.error('No se pudieron buscar los técnicos', this.errorBusqueda);
          this.cdr.markForCheck();
        },
      });
  }

  seleccionar(id: number): void {
    this.seleccionadoId = id;
    this.falta = false;
  }

  /** Vuelve al horario para probar otro: la lista mostrada ya no vale. */
  cambiarHorario(): void {
    this.invalidarLista();
    this.campoInicio?.nativeElement.focus();
  }

  volver(): void {
    this.confirmando = false;
  }

  confirmar(): void {
    const solicitud = this.solicitud;
    const tecnico = this.tecnicoSeleccionado;
    if (!solicitud || !tecnico || this.cargando) return;

    this.errorMensaje = null;
    this.cargando = true;
    this.asignacion = this.solicitudService
      .asignar(solicitud.id, {
        tecnicoId: tecnico.tecnicoId,
        fechaHoraInicio: aLocalDateTime(this.inicio.value),
        fechaHoraFin: aLocalDateTime(this.fin.value),
      })
      .subscribe({
        next: () => {
          this.cargando = false;
          this.toast.exito('Técnico asignado a la solicitud', `${this.nombreDe(tecnico)} atenderá a ${solicitud.clienteNombre} ${solicitud.clienteApellido}.`);
          this.asignada.emit(solicitud);
          this.cdr.markForCheck();
        },
        error: (err) => this.alFallarLaAsignacion(err),
      });
  }

  private alFallarLaAsignacion(err: unknown): void {
    this.cargando = false;
    this.confirmando = false;
    this.errorMensaje = obtenerMensajeErrorEscritura(err, 'asignar el técnico', 'Revisa las fechas: el fin debe ser posterior al inicio.', {
      404: 'La solicitud o el técnico ya no existe. Actualiza la lista.',
      409: 'No se pudo asignar: el técnico ya no está libre o la solicitud ya no está pendiente.',
    });
    this.toast.error('No se pudo asignar el técnico', this.errorMensaje);
    if (esSolicitudYaAsignada(err)) this.desactualizada.emit();
    this.cdr.markForCheck();
  }

  private reiniciar(): void {
    this.busqueda?.unsubscribe();
    this.asignacion?.unsubscribe();
    this.cambiosHorario?.unsubscribe();
    this.form = this.crearFormulario();
    this.minimoInicio = aFechaHoraInput(new Date());
    this.tecnicos = null;
    this.buscando = false;
    this.errorBusqueda = null;
    this.seleccionadoId = null;
    this.falta = false;
    this.confirmando = false;
    this.cargando = false;
    this.errorMensaje = null;
    // Cambiar cualquiera de las fechas invalida la lista que se estaba mostrando.
    this.cambiosHorario = this.form.valueChanges.subscribe(() => this.invalidarLista());
  }

  private invalidarLista(): void {
    this.tecnicos = null;
    this.seleccionadoId = null;
    this.errorBusqueda = null;
    this.falta = false;
    this.confirmando = false;
  }

  private crearFormulario(): FormGroup {
    return this.fb.group(
      {
        inicio: ['', [Validators.required, inicioEnFuturo]],
        fin: ['', [Validators.required]],
      },
      { validators: finDespuesDeInicio }
    );
  }
}
