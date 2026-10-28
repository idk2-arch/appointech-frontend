import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize, Subscription } from 'rxjs';

import { FOTOS_ELECTRODOMESTICO_MAXIMO } from '../../../core/config/foto.config';
import { CitaResumen, DetalleCita, FotoElectrodomestico } from '../../../core/models/cita';
import { CitaClienteService } from '../../../core/services/cita-cliente.service';
import { FotoElectrodomesticoService } from '../../../core/services/foto-electrodomestico.service';
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

  /** Fotos elegidas y aún sin subir (incluye las que fallaron, para reintentar). */
  fotosNuevas: string[] = [];
  enviandoFotos = false;
  errorFotos: string | null = null;

  private id = 0;
  private consulta?: Subscription;

  constructor(
    private ruta: ActivatedRoute,
    private citaService: CitaClienteService,
    private fotoService: FotoElectrodomesticoService,
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

  /** Cuántas fotos más caben en la cita. */
  get cupoFotos(): number {
    return Math.max(0, FOTOS_ELECTRODOMESTICO_MAXIMO - (this.cita?.fotosElectrodomestico?.length ?? 0));
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

  subirFotos(): void {
    if (this.fotosNuevas.length === 0) return;

    this.enviandoFotosDurante(this.fotoService.subirVarias(this.id, this.fotosNuevas)).subscribe((resultado) => {
      // Las que fallaron se quedan elegidas para poder reintentar.
      this.fotosNuevas = resultado.fallidas;
      if (resultado.fallidas.length > 0) {
        this.errorFotos = `${resultado.mensajeError ?? 'No fue posible subir la foto.'} Puedes reintentar.`;
      }
      if (resultado.subidas.length > 0) {
        this.mensajeExito = resultado.subidas.length === 1 ? 'La foto fue agregada.' : 'Las fotos fueron agregadas.';
        this.recargarSilencioso();
      }
    });
  }

  quitarFoto(foto: FotoElectrodomestico): void {
    this.enviandoFotosDurante(this.fotoService.eliminar(this.id, foto.id)).subscribe({
      next: () => {
        this.mensajeExito = 'La foto fue eliminada.';
        this.recargarSilencioso();
      },
      error: (err) => (this.errorFotos = obtenerMensajeError(err, 'No fue posible quitar la foto.')),
    });
  }

  /** Marca que se están enviando fotos (y limpia el error anterior) mientras dura la acción. */
  private enviandoFotosDurante<T>(accion: Observable<T>): Observable<T> {
    this.enviandoFotos = true;
    this.errorFotos = null;
    return accion.pipe(
      finalize(() => {
        this.enviandoFotos = false;
        this.cdr.markForCheck();
      })
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
