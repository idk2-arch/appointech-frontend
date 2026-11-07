/** Calificación que el cliente dio a un servicio finalizado. */
export interface Calificacion {
  citaId: number;
  puntuacion: number;
  comentario: string | null;
  fecha: string;
}

/** Cuerpo para calificar: puntuación de 1 a 5 y comentario opcional (máx. 500). */
export interface CalificarServicioRequest {
  puntuacion: number;
  comentario?: string;
}
