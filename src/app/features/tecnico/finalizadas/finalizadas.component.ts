import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, finalize } from 'rxjs';

import { CitaFinalizadaTecnico } from '../../../core/models/tecnico-agenda';
import { AgendaTecnicoService } from '../../../core/services/agenda-tecnico.service';
import { contarSinCostoFinal, ordenarMasRecientesPrimero } from '../../../core/utils/citas-finalizadas';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { nombreCompleto } from '../../../core/utils/nombre-persona';

/** Citas finalizadas del técnico, con el estado del cobro y acceso a registrar el costo final. */
@Component({
  selector: 'app-finalizadas',
  standalone: false,
  templateUrl: './finalizadas.component.html',
})
export class FinalizadasComponent implements OnInit, OnDestroy {
  citas: CitaFinalizadaTecnico[] = [];
  cargando = true;
  errorCarga: string | null = null;

  private consulta?: Subscription;

  constructor(
    private agendaService: AgendaTecnicoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }

  get sinCostoFinal(): number {
    return contarSinCostoFinal(this.citas);
  }

  clienteDe(cita: CitaFinalizadaTecnico): string {
    return nombreCompleto(cita.cliente?.nombre, cita.cliente?.apellido);
  }

  cargar(): void {
    this.consulta?.unsubscribe();
    this.cargando = true;
    this.errorCarga = null;

    this.consulta = this.agendaService
      .obtenerFinalizadas()
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (citas) => (this.citas = Array.isArray(citas) ? ordenarMasRecientesPrimero(citas) : []),
        error: (err) => {
          this.citas = [];
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar tus citas finalizadas.');
        },
      });
  }
}
