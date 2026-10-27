export interface RespuestaEnvuelta<T> {
  exito: boolean;
  datos: T;
  mensaje: string;
  timestamp: string;
}
