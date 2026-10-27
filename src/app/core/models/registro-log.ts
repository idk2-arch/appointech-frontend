export type NivelLog = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type TipoLog =
  | 'AUDITORIA'
  | 'NEGOCIO'
  | 'SEGURIDAD'
  | 'ERROR_APLICACION'
  | 'INTEGRACION'
  | 'SISTEMA';

export interface RegistroLog {
  id: number;
  nivel: NivelLog;
  tipo: TipoLog;
  origen: string;
  usuario: string | null;
  mensaje: string;
  creadoEn: string;
}

export interface FiltroLogs {
  nivel?: NivelLog | null;
  tipo?: TipoLog | null;
  limite?: number | null;
}
