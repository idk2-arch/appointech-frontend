import { Component, inject, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { aFechaHoraLocal, hoyIso } from '../../../core/utils/fecha-local';
import { validadorFechaHoraFutura } from '../../../core/utils/validadores-cita';

/** Diálogo para elegir la nueva fecha y hora de una cita; no deja escoger momentos pasados. */
@Component({
  selector: 'app-reprogramar-modal',
  standalone: false,
  templateUrl: './reprogramar-modal.component.html',
})
export class ReprogramarModalComponent {
  @Input() cargando = false;
  @Input() errorMensaje: string | null = null;
  @Output() cerrar = new EventEmitter<void>();
  /** LocalDateTime sin zona, p. ej. 2026-11-04T14:00:00. */
  @Output() confirmar = new EventEmitter<string>();

  readonly minimo = hoyIso();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group(
    { fecha: ['', Validators.required], hora: ['', Validators.required] },
    { validators: validadorFechaHoraFutura() }
  );

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { fecha, hora } = this.form.getRawValue();
    this.confirmar.emit(aFechaHoraLocal(fecha, hora));
  }
}
