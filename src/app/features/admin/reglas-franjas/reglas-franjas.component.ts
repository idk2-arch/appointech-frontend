import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import {
  ReglasFranjas,
  ReglasFranjasRequest,
  ReglasFranjasService,
} from '../../../core/services/reglas-franjas.service';
import { obtenerMensajeErrorEscritura } from '../../../core/utils/manejo-errores';
import {
  DURACION_BLOQUE_MAXIMA_MIN,
  DURACION_BLOQUE_MINIMA_MIN,
} from '../../../core/utils/reglas-franjas';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-reglas-franjas',
  standalone: false,
  templateUrl: './reglas-franjas.component.html',
})
export class ReglasFranjasComponent implements OnInit, OnDestroy {
  readonly duracionMinima = DURACION_BLOQUE_MINIMA_MIN;
  readonly duracionMaxima = DURACION_BLOQUE_MAXIMA_MIN;
  readonly form: FormGroup;
  cargando = true;
  guardando = false;
  confirmando = false;
  errorCarga: string | null = null;
  errorGuardado: string | null = null;
  advertencia: string | null = null;
  private actuales: ReglasFranjas | null = null;
  private consulta?: Subscription;
  private escritura?: Subscription;
  constructor(
    fb: FormBuilder,
    private reglasService: ReglasFranjasService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = fb.group({
      duracionBloqueMinutos: [
        null,
        [
          Validators.required,
          Validators.min(this.duracionMinima),
          Validators.max(this.duracionMaxima),
          Validators.pattern(/^\d+$/),
        ],
      ],
    });
  }
  get duracion(): AbstractControl {
    return this.form.controls['duracionBloqueMinutos'];
  }
  get errorDuracion(): string | null {
    if (!this.duracion.touched) return null;
    if (this.duracion.hasError('required')) return 'Escribe la duración del bloque en minutos.';
    return this.duracion.invalid
      ? `La duración debe ser un número entero entre ${this.duracionMinima} y ${this.duracionMaxima} minutos.`
      : null;
  }
  ngOnInit(): void {
    this.cargar();
  }
  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
    this.escritura?.unsubscribe();
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
        }),
      )
      .subscribe({
        next: (r) => this.mostrar(r),
        error: (e) => {
          this.errorCarga = obtenerMensajeErrorEscritura(
            e,
            'cargar las reglas de franjas',
            'No se pudieron leer las reglas de franjas.',
          );
          this.toast.error('No se pudieron cargar las reglas de franjas', this.errorCarga);
        },
      });
  }
  guardar(): void {
    if (this.guardando || !this.actuales) return;
    this.errorGuardado = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (Number(this.duracion.value) !== this.actuales.duracionBloqueMinutos) {
      this.confirmando = true;
      return;
    }
    this.enviar();
  }
  confirmarGuardado(): void {
    this.confirmando = false;
    if (!this.guardando && this.form.valid && this.actuales) this.enviar();
  }
  cancelarConfirmacion(): void {
    this.confirmando = false;
  }
  private enviar(): void {
    if (!this.actuales) return;
    // El PUT todavía exige los campos globales en desuso: se conservan exactamente como llegaron.
    const datos: ReglasFranjasRequest = {
      radioMaximoKm: this.actuales.radioMaximoKm,
      horaInicioJornada: this.actuales.horaInicioJornada,
      horaFinJornada: this.actuales.horaFinJornada,
      duracionBloqueMinutos: Number(this.duracion.value),
    };
    this.guardando = true;
    this.advertencia = null;
    this.escritura = this.reglasService
      .actualizar(datos)
      .pipe(
        finalize(() => {
          this.guardando = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (r) => {
          this.mostrar(r);
          if (r.franjasOfrecidasInvalidadas)
            this.advertencia =
              r.advertencia ??
              'Las franjas que ya se habían ofrecido dejarán de poder confirmarse.';
          this.toast.exito(
            'Reglas de franjas guardadas',
            r.franjasOfrecidasInvalidadas
              ? 'Las franjas ya ofrecidas dejaron de poder confirmarse.'
              : undefined,
          );
        },
        error: (e) => {
          this.errorGuardado = obtenerMensajeErrorEscritura(
            e,
            'guardar las reglas de franjas',
            'Revisa los valores: el servidor no aceptó las reglas.',
          );
          this.toast.error('No se pudieron guardar las reglas', this.errorGuardado);
        },
      });
  }
  private mostrar(r: ReglasFranjas): void {
    this.actuales = r;
    this.form.reset({ duracionBloqueMinutos: r.duracionBloqueMinutos });
  }
}
