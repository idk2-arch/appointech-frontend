import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { finalize } from 'rxjs';

import { MetodoPago, Pago } from '../../core/models/pago';
import { NavegadorService } from '../../core/services/navegador.service';
import { PagoService } from '../../core/services/pago.service';
import { RetornoPagoService } from '../../core/services/retorno-pago.service';
import { AvisosPagoService } from '../toast/avisos-pago.service';
import { obtenerMensajeError } from '../../core/utils/manejo-errores';
import { esPagoEnLineaEnProceso, esPagoEnLineaNoDisponible } from '../../core/utils/pago';

/** El cliente elige pagar en efectivo o en línea; en línea redirige el navegador a la pasarela. */
@Component({
  selector: 'app-selector-metodo-pago',
  standalone: false,
  templateUrl: './selector-metodo-pago.component.html',
})
export class SelectorMetodoPagoComponent {
  @Input({ required: true }) pago!: Pago;
  @Output() actualizado = new EventEmitter<Pago>();

  enviando = false;
  errorMensaje: string | null = null;
  /** 503: el pago en línea no está disponible; solo queda el efectivo. */
  enLineaNoDisponible = false;
  /** 409: ya hay un pago en línea en proceso; se ofrece verificar su resultado. */
  enProceso = false;

  private redirigiendo = false;

  constructor(
    private pagoService: PagoService,
    private navegador: NavegadorService,
    private retornoPago: RetornoPagoService,
    private avisos: AvisosPagoService,
    private cdr: ChangeDetectorRef
  ) {}

  elegir(metodo: MetodoPago): void {
    if (this.enviando) return;
    this.enviando = true;
    this.errorMensaje = null;
    this.enProceso = false;

    this.pagoService
      .elegirMetodo(this.pago.citaId, metodo)
      .pipe(
        finalize(() => {
          // Al redirigir se deja el botón deshabilitado hasta que el navegador cambie de página.
          if (!this.redirigiendo) this.enviando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (pago) => this.alElegir(metodo, pago),
        error: (err) => this.alFallar(err),
      });
  }

  private alElegir(metodo: MetodoPago, pago: Pago): void {
    if (metodo === 'EN_LINEA' && pago.urlPago) {
      this.retornoPago.guardar(pago.citaId);
      this.avisos.reiniciar(pago.citaId);
      this.redirigiendo = this.navegador.redirigir(pago.urlPago);
      if (!this.redirigiendo) {
        this.errorMensaje = 'La dirección de pago recibida no es válida. Intenta de nuevo o paga en efectivo.';
      }
      return;
    }
    this.actualizado.emit(pago);
  }

  private alFallar(err: unknown): void {
    this.errorMensaje = obtenerMensajeError(err, 'No fue posible registrar el método de pago.');
    this.enLineaNoDisponible = esPagoEnLineaNoDisponible(err);
    this.enProceso = esPagoEnLineaEnProceso(err);
    this.avisos.error('No se pudo registrar el método de pago', this.errorMensaje);
  }
}
