import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { finalize } from 'rxjs';

import { Pago } from '../../core/models/pago';
import { PagoService } from '../../core/services/pago.service';
import { AvisosPagoService } from '../toast/avisos-pago.service';
import { obtenerMensajeError } from '../../core/utils/manejo-errores';

/** Botón para consultar el resultado de un pago en línea; el backend usa la referencia que ya guardó. */
@Component({
  selector: 'app-verificar-pago',
  standalone: false,
  templateUrl: './verificar-pago.component.html',
})
export class VerificarPagoComponent {
  @Input({ required: true }) citaId!: number;
  @Output() actualizado = new EventEmitter<Pago>();

  verificando = false;
  errorMensaje: string | null = null;

  constructor(
    private pagoService: PagoService,
    private avisos: AvisosPagoService,
    private cdr: ChangeDetectorRef
  ) {}

  verificar(): void {
    if (this.verificando) return;

    this.verificando = true;
    this.errorMensaje = null;
    this.pagoService
      .sincronizar(this.citaId)
      .pipe(
        finalize(() => {
          this.verificando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (pago) => {
          this.avisos.anunciarResultado(pago);
          this.actualizado.emit(pago);
        },
        error: (err) => {
          this.errorMensaje = obtenerMensajeError(err, 'No fue posible verificar el pago.');
          this.avisos.error('No se pudo verificar el pago', this.errorMensaje);
        },
      });
  }
}
