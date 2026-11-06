import { Injectable } from '@angular/core';

import { ToastService } from './toast.service';

const CLAVE = 'appointech_alertas_admin_avisadas';

/** Avisa al administrador, una sola vez por sesión, de que hay solicitudes sin técnico. */
@Injectable({ providedIn: 'root' })
export class AvisosAlertasService {
  constructor(private toast: ToastService) {}

  anunciar(total: number): void {
    if (total <= 0 || this.yaAvisado()) return;
    this.marcarAvisado();
    const plural = total === 1 ? '1 solicitud sin técnico' : `${total} solicitudes sin técnico`;
    this.toast.advertencia(plural, 'Un cliente espera que lo contactes. Revisa las alertas.');
  }

  private yaAvisado(): boolean {
    try {
      return sessionStorage.getItem(CLAVE) === '1';
    } catch {
      return false;
    }
  }

  private marcarAvisado(): void {
    try {
      sessionStorage.setItem(CLAVE, '1');
    } catch {
      // Sin almacenamiento, el peor caso es repetir el aviso en la sesión.
    }
  }
}
