import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';

import { BloqueIndisponibilidad } from '../../../core/models/tecnico-agenda';
import { BloqueService } from '../../../core/services/bloque.service';
import { hoyIso, parsearFechaLocal } from '../../../core/utils/fecha-local';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';

/** No se permiten fechas anteriores a hoy. */
const fechaNoPasada: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const fecha = control.value as string;
  return fecha && fecha < hoyIso() ? { fechaPasada: true } : null;
};

/** Fin posterior al inicio (mismo día) e inicio que no esté en el pasado. */
const validarRango: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const fecha = grupo.get('fecha')?.value as string;
  const horaInicio = grupo.get('horaInicio')?.value as string;
  const horaFin = grupo.get('horaFin')?.value as string;
  if (!fecha || !horaInicio || !horaFin) return null;

  const errores: ValidationErrors = {};
  // "HH:mm" se compara bien como texto.
  if (horaFin <= horaInicio) errores['finAntesDeInicio'] = true;
  if (parsearFechaLocal(`${fecha}T${horaInicio}:00`).getTime() <= Date.now()) errores['inicioPasado'] = true;
  return Object.keys(errores).length > 0 ? errores : null;
};

@Component({
  selector: 'app-no-disponibilidad',
  standalone: false,
  templateUrl: './no-disponibilidad.component.html',
})
export class NoDisponibilidadComponent implements OnInit {
  readonly hoy = hoyIso();

  form: FormGroup;
  guardando = false;
  errorGuardar: string | null = null;
  exito: string | null = null;

  bloques: BloqueIndisponibilidad[] = [];
  cargando = true;
  errorCarga: string | null = null;

  bloqueParaEliminar: BloqueIndisponibilidad | null = null;
  eliminando = false;
  errorEliminar: string | null = null;

  constructor(
    private fb: FormBuilder,
    private bloqueService: BloqueService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group(
      {
        fecha: [this.hoy, [Validators.required, fechaNoPasada]],
        horaInicio: ['', [Validators.required]],
        horaFin: ['', [Validators.required]],
        motivo: [''],
      },
      { validators: validarRango }
    );
  }

  ngOnInit(): void {
    this.cargarBloques();
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

  cargarBloques(mostrarCargando = true): void {
    if (mostrarCargando) {
      this.cargando = true;
    }
    this.errorCarga = null;

    // Sin `desde`, el backend usa hoy: son los próximos bloques.
    this.bloqueService
      .obtenerBloques()
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (bloques) => {
          this.bloques = Array.isArray(bloques) ? bloques : [];
        },
        error: (err) => {
          this.bloques = [];
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar tus bloques.');
        },
      });
  }

  onSubmit(): void {
    this.exito = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { fecha, horaInicio, horaFin, motivo } = this.form.value as {
      fecha: string;
      horaInicio: string;
      horaFin: string;
      motivo: string;
    };

    this.guardando = true;
    this.errorGuardar = null;

    // Hora local de Colombia tal cual, sin conversión a UTC.
    const request = {
      inicio: `${fecha}T${horaInicio}:00`,
      fin: `${fecha}T${horaFin}:00`,
      ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
    };

    this.bloqueService
      .crearBloque(request)
      .pipe(
        finalize(() => {
          this.guardando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.exito = 'Listo, ese horario quedó bloqueado.';
          this.form.reset({ fecha: this.hoy, horaInicio: '', horaFin: '', motivo: '' });
          this.cargarBloques(false);
        },
        error: (err) => {
          this.errorGuardar = obtenerMensajeError(err, 'No fue posible guardar el bloque. Intenta de nuevo.');
        },
      });
  }

  pedirEliminar(bloque: BloqueIndisponibilidad): void {
    this.errorEliminar = null;
    this.exito = null;
    this.bloqueParaEliminar = bloque;
  }

  cancelarEliminar(): void {
    if (!this.eliminando) this.bloqueParaEliminar = null;
  }

  confirmarEliminar(): void {
    const bloque = this.bloqueParaEliminar;
    if (!bloque) return;

    this.eliminando = true;
    this.errorEliminar = null;

    this.bloqueService
      .eliminarBloque(bloque.id)
      .pipe(
        finalize(() => {
          this.eliminando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.bloqueParaEliminar = null;
          this.exito = 'El bloque se eliminó.';
          this.cargarBloques(false);
        },
        error: (err) => {
          this.errorEliminar = obtenerMensajeError(err, 'No fue posible eliminar el bloque. Intenta de nuevo.');
        },
      });
  }
}
