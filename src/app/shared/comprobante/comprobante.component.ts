import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { finalize } from 'rxjs';

import { Comprobante } from '../../core/models/pago';
import { NavegadorService } from '../../core/services/navegador.service';
import { AvisosPagoService } from '../toast/avisos-pago.service';
import { PagoService } from '../../core/services/pago.service';
import { etiquetaMetodoPago } from '../../core/utils/estado-pago';
import { obtenerMensajeError } from '../../core/utils/manejo-errores';

/** Comprobante de un pago PAGADO. El backend lo genera; aquí solo se consulta y se imprime. */
@Component({
  selector: 'app-comprobante',
  standalone: false,
  templateUrl: './comprobante.component.html',
})
export class ComprobanteComponent implements OnInit {
  @Input({ required: true }) citaId!: number;

  comprobante: Comprobante | null = null;
  cargando = true;
  errorMensaje: string | null = null;

  readonly etiquetaMetodo = etiquetaMetodoPago;

  constructor(
    private pagoService: PagoService,
    private navegador: NavegadorService,
    private avisos: AvisosPagoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.errorMensaje = null;
    this.pagoService
      .obtenerComprobante(this.citaId)
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (comprobante) => (this.comprobante = comprobante),
        error: (err) => {
          this.errorMensaje = obtenerMensajeError(err, 'No fue posible cargar el comprobante.');
          this.avisos.error('No se pudo cargar el comprobante', this.errorMensaje);
        },
      });
  }

  descargar(): void {
    this.navegador.imprimir();
  }
}
