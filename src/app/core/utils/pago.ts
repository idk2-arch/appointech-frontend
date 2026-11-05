import { HttpErrorResponse } from '@angular/common/http';

import type { Pago } from '../models/pago';

export function tieneCostoFinal(pago: Pago | null): boolean {
  return (pago?.montoFinal ?? 0) > 0;
}

/** El cliente elige método cuando hay costo final y aún no eligió, o cuando el intento falló. */
export function puedeElegirMetodo(pago: Pago | null): boolean {
  if (!pago || !tieneCostoFinal(pago) || pago.estado === 'PAGADO') return false;
  return pago.estado === 'FALLIDO' || !pago.metodo;
}

/** El técnico confirma el efectivo cuando el cliente lo eligió y todavía no se ha cobrado. */
export function efectivoPorConfirmar(pago: Pago | null): boolean {
  return pago?.metodo === 'EFECTIVO' && pago.estado === 'PENDIENTE';
}

export function enLineaEnProceso(pago: Pago | null): boolean {
  return pago?.metodo === 'EN_LINEA' && pago.estado === 'PENDIENTE';
}

/** 503: la pasarela de pagos no está disponible; el pago en efectivo sigue siendo posible. */
export function esPagoEnLineaNoDisponible(err: unknown): boolean {
  return err instanceof HttpErrorResponse && err.status === 503;
}

/** 409 por un pago en línea ya iniciado (otros 409 no son este caso). */
export function esPagoEnLineaEnProceso(err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse) || err.status !== 409) return false;
  const cuerpo = err.error;
  const mensaje = cuerpo && typeof cuerpo === 'object' ? (cuerpo.detail ?? cuerpo.error) : undefined;
  return typeof mensaje === 'string' && /en proceso/i.test(mensaje);
}
