import { Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';

import { ToastService } from '../../shared/toast/toast.service';
import { NotificacionService } from './notificacion.service';

export const INTERVALO_CONTEO_MS = 30_000;

/**
 * Cuántas notificaciones sin leer hay, para el contador del menú. Consulta cada 30 s mientras la pestaña esté
 * visible (se pausa al ocultarse y al volver refresca de inmediato) y avisa con un toast cuando el número sube.
 * Quien muestra un menú con sesión lo inicia al crearse y lo detiene al destruirse (cerrar sesión incluida).
 */
@Injectable({ providedIn: 'root' })
export class ConteoNotificacionesService {
  private readonly _noLeidas = signal<number | null>(null);

  /** Null mientras no se haya cargado; no se muestra como 0. */
  readonly noLeidas = this._noLeidas.asReadonly();

  private activo = false;
  private temporizador?: ReturnType<typeof setInterval>;
  private consulta?: Subscription;

  constructor(
    private notificaciones: NotificacionService,
    private toast: ToastService
  ) {}

  iniciar(): void {
    if (this.activo) return;
    this.activo = true;
    document.addEventListener('visibilitychange', this.alCambiarVisibilidad);
    if (!document.hidden) this.reanudar();
  }

  /** Detiene todo y olvida el conteo: la siguiente sesión empieza sin avisar de lo que ya había. */
  detener(): void {
    this.activo = false;
    document.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
    this.pausar();
    this.consulta?.unsubscribe();
    this._noLeidas.set(null);
  }

  /** Consulta ya: al volver a la pestaña o después de marcar notificaciones como leídas. */
  refrescar(): void {
    this.consulta?.unsubscribe();
    this.consulta = this.notificaciones.contarNoLeidas().subscribe({
      next: (total) => this.recibir(total),
      // Un fallo de red no rompe nada: se conserva el último conteo y se reintenta en el siguiente ciclo.
      error: () => undefined,
    });
  }

  private recibir(total: number): void {
    const anterior = this._noLeidas();
    this._noLeidas.set(total);
    if (anterior !== null && total > anterior) {
      const nuevas = total - anterior;
      this.toast.info(nuevas === 1 ? 'Tienes una notificación nueva' : `Tienes ${nuevas} notificaciones nuevas`);
    }
  }

  private reanudar(): void {
    this.refrescar();
    this.temporizador = setInterval(() => this.refrescar(), INTERVALO_CONTEO_MS);
  }

  private pausar(): void {
    clearInterval(this.temporizador);
    this.temporizador = undefined;
  }

  private readonly alCambiarVisibilidad = (): void => {
    if (!this.activo) return;
    if (document.hidden) this.pausar();
    else if (this.temporizador === undefined) this.reanudar();
  };
}
