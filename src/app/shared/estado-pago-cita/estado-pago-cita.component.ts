import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { finalize, Subscription } from 'rxjs';

import { Pago } from '../../core/models/pago';
import { PagoService } from '../../core/services/pago.service';
import { obtenerMensajeError } from '../../core/utils/manejo-errores';
import { tieneCostoFinal } from '../../core/utils/pago';

const SIN_COSTO_FINAL = 'El técnico aún no registra el costo final.';

/**
 * - inactivo: todavía no se ha pedido el pago (la tarjeta está cerrada).
 * - cargando / error: consulta en curso o fallida; ninguna acción de pago es segura.
 * - sin-costo: el técnico aún no registra el costo final.
 * - por-pagar: hay costo final y el pago está pendiente o fallido.
 * - pagado: ya se pagó; lo que corresponde es el comprobante.
 */
export type ModoPagoCita = 'inactivo' | 'cargando' | 'error' | 'sin-costo' | 'por-pagar' | 'pagado';

/**
 * Resumen del pago de una cita. Solo consulta al backend cuando está `activo` (p. ej. al expandir una tarjeta),
 * y expone su `modo` para que quien lo use decida qué acciones mostrar.
 */
@Component({
  selector: 'app-estado-pago-cita',
  standalone: false,
  template: `
    <div class="fs-cuerpo text-white/80" aria-live="polite">
      @switch (modo) {
        @case ('cargando') {
          <div role="status">
            <span class="sr-only">Consultando el pago…</span>
            <span class="block h-6 w-40 animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" aria-hidden="true"></span>
          </div>
        }
        @case ('error') {
          <p>{{ mensaje }}</p>
        }
        @case ('sin-costo') {
          <p>{{ mensaje }}</p>
        }
        @default {
          @if (pago) {
            <span class="inline-flex flex-wrap items-center gap-2">
              <app-insignia-pago [estado]="pago.estado"></app-insignia-pago>
              <span class="font-semibold text-white">{{ pago.montoFinal | pesos }}</span>
            </span>
          }
        }
      }
    </div>
  `,
})
export class EstadoPagoCitaComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) citaId!: number;
  /** Mientras sea falso no se consulta nada. Cada vez que pasa a verdadero se vuelve a consultar. */
  @Input() activo = true;
  /** Cada vez que llega el pago de la cita. */
  @Output() cargado = new EventEmitter<Pago>();

  pago: Pago | null = null;
  mensaje: string | null = null;

  private iniciado = false;
  private cargando = false;
  private fallo = false;
  private consulta?: Subscription;

  constructor(
    private pagoService: PagoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.activo) this.cargar();
  }

  ngOnChanges(cambios: SimpleChanges): void {
    const activo = cambios['activo'];
    if (activo && !activo.firstChange && this.activo) this.cargar();
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }

  get modo(): ModoPagoCita {
    if (!this.iniciado) return 'inactivo';
    if (this.cargando) return 'cargando';
    if (this.fallo) return 'error';
    if (!tieneCostoFinal(this.pago)) return 'sin-costo';
    return this.pago?.estado === 'PAGADO' ? 'pagado' : 'por-pagar';
  }

  private cargar(): void {
    this.consulta?.unsubscribe();
    this.iniciado = true;
    this.cargando = true;
    this.fallo = false;
    this.pago = null;
    this.mensaje = null;

    this.consulta = this.pagoService
      .obtener(this.citaId)
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (pago) => {
          this.pago = pago;
          if (!tieneCostoFinal(pago)) this.mensaje = SIN_COSTO_FINAL;
          // Fuera del ciclo de detección en curso: con una respuesta inmediata, el padre cambiaría lo ya revisado.
          queueMicrotask(() => this.cargado.emit(pago));
        },
        error: (err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            this.mensaje = SIN_COSTO_FINAL;
            return;
          }
          this.fallo = true;
          this.mensaje = obtenerMensajeError(err, 'No fue posible consultar el pago.');
        },
      });
  }
}
