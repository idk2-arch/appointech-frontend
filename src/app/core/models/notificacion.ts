/** Aviso para la persona con sesión iniciada. `creadaEn` es un LocalDateTime sin zona. */
export interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  /** Cita a la que se refiere, si aplica. */
  citaId: number | null;
  leida: boolean;
  creadaEn: string;
}

export interface FiltroNotificaciones {
  soloNoLeidas?: boolean;
  /** Desde 0. */
  page?: number;
  size?: number;
}
