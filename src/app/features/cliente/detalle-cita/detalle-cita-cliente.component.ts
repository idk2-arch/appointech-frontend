import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize, Subscription } from 'rxjs';

import { CitaResumen, DetalleCita } from '../../../core/models/cita';
import { CitaClienteService } from '../../../core/services/cita-cliente.service';
import { clientePuedeModificar } from '../../../core/utils/acciones-cita';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';

type Dialogo = 'cancelar' | 'reprogramar' | null;

@Component({
  selector: 'app-detalle-cita-cliente',
  standalone: false,
  templateUrl: './detalle-cita-cliente.component.html',
})
export class DetalleCitaClienteComponent implements OnInit, OnDestroy {
  cita: DetalleCita | null = null;
  cargando = true;
  errorCarga: string | null = null;

  dialogo: Dialogo = null;
  enviando = false;
  errorDialogo: string | null = null;
  mensajeExito: string | null = null;

  private id = 0;
  private consulta?: Subscription;

  constructor(
    private ruta: ActivatedRoute,
    private citaService: CitaClienteService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.id = Number(this.ruta.snapshot.paramMap.get('id'));
    this.cargar();
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }

  get puedeModificar(): boolean {
    return !!this.cita && clientePuedeModificar(this.cita.estado);
  }

  cargar(): void {
    this.consulta?.unsubscribe();
    this.cargando = true;
    this.errorCarga = null;

    this.consulta = this.citaService
      .obtener(this.id)
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (cita) => (this.cita = cita),
        error: (err) => {
          this.cita = null;
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar la cita.');
        },
      });
  }

  abrir(dialogo: Dialogo): void {
    this.errorDialogo = null;
    this.dialogo = dialogo;
  }

  cerrarDialogo(): void {
    if (!this.enviando) this.dialogo = null;
  }

  cancelar(motivo: string | undefined): void {
    this.ejecutar(this.citaService.cancelar(this.id, motivo), 'Tu cita fue cancelada.', 'No fue posible cancelar la cita.');
  }

  reprogramar(inicio: string): void {
    this.ejecutar(
      this.citaService.reprogramar(this.id, inicio),
      'Tu cita fue reprogramada.',
      'No fue posible reprogramar la cita.'
    );
  }

  private ejecutar(accion: Observable<CitaResumen>, exito: string, falla: string): void {
    this.enviando = true;
    this.errorDialogo = null;

    accion
      .pipe(
        finalize(() => {
          this.enviando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.dialogo = null;
          this.mensajeExito = exito;
          this.recargarSilencioso();
        },
        error: (err) => (this.errorDialogo = obtenerMensajeError(err, falla)),
      });
  }

  /** Refresca el detalle (estado e historial) sin volver a mostrar el indicador de carga. */
  private recargarSilencioso(): void {
    this.citaService.obtener(this.id).subscribe({
      next: (cita) => {
        this.cita = cita;
        this.cdr.markForCheck();
      },
    });
  }
}
