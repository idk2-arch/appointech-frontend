import { HttpErrorResponse } from '@angular/common/http';

/**
 * Mensaje para una escritura del administrador: usa el del backend si trae uno y, si no,
 * un texto simple según el estado (400 con `detalle400`, 404 y 409 comunes, que `mensajesPorEstado` puede cambiar).
 */
export function obtenerMensajeErrorEscritura(
  err: unknown,
  accion: string,
  detalle400: string,
  mensajesPorEstado: Record<number, string> = {}
): string {
  const estado = err instanceof HttpErrorResponse ? err.status : 0;
  const porEstado: Record<number, string> = {
    400: detalle400,
    404: 'No encontramos este registro. Actualiza la lista e intenta de nuevo.',
    409: 'Ya existe un usuario con ese correo o documento.',
    ...mensajesPorEstado,
  };
  return obtenerMensajeError(err, porEstado[estado] ?? `No fue posible ${accion}. Intenta de nuevo.`);
}

/**
 * El backend responde errores en dos formatos:
 *  - ProblemDetail (RFC 7807): { type, title, status, detail, instance }
 *  - Errores de negocio del Sprint 2: { timestamp, status, error }
 * El mensaje para el usuario sale de `detail ?? error`.
 */
export function obtenerMensajeError(err: unknown, mensajePorDefecto: string): string {
  if (!(err instanceof HttpErrorResponse)) return mensajePorDefecto;

  if (err.status === 0) {
    return 'No fue posible conectar con el servidor. Revisa tu conexión e intenta de nuevo.';
  }
  if (err.status === 403) {
    return 'No tienes permisos para realizar esta acción.';
  }

  const cuerpo = err.error;
  if (cuerpo && typeof cuerpo === 'object') {
    const mensaje = cuerpo.detail ?? cuerpo.error;
    if (typeof mensaje === 'string' && mensaje.trim()) return mensaje;
  }
  return mensajePorDefecto;
}
