import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { Pago } from '../../core/models/pago';
import { PagoService } from '../../core/services/pago.service';
import { AvisosPagoService } from '../toast/avisos-pago.service';
import { obtenerMensajeError } from '../../core/utils/manejo-errores';

/** Formulario del técnico para registrar el costo final de una cita finalizada. */
@Component({
  selector: 'app-costo-final-form',
  standalone: false,
  templateUrl: './costo-final-form.component.html',
})
export class CostoFinalFormComponent {
  @Input({ required: true }) citaId!: number;
  @Output() registrado = new EventEmitter<Pago>();

  readonly monto = new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]);
  enviando = false;
  errorMensaje: string | null = null;

  constructor(
    private pagoService: PagoService,
    private avisos: AvisosPagoService,
    private cdr: ChangeDetectorRef
  ) {}

  registrar(): void {
    if (this.enviando) return;
    if (this.monto.invalid || this.monto.value === null) {
      this.monto.markAsTouched();
      return;
    }

    this.enviando = true;
    this.errorMensaje = null;
    this.pagoService
      .registrarCostoFinal(this.citaId, this.monto.value)
      .pipe(
        finalize(() => {
          this.enviando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (pago) => {
          this.avisos.anunciarCostoFinal(pago);
          this.registrado.emit(pago);
        },
        error: (err) => {
          this.errorMensaje = obtenerMensajeError(err, 'No fue posible registrar el costo final.');
          this.avisos.error('No se pudo registrar el costo final', this.errorMensaje);
        },
      });
  }
}
