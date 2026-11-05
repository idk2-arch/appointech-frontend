import { Injectable } from '@angular/core';

const CLAVE = 'appointech_pago_cita';

/**
 * Recuerda la cita cuyo pago en línea se inició, para retomarla al volver de la pasarela
 * (la dirección de retorno solo trae el id de la transacción). Vive solo en esta pestaña.
 */
@Injectable({ providedIn: 'root' })
export class RetornoPagoService {
  guardar(citaId: number): void {
    try {
      sessionStorage.setItem(CLAVE, String(citaId));
    } catch {
      // Sin almacenamiento, la página de retorno aceptará la cita en la dirección (?citaId=).
    }
  }

  leer(): number | null {
    try {
      const valor = Number(sessionStorage.getItem(CLAVE));
      return Number.isInteger(valor) && valor > 0 ? valor : null;
    } catch {
      return null;
    }
  }

  olvidar(): void {
    try {
      sessionStorage.removeItem(CLAVE);
    } catch {
      // Nada que limpiar.
    }
  }
}
