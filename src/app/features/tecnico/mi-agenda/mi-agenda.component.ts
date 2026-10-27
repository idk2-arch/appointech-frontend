import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { finalize, Subscription } from 'rxjs';

import { EstadoCita } from '../../../core/models/cita';
import { CitaTecnico } from '../../../core/models/tecnico-agenda';
import { AgendaTecnicoService } from '../../../core/services/agenda-tecnico.service';
import { etiquetaEstadoCita } from '../../../core/utils/estado-cita';
import { hoyIso } from '../../../core/utils/fecha-local';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { enlaceTelefono } from '../../../core/utils/telefono';

@Component({
  selector: 'app-mi-agenda',
  standalone: false,
  templateUrl: './mi-agenda.component.html',
})
export class MiAgendaComponent implements OnInit, OnDestroy {
  fecha = hoyIso();
  citas: CitaTecnico[] = [];
  cargando = true;
  errorCarga: string | null = null;

  readonly enlaceTelefono = enlaceTelefono;

  private consulta?: Subscription;

  constructor(
    private agendaService: AgendaTecnicoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarCitas();
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }

  cambiarFecha(fecha: string): void {
    this.fecha = fecha;
    this.cargarCitas();
  }

  cargarCitas(): void {
    // Si se cambia de día rápido, la respuesta anterior se descarta.
    this.consulta?.unsubscribe();
    this.cargando = true;
    this.errorCarga = null;

    this.consulta = this.agendaService
      .obtenerCitas(this.fecha)
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (citas) => {
          this.citas = Array.isArray(citas) ? citas : [];
        },
        error: (err) => {
          this.citas = [];
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar tus citas.');
        },
      });
  }

  etiquetaEstado(estado: EstadoCita): string {
    return etiquetaEstadoCita(estado);
  }

  claseEstado(estado: EstadoCita): string {
    switch (estado) {
      case 'EN_CAMINO':
        return 'border-sky-300/40 bg-sky-300/10 text-sky-200';
      case 'EN_PROCESO':
        return 'border-amber-300/40 bg-amber-300/10 text-amber-200';
      default:
        return 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200';
    }
  }
}
