import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { catchError, finalize, map, mergeMap, of, Subject, Subscription } from 'rxjs';

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
  /** Citas cuya tarjeta se acerca a la pantalla: se consultan de a pocas a la vez, sin repetir las ya pedidas. */
  private readonly cola = new Subject<number>();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.consulta?.unsubscribe();
      this.consultasCalificacion.unsubscribe();
    });
  }

  ngOnInit(): void {
    this.consultasCalificacion.add(
      this.cola
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
  }

  verMas(): void {
    this.mostradas.update((n) => n + TAMANO_TANDA);
  }

  entrada(citaId: number): EntradaCalificacion | undefined {
    return this.calificaciones()[citaId];
  }

  /** No se ofrece calificar pasados 30 días del fin de la cita, ni si el backend ya lo rechazó por plazo. */
  plazoVencido(cita: CitaResumen): boolean {
    return this.vencidasPorServidor().has(cita.id) || plazoCalificacionVencido(cita.fechaHoraFin || cita.fechaHoraInicio);
  }

  /** La tarjeta está por verse: se pide su calificación (una sola vez por cita). */
  solicitar(citaId: number): void {
    if (this.pedidas.has(citaId)) return;
    this.pedidas.add(citaId);
    this.poner(citaId, { estado: 'cargando' });
    this.cola.next(citaId);
  }

  reintentar(citaId: number): void {
    this.pedidas.delete(citaId);
    this.calificacionService.olvidar(citaId);
    this.solicitar(citaId);
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

  /** El 404 (aún sin calificar) ya lo resuelve el servicio como "sin calificar"; aquí llega lo demás. */
  private entradaDeError(err: unknown): EntradaCalificacion {
    return { estado: 'error', mensaje: obtenerMensajeError(err, 'No pudimos consultar tu calificación.') };
  }

  private poner(citaId: number, entrada: EntradaCalificacion): void {
    this.calificaciones.update((actual) => ({ ...actual, [citaId]: entrada }));
  }
}
