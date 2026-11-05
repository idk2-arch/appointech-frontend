import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';

import { EstadoPago, Pago } from '../../../core/models/pago';
import { NavegadorService } from '../../../core/services/navegador.service';
import { PagoService } from '../../../core/services/pago.service';
import { RetornoPagoService } from '../../../core/services/retorno-pago.service';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { AvisosPagoService } from '../../../shared/toast/avisos-pago.service';

const MENSAJES_RESULTADO: Record<EstadoPago, string> = {
  PAGADO: 'Tu pago fue exitoso. Ya puedes ver el comprobante en el detalle de la cita.',
  PENDIENTE: 'Tu pago todavía está en proceso. Verifica de nuevo en unos instantes.',
  FALLIDO: 'El pago no se completó. Puedes intentarlo de nuevo.',
};

/**
 * Página a la que la pasarela devuelve al cliente (/cliente/pago/resultado?id=<transacción>).
 * La cita sale de `?citaId=`; solo si no viene se usa la que se guardó al iniciar el pago. Sin `id` el backend
 * consulta por la referencia que ya tiene el pago.
 */
@Component({
  selector: 'app-resultado-pago',
  standalone: false,
  templateUrl: './resultado-pago.component.html',
})
export class ResultadoPagoComponent implements OnInit {
  pago: Pago | null = null;
  citaId: number | null = null;
  cargando = true;
  errorMensaje: string | null = null;

  reintentando = false;
  errorReintento: string | null = null;

  private idTransaccion: string | null = null;

  constructor(
    private ruta: ActivatedRoute,
    private pagoService: PagoService,
    private retornoPago: RetornoPagoService,
    private navegador: NavegadorService,
    private avisos: AvisosPagoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const parametros = this.ruta.snapshot.queryParamMap;
    this.idTransaccion = parametros.get('id')?.trim() || null;
    const citaEnUrl = Number(parametros.get('citaId'));
    this.citaId = Number.isInteger(citaEnUrl) && citaEnUrl > 0 ? citaEnUrl : this.retornoPago.leer();
    this.sincronizar();
  }

  get mensajeResultado(): string {
    return this.pago ? MENSAJES_RESULTADO[this.pago.estado] : '';
  }

  get fallido(): boolean {
    return this.pago?.estado === 'FALLIDO';
  }

  sincronizar(): void {
    if (this.citaId === null) {
      this.cargando = false;
      this.errorMensaje = 'No pudimos identificar la cita de este pago. Revisa su estado desde tus citas.';
      return;
    }

    this.cargando = true;
    this.errorMensaje = null;
    this.pagoService
      .sincronizar(this.citaId, this.idTransaccion ?? undefined)
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (pago) => {
          this.pago = pago;
          if (pago.estado !== 'PENDIENTE') this.retornoPago.olvidar();
          this.avisos.anunciarResultado(pago);
        },
        error: (err) => {
          this.errorMensaje = obtenerMensajeError(err, 'No fue posible verificar el pago.');
          this.avisos.error('No se pudo verificar el pago', this.errorMensaje);
        },
      });
  }

  reintentar(): void {
    if (this.reintentando || this.citaId === null) return;
    this.reintentando = true;
    this.errorReintento = null;

    this.pagoService
      .elegirMetodo(this.citaId, 'EN_LINEA')
      .pipe(
        finalize(() => {
          this.reintentando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (pago) => {
          this.retornoPago.guardar(pago.citaId);
          this.avisos.reiniciar(pago.citaId);
          if (!pago.urlPago || !this.navegador.redirigir(pago.urlPago)) {
            this.errorReintento = 'No recibimos una dirección de pago válida. Intenta de nuevo desde el detalle de tu cita.';
          }
        },
        error: (err) => {
          this.errorReintento = obtenerMensajeError(err, 'No fue posible iniciar el pago de nuevo.');
          this.avisos.error('No se pudo iniciar el pago', this.errorReintento);
        },
      });
  }
}
