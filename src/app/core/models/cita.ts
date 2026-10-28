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

export type UrgenciaCita = 'NORMAL' | 'URGENTE';

export interface CrearSolicitudRequest {
  especialidadId: number;
  descripcionProblema: string;
  direccionServicio: string;
  latitud: number;
  longitud: number;
  marcaElectrodomestico?: string;
  modeloElectrodomestico?: string;
  urgencia?: UrgenciaCita;
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

/** Elemento de GET /cliente/citas y respuesta de las acciones sobre una cita (CitaResponse). */
export interface CitaResumen extends SolicitudServicio {
  marcaElectrodomestico?: string | null;
  modeloElectrodomestico?: string | null;
  urgencia?: UrgenciaCita | null;
  tecnicoFotoUrl?: string | null;
  tecnicoNombre?: string | null;
  tecnicoApellido?: string | null;
  tecnicoTelefono?: string | null;
  especialidadNombre?: string | null;
}

export interface DiagnosticoCita {
  diagnostico: string;
  recomendaciones: string | null;
  fecha: string;
}

/** Una fila del historial; en una reprogramación el estado anterior y el nuevo son iguales. */
export interface HistorialCita {
  estadoAnterior: EstadoCita | null;
  estadoNuevo: EstadoCita;
  fecha: string;
  actor: string;
  motivo: string | null;
}

/** GET /cliente/citas/{id} y GET /admin/citas/{id}. El historial va del más antiguo al más reciente. */
/** `url` es relativa al servidor y exige el token JWT para descargarse. */
export interface FotoElectrodomestico {
  id: number;
  url: string;
}

export type UrgenciaSugerida = 'BAJA' | 'MEDIA' | 'ALTA';

/** Orientación generada por IA para el técnico; no reemplaza su diagnóstico. */
export interface PreDiagnostico {
  causasProbables: string[];
  urgenciaSugerida: UrgenciaSugerida;
  preguntasParaElTecnico: string[];
  generadoPorIA: boolean;
}

/** Lo que el detalle de una cita trae sobre el electrodoméstico. */
export interface DatosElectrodomestico {
  fotosElectrodomestico?: FotoElectrodomestico[] | null;
  preDiagnostico?: PreDiagnostico | null;
}

export interface DetalleCita extends CitaResumen, DatosElectrodomestico {
  diagnostico: DiagnosticoCita | null;
  historial: HistorialCita[];
}

export interface DiagnosticoRequest {
  diagnostico: string;
  recomendaciones?: string;
}
