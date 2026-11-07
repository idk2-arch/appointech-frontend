import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, Subscription } from 'rxjs';

import type { Notificacion } from '../../core/models/notificacion';
import { AuthService } from '../../core/services/auth.service';
import { ConteoNotificacionesService } from '../../core/services/conteo-notificaciones.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { obtenerMensajeError } from '../../core/utils/manejo-errores';
import { categoriaNotificacion, rutaDeCita } from '../../core/utils/notificacion';
import { tiempoRelativo } from '../../core/utils/tiempo-relativo';
import { ToastService } from '../toast/toast.service';

export const NOTIFICACIONES_POR_PAGINA = 10;

export type VistaNotificaciones = 'todas' | 'no-leidas';

/** Notificaciones de cualquier rol: lista paginada con filtro, marcar como leídas y atajo a la cita. */
@Component({
  selector: 'app-notificaciones',
  standalone: false,
  templateUrl: './notificaciones.component.html',
})
export class NotificacionesComponent implements OnInit, OnDestroy {
  private readonly servicio = inject(NotificacionService);
  private readonly conteo = inject(ConteoNotificacionesService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly tamano = NOTIFICACIONES_POR_PAGINA;
  readonly esqueletos = [1, 2, 3];
  readonly vistas: { valor: VistaNotificaciones; etiqueta: string }[] = [
    { valor: 'todas', etiqueta: 'Todas' },
    { valor: 'no-leidas', etiqueta: 'No leídas' },
  ];
  readonly categoria = categoriaNotificacion;
  readonly tiempo = tiempoRelativo;

  readonly filas = signal<Notificacion[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly vista = signal<VistaNotificaciones>('todas');
  readonly cargando = signal(true);
  readonly errorCarga = signal<string | null>(null);
  readonly marcandoTodas = signal(false);

  private consulta?: Subscription;
  private readonly acciones = new Subscription();

  /** Cuántas sin leer hay según el menú; con el conteo aún sin cargar se deja pulsar el botón. */
  get sinPendientes(): boolean {
    return this.conteo.noLeidas() === 0;
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
    this.acciones.unsubscribe();
  }

  cargar(): void {
    this.consulta?.unsubscribe();
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.consulta = this.servicio
      .listar({ soloNoLeidas: this.vista() === 'no-leidas', page: this.pagina(), size: this.tamano })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ filas, total }) => {
          this.filas.set(filas);
          this.total.set(total);
        },
        error: (err) => {
          this.filas.set([]);
          this.total.set(0);
          this.errorCarga.set(obtenerMensajeError(err, 'No fue posible cargar tus notificaciones.'));
        },
      });
  }

  cambiarVista(vista: VistaNotificaciones): void {
    if (vista === this.vista()) return;
    this.vista.set(vista);
    this.pagina.set(0);
    this.cargar();
  }

  irAPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  /** Marca la notificación como leída y, si trae cita y el rol tiene su detalle, abre esa cita. */
  abrir(notificacion: Notificacion): void {
    const destino = rutaDeCita(this.auth.obtenerRol(), notificacion.citaId);
    const navegar = (): void => {
      if (destino) this.router.navigate(destino).catch(() => undefined);
    };
    if (notificacion.leida) {
      navegar();
      return;
    }

    this.acciones.add(
      this.servicio
        .marcarLeida(notificacion.id)
        .pipe(finalize(navegar))
        .subscribe({
          next: () => {
            this.filas.update((filas) => filas.map((f) => (f.id === notificacion.id ? { ...f, leida: true } : f)));
            this.conteo.refrescar();
          },
          error: (err) => this.toast.error('No se pudo marcar como leída', obtenerMensajeError(err, 'Intenta de nuevo.')),
        })
    );
  }

  marcarTodas(): void {
    if (this.marcandoTodas()) return;
    this.marcandoTodas.set(true);

    this.acciones.add(
      this.servicio
        .marcarTodasLeidas()
        .pipe(finalize(() => this.marcandoTodas.set(false)))
        .subscribe({
          next: () => {
            this.toast.exito('Todas tus notificaciones quedaron como leídas');
            this.conteo.refrescar();
            this.cargar();
          },
          error: (err) => this.toast.error('No se pudieron marcar', obtenerMensajeError(err, 'Intenta de nuevo.')),
        })
    );
  }
}
