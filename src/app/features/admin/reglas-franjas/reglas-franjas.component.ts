import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';

import { ReglasFranjas, ReglasFranjasRequest, ReglasFranjasService } from '../../../core/services/reglas-franjas.service';
import { obtenerMensajeErrorEscritura } from '../../../core/utils/manejo-errores';
import {
  aHoraInput,
  cambiaDuracionOJornada,
  DURACION_BLOQUE_MAXIMA_MIN,
  DURACION_BLOQUE_MINIMA_MIN,
  jornadaValidator,
  RADIO_FRANJAS_MAXIMO_KM,
  RADIO_FRANJAS_MINIMO_KM,
  ValoresReglasFranjas,
} from '../../../core/utils/reglas-franjas';
import { ToastService } from '../../../shared/toast/toast.service';

const SOLO_ENTEROS = /^\d+$/;

/** Radio, duración del bloque y jornada con los que se calculan las franjas de agendamiento. */
@Component({
  selector: 'app-reglas-franjas',
  standalone: false,
  templateUrl: './reglas-franjas.component.html',
})
export class ReglasFranjasComponent implements OnInit, OnDestroy {
  readonly radioMaximo = RADIO_FRANJAS_MAXIMO_KM;
  readonly duracionMinima = DURACION_BLOQUE_MINIMA_MIN;
  readonly duracionMaxima = DURACION_BLOQUE_MAXIMA_MIN;

  readonly form: FormGroup;
  cargando = true;
  guardando = false;
  confirmando = false;
  errorCarga: string | null = null;
  errorGuardado: string | null = null;
  /** Aviso del servidor tras un cambio que invalida franjas ya ofrecidas. */
  advertencia: string | null = null;

  private original: ValoresReglasFranjas | null = null;
  private consulta?: Subscription;

  constructor(
    fb: FormBuilder,
    private reglasService: ReglasFranjasService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = fb.group(
      {
        radioMaximoKm: [
          null as number | null,
          [Validators.required, Validators.min(RADIO_FRANJAS_MINIMO_KM), Validators.max(RADIO_FRANJAS_MAXIMO_KM), Validators.pattern(SOLO_ENTEROS)],
        ],
        duracionBloqueMinutos: [
          null as number | null,
          [Validators.required, Validators.min(DURACION_BLOQUE_MINIMA_MIN), Validators.max(DURACION_BLOQUE_MAXIMA_MIN), Validators.pattern(SOLO_ENTEROS)],
        ],
        horaInicioJornada: ['', [Validators.required]],
        horaFinJornada: ['', [Validators.required]],
      },
      { validators: jornadaValidator }
    );
  }

  get radio(): AbstractControl {
    return this.form.controls['radioMaximoKm'];
  }

  get duracion(): AbstractControl {
    return this.form.controls['duracionBloqueMinutos'];
  }

  get inicio(): AbstractControl {
    return this.form.controls['horaInicioJornada'];
  }

  get fin(): AbstractControl {
    return this.form.controls['horaFinJornada'];
  }

  get errorRadio(): string | null {
    if (!this.radio.touched) return null;
    if (this.radio.hasError('required')) return 'Escribe la distancia en kilómetros.';
    return this.radio.invalid ? `La distancia debe ser un número entero entre ${RADIO_FRANJAS_MINIMO_KM} y ${RADIO_FRANJAS_MAXIMO_KM} km.` : null;
  }

  get errorDuracion(): string | null {
    if (!this.duracion.touched) return null;
    if (this.duracion.hasError('required')) return 'Escribe la duración del bloque en minutos.';
    return this.duracion.invalid
      ? `La duración debe ser un número entero entre ${DURACION_BLOQUE_MINIMA_MIN} y ${DURACION_BLOQUE_MAXIMA_MIN} minutos.`
      : null;
  }

  get errorInicio(): string | null {
    return this.inicio.touched && this.inicio.hasError('required') ? 'Elige la hora de inicio de la jornada.' : null;
  }

  get errorFin(): string | null {
    return this.fin.touched && this.fin.hasError('required') ? 'Elige la hora de fin de la jornada.' : null;
  }

  /** Errores que dependen de varios campos; se muestran cuando ya se tocó alguno de la jornada. */
  get errorJornada(): string | null {
    if (!this.inicio.touched && !this.fin.touched && !this.duracion.touched) return null;
    if (this.form.hasError('inicioNoAnterior')) return 'La hora de inicio debe ser anterior a la de fin.';
    if (this.form.hasError('sinBloqueCompleto')) return 'La jornada debe tener espacio para al menos un bloque completo de esa duración.';
    return null;
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }

  cargar(): void {
    this.consulta?.unsubscribe();
    this.cargando = true;
    this.errorCarga = null;

    this.consulta = this.reglasService
      .obtener()
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (reglas) => this.mostrar(reglas),
        error: (err) => {
          this.errorCarga = obtenerMensajeErrorEscritura(err, 'cargar las reglas de franjas', 'No se pudieron leer las reglas de franjas.');
          this.toast.error('No se pudieron cargar las reglas de franjas', this.errorCarga);
        },
      });
  }

  /** Pide confirmación si el cambio invalida franjas ya ofrecidas; si no, guarda directo. */
  guardar(): void {
    if (this.guardando) return;
    this.errorGuardado = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.original && cambiaDuracionOJornada(this.original, this.valores())) {
      this.confirmando = true;
      return;
    }
    this.enviar();
  }

  confirmarGuardado(): void {
    this.confirmando = false;
    this.enviar();
  }

  cancelarConfirmacion(): void {
    this.confirmando = false;
  }

  private enviar(): void {
    this.guardando = true;
    this.advertencia = null;
    this.reglasService
      .actualizar(this.solicitud())
      .pipe(
        finalize(() => {
          this.guardando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (reglas) => this.alGuardar(reglas),
        error: (err) => {
          this.errorGuardado = obtenerMensajeErrorEscritura(
            err,
            'guardar las reglas de franjas',
            'Revisa los valores: el servidor no aceptó las reglas.'
          );
          this.toast.error('No se pudieron guardar las reglas', this.errorGuardado);
        },
      });
  }

  private alGuardar(reglas: ReglasFranjas): void {
    this.mostrar(reglas);
    if (reglas.franjasOfrecidasInvalidadas) {
      this.advertencia = reglas.advertencia ?? 'Las franjas que ya se habían ofrecido dejarán de poder confirmarse.';
    }
    this.toast.exito(
      'Reglas de franjas guardadas',
      reglas.franjasOfrecidasInvalidadas ? 'Las franjas ya ofrecidas dejaron de poder confirmarse.' : undefined
    );
  }

  private mostrar(reglas: ReglasFranjas): void {
    this.original = {
      duracionBloqueMinutos: reglas.duracionBloqueMinutos,
      horaInicioJornada: aHoraInput(reglas.horaInicioJornada),
      horaFinJornada: aHoraInput(reglas.horaFinJornada),
    };
    this.form.reset({
      radioMaximoKm: reglas.radioMaximoKm,
      duracionBloqueMinutos: reglas.duracionBloqueMinutos,
      horaInicioJornada: this.original.horaInicioJornada,
      horaFinJornada: this.original.horaFinJornada,
    });
  }

  private valores(): ValoresReglasFranjas {
    return {
      duracionBloqueMinutos: Number(this.duracion.value),
      horaInicioJornada: aHoraInput(this.inicio.value),
      horaFinJornada: aHoraInput(this.fin.value),
    };
  }

  private solicitud(): ReglasFranjasRequest {
    return { radioMaximoKm: Number(this.radio.value), ...this.valores() };
  }
}
