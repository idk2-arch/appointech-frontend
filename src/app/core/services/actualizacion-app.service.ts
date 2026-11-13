import { Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

import { ToastService } from '../../shared/toast/toast.service';
import { NavegadorService } from './navegador.service';

/**
 * Avisa cuando el service worker ya descargó una versión nueva de la app y permite aplicarla. Reutiliza el
 * aviso emergente de la app (persistente, con botón) en vez de un componente propio.
 */
@Injectable({ providedIn: 'root' })
export class ActualizacionAppService {
  constructor(
    private actualizaciones: SwUpdate,
    private toast: ToastService,
    private navegador: NavegadorService
  ) {}

  /** Empieza a escuchar. Sin service worker activo (desarrollo, navegador sin soporte) no hace nada. */
  vigilar(): void {
    if (!this.actualizaciones.isEnabled) return;
    this.actualizaciones.versionUpdates
      .pipe(filter((evento): evento is VersionReadyEvent => evento.type === 'VERSION_READY'))
      .subscribe(() => this.avisar());
  }

  private avisar(): void {
    this.toast.mostrar({
      tipo: 'info',
      titulo: 'Hay una nueva versión disponible',
      descripcion: 'Actualiza para usar la versión más reciente.',
      duracion: 0,
      accion: { etiqueta: 'Actualizar', accion: () => void this.aplicar() },
    });
  }

  private async aplicar(): Promise<void> {
    try {
      await this.actualizaciones.activateUpdate();
    } catch {
      console.error('No se pudo activar la nueva versión; se recarga la página.');
    }
    this.navegador.recargar();
  }
}
