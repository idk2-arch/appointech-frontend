import { RespuestaEnvuelta } from '../models/respuesta-envuelta';

function esRespuestaEnvuelta<T>(valor: unknown): valor is RespuestaEnvuelta<T> {
  return !!valor && typeof valor === 'object' && !Array.isArray(valor) && 'datos' in valor && 'exito' in valor;
}

/**
 * Para endpoints cuyo formato no está confirmado: si viene envuelto en
 * ApiResponse ({ exito, datos, mensaje }) devuelve `datos`; si no, la respuesta tal cual.
 */
export function desenvolverRespuesta<T>(respuesta: T | RespuestaEnvuelta<T>): T {
  return esRespuestaEnvuelta<T>(respuesta) ? respuesta.datos : respuesta;
}
