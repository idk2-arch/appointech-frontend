import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, finalize, from, map, mergeMap, of, Subscription } from 'rxjs';

import type { CitaResumen } from '../../../core/models/cita';
import type { Calificacion, CalificarServicioRequest } from '../../../core/models/calificacion';
import { CalificacionService } from '../../../core/services/calificacion.service';
import { CitaClienteService } from '../../../core/services/cita-cliente.service';
import { esPlazoVencido, esYaCalificada, plazoCalificacionVencido } from '../../../core/utils/calificacion';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { ToastService } from '../../../shared/toast/toast.service';

export type VistaHistorial = 'FINALIZADA' | 'CANCELADA';

/** Lo que se sabe de la calificación de una cita: se pide bajo demanda y de a pocas a la vez. */
export type EntradaCalificacion =
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'lista'; calificacion: Calificacion | null };

/** Citas por tanda: limita cuántas calificaciones se consultan (el listado no las trae). */
export const TAMANO_TANDA = 10;
/** Consultas de calificación simultáneas. */
export const CONSULTAS_SIMULTANEAS = 3;

/** Historial del cliente: servicios finalizados (con su calificación) y citas canceladas. */
@Component({
  selector: 'app-historial-cliente',
  standalone: false,
  templateUrl: './historial-cliente.component.html',
})
export class HistorialClienteComponent implements OnInit {
  private readonly citasService = inject(CitaClienteService);
  private readonly calificacionService = inject(CalificacionService);
  private readonly toast = inject(ToastService);

  readonly vistas: { valor: VistaHistorial; etiqueta: string }[] = [
    { valor: 'FINALIZADA', etiqueta: 'Finalizadas' },
    { valor: 'CANCELADA', etiqueta: 'Canceladas' },
  ];

  readonly cargando = signal(true);
  readonly errorCarga = signal<string | null>(null);
  readonly citas = signal<CitaResumen[]>([]);
  readonly vista = signal<VistaHistorial>('FINALIZADA');
  readonly mostradas = signal(TAMANO_TANDA);
  readonly calificaciones = signal<Record<number, EntradaCalificacion>>({});
  /** Citas a las que el backend dijo que ya se venció el plazo (aunque en pantalla no lo pareciera). */
  readonly vencidasPorServidor = signal<ReadonlySet<number>>(new Set());

  readonly citaACalificar = signal<CitaResumen | null>(null);
  readonly enviando = signal(false);
  readonly errorEnvio = signal<string | null>(null);
  /** La calificación se guardó y el diálogo muestra el agradecimiento hasta que la persona lo cierre. */
  readonly calificacionEnviada = signal(false);

  /** Más recientes primero. */
  readonly delaVista = computed(() =>
    this.citas()
      .filter((c) => c.estado === this.vista())
      .sort((a, b) => (b.fechaHoraInicio || '').localeCompare(a.fechaHoraInicio || ''))
  );
  readonly visibles = computed(() => this.delaVista().slice(0, this.mostradas()));
  readonly faltan = computed(() => this.delaVista().length - this.visibles().length);
  readonly cantidades = computed(() => ({
    FINALIZADA: this.citas().filter((c) => c.estado === 'FINALIZADA').length,
    CANCELADA: this.citas().filter((c) => c.estado === 'CANCELADA').length,
  }));

  private consulta?: Subscription;
  private readonly consultasCalificacion = new Subscription();
  private readonly pedidas = new Set<number>();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.consulta?.unsubscribe();
      this.consultasCalificacion.unsubscribe();
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.consulta?.unsubscribe();
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.consulta = this.citasService
      .listar()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (citas) => {
          this.citas.set(Array.isArray(citas) ? citas : []);
          this.pedirVisibles();
        },
        error: (err) => {
          this.citas.set([]);
          this.errorCarga.set(obtenerMensajeError(err, 'No fue posible cargar tu historial.'));
        },
      });
  }

  cambiarVista(vista: VistaHistorial): void {
    this.vista.set(vista);
    this.mostradas.set(TAMANO_TANDA);
    this.pedirVisibles();
  }

  verMas(): void {
    this.mostradas.update((n) => n + TAMANO_TANDA);
    this.pedirVisibles();
  }

  entrada(citaId: number): EntradaCalificacion | undefined {
    return this.calificaciones()[citaId];
  }

  /** No se ofrece calificar pasados 30 días del fin de la cita, ni si el backend ya lo rechazó por plazo. */
  plazoVencido(cita: CitaResumen): boolean {
    return this.vencidasPorServidor().has(cita.id) || plazoCalificacionVencido(cita.fechaHoraFin || cita.fechaHoraInicio);
  }

  reintentar(citaId: number): void {
    this.pedidas.delete(citaId);
    this.pedir([citaId]);
  }

  abrirCalificar(cita: CitaResumen): void {
    this.errorEnvio.set(null);
    this.calificacionEnviada.set(false);
    this.citaACalificar.set(cita);
  }

  cerrarCalificar(): void {
    if (this.enviando()) return;
    this.citaACalificar.set(null);
    this.calificacionEnviada.set(false);
  }

  calificar(cuerpo: CalificarServicioRequest): void {
    const cita = this.citaACalificar();
    if (!cita || this.enviando()) return;
    this.enviando.set(true);
    this.errorEnvio.set(null);

    this.calificacionService
      .calificar(cita.id, cuerpo)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (calificacion) => {
          this.poner(cita.id, { estado: 'lista', calificacion });
          this.calificacionEnviada.set(true);
          this.toast.exito('Gracias por tu calificación');
        },
        error: (err) => this.alFallarEnvio(cita, err),
      });
  }

  private alFallarEnvio(cita: CitaResumen, err: unknown): void {
    const mensaje = obtenerMensajeError(err, 'No fue posible enviar tu calificación. Intenta de nuevo.');
    this.toast.error(mensaje);
    if (esYaCalificada(err)) {
      this.citaACalificar.set(null);
      this.reintentar(cita.id);
    } else if (esPlazoVencido(err)) {
      this.citaACalificar.set(null);
      this.vencidasPorServidor.update((s) => new Set(s).add(cita.id));
    } else {
      this.errorEnvio.set(mensaje);
    }
  }

  private pedirVisibles(): void {
    if (this.vista() === 'FINALIZADA') this.pedir(this.visibles().map((c) => c.id));
  }

  /** Consulta la calificación de las citas que aún no se han pedido, de a pocas a la vez. */
  private pedir(ids: number[]): void {
    const nuevas = ids.filter((id) => !this.pedidas.has(id));
    if (nuevas.length === 0) return;
    for (const id of nuevas) {
      this.pedidas.add(id);
      this.poner(id, { estado: 'cargando' });
    }

    this.consultasCalificacion.add(
      from(nuevas)
        .pipe(
          mergeMap(
            (id) =>
              this.calificacionService.obtener(id).pipe(
                map((calificacion): [number, EntradaCalificacion] => [id, { estado: 'lista', calificacion }]),
                catchError((err) => of<[number, EntradaCalificacion]>([id, this.entradaDeError(err)]))
              ),
            CONSULTAS_SIMULTANEAS
          )
        )
        .subscribe(([id, entrada]) => this.poner(id, entrada))
    );
  }

  /** 404 es lo normal cuando aún no se calificó. */
  private entradaDeError(err: unknown): EntradaCalificacion {
    if (err instanceof HttpErrorResponse && err.status === 404) return { estado: 'lista', calificacion: null };
    return { estado: 'error', mensaje: obtenerMensajeError(err, 'No pudimos consultar tu calificación.') };
  }

  private poner(citaId: number, entrada: EntradaCalificacion): void {
    this.calificaciones.update((actual) => ({ ...actual, [citaId]: entrada }));
  }
}
