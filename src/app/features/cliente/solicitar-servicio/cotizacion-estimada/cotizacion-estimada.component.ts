import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { finalize } from 'rxjs';

import { Cotizacion } from '../../../../core/models/pago';
import { PagoService } from '../../../../core/services/pago.service';
import { obtenerMensajeError } from '../../../../core/utils/manejo-errores';

export const NOTA_COTIZACION =
  'Este valor es estimado. El costo final lo registra el técnico al terminar el servicio.';

/** Valor estimado de la especialidad elegida. Nunca bloquea la solicitud, aunque falle o no haya referencia. */
@Component({
  selector: 'app-cotizacion-estimada',
  standalone: false,
  templateUrl: './cotizacion-estimada.component.html',
})
export class CotizacionEstimadaComponent implements OnInit {
  @Input({ required: true }) especialidadId!: number;

  cotizacion: Cotizacion | null = null;
  cargando = true;
  errorMensaje: string | null = null;

  constructor(
    private pagoService: PagoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.pagoService
      .cotizarEspecialidad(this.especialidadId)
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (cotizacion) => (this.cotizacion = cotizacion),
        error: (err) => (this.errorMensaje = obtenerMensajeError(err, 'No fue posible consultar la cotización estimada.')),
      });
  }

  get nota(): string {
    return this.cotizacion?.nota || NOTA_COTIZACION;
  }
}
