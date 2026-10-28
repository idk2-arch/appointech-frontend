import type { EstadoCita } from './cita';

/** Una fila de GET /admin/citas. `fecha` es yyyy-MM-dd y las horas HH:mm, en hora local de Colombia. */
export interface ResumenCitaAdmin {
  id: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: EstadoCita;
  nombreCliente: string;
  nombreTecnico: string;
  tecnicoFotoUrl?: string | null;
  servicio: string;
  direccion: string;
}

export interface PaginaCitasAdmin {
  contenido: ResumenCitaAdmin[];
  pagina: number;
  tamanio: number;
  totalElementos: number;
  totalPaginas: number;
}

/** Filtros opcionales; lo que va vacío no se envía. `pagina` empieza en 0. */
export interface FiltroCitasAdmin {
  tecnicoId?: number | null;
  estado?: EstadoCita | '' | null;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  pagina?: number;
  tamanio?: number;
}
