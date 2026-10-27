export type EstadoCita =
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'EN_CAMINO'
  | 'EN_PROCESO'
  | 'FINALIZADA'
  | 'CANCELADA';

/** Respuesta de POST /solicitudes (estado PENDIENTE, sin técnico ni horario). */
export interface SolicitudServicio {
  id: number;
  tecnicoId: number | null;
  especialidadId: number;
  descripcionProblema: string;
  direccionServicio: string;
  fechaHoraInicio: string | null;
  fechaHoraFin: string | null;
  estado: EstadoCita;
}

/** Respuesta de POST /citas/confirmar: la misma solicitud ya agendada. */
export interface Cita extends SolicitudServicio {
  tecnicoId: number;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  tecnicoNombre?: string | null;
  tecnicoApellido?: string | null;
  tecnicoTelefono?: string | null;
  especialidadNombre?: string | null;
}

export interface CrearSolicitudRequest {
  especialidadId: number;
  descripcionProblema: string;
  direccionServicio: string;
  latitud: number;
  longitud: number;
}

/** POST /citas/solicitud-manual. El teléfono solo es obligatorio si la cuenta no tiene uno registrado. */
export interface SolicitudManualRequest {
  especialidadId: number;
  descripcionProblema: string;
  direccionServicio: string;
  latitud: number;
  longitud: number;
  telefonoContacto?: string;
}

export interface ConfirmarCitaRequest {
  solicitudId: number;
  tecnicoId: number;
  inicio: string;
  fin: string;
}
