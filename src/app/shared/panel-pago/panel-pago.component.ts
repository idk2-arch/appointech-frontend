import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { finalize } from 'rxjs';

import { Pago } from '../../core/models/pago';
import { PagoService } from '../../core/services/pago.service';
import { AvisosPagoService } from '../toast/avisos-pago.service';
import { etiquetaMetodoPago } from '../../core/utils/estado-pago';
import { obtenerMensajeError } from '../../core/utils/manejo-errores';
import { efectivoPorConfirmar, enLineaEnProceso, puedeElegirMetodo, tieneCostoFinal } from '../../core/utils/pago';

export type RolPanelPago = 'CLIENTE' | 'TECNICO' | 'ADMIN';

/**
 * Pago de una cita finalizada según quién la mira: el técnico registra el costo final y confirma el
 * efectivo, el cliente revisa la diferencia y elige cómo pagar, y el administrador solo consulta.
 */
@Component({
  selector: 'app-panel-pago',
  standalone: false,
  templateUrl: './panel-pago.component.html',
})
export class PanelPagoComponent implements OnInit {
  @Input({ required: true }) citaId!: number;
  @Input({ required: true }) rol!: RolPanelPago;

  pago: Pago | null = null;
  cargando = true;
  errorCarga: string | null = null;
  /** Mensaje del backend cuando todavía no existe un pago para la cita (404). */
  avisoSinPago: string | null = null;
  /** Resultado de la última acción; se anuncia a los lectores de pantalla. */
  mensajeResultado: string | null = null;

  confirmandoEfectivo = false;
  enviandoEfectivo = false;
  errorEfectivo: string | null = null;

  readonly etiquetaMetodo = etiquetaMetodoPago;

  constructor(
    private pagoService: PagoService,
    private avisos: AvisosPagoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get costoRegistrado(): boolean {
    return tieneCostoFinal(this.pago);
  }

  get advertirDiferencia(): boolean {
    return this.rol === 'CLIENTE' && !!this.pago?.diferenciaSignificativa;
  }

  get puedeElegirMetodo(): boolean {
    return this.rol === 'CLIENTE' && puedeElegirMetodo(this.pago);
  }

  get pagoFallido(): boolean {
    return this.pago?.estado === 'FALLIDO';
  }

  get efectivoPendiente(): boolean {
    return efectivoPorConfirmar(this.pago);
  }

  get enLineaPendiente(): boolean {
    return enLineaEnProceso(this.pago);
  }

  get tecnicoEsperaMetodo(): boolean {
    return this.rol === 'TECNICO' && this.costoRegistrado && !this.pago?.metodo;
  }

  get pagado(): boolean {
    return this.pago?.estado === 'PAGADO';
  }

  cargar(): void {
    this.cargando = true;
    this.errorCarga = null;
    this.avisoSinPago = null;

    this.pagoService
      .obtener(this.citaId)
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (pago) => (this.pago = pago),
        error: (err) => {
          this.pago = null;
          const mensaje = obtenerMensajeError(err, 'No fue posible cargar el pago.');
          if (err instanceof HttpErrorResponse && err.status === 404) this.avisoSinPago = mensaje;
          else this.errorCarga = mensaje;
        },
      });
  }

  alActualizar(pago: Pago, mensaje: string | null = null): void {
    this.pago = pago;
    this.mensajeResultado = mensaje;
  }

  abrirConfirmacionEfectivo(): void {
    this.errorEfectivo = null;
    this.confirmandoEfectivo = true;
  }

  cerrarConfirmacionEfectivo(): void {
    if (!this.enviandoEfectivo) this.confirmandoEfectivo = false;
  }

  confirmarEfectivo(): void {
    if (this.enviandoEfectivo) return;
    this.enviandoEfectivo = true;
    this.errorEfectivo = null;

    this.pagoService
      .confirmarEfectivo(this.citaId)
      .pipe(
        finalize(() => {
          this.enviandoEfectivo = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (pago) => {
          this.confirmandoEfectivo = false;
          this.alActualizar(pago, 'El pago en efectivo fue confirmado.');
          this.avisos.anunciarEfectivoConfirmado(pago.citaId);
        },
        error: (err) => {
          this.errorEfectivo = obtenerMensajeError(err, 'No fue posible confirmar el pago en efectivo.');
          this.avisos.error('No se pudo confirmar el pago en efectivo', this.errorEfectivo);
        },
      });
  }
}
