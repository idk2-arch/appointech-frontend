import { DatosElectrodomestico, DiagnosticoCita, EstadoCita, UrgenciaCita } from './cita';

/** Fechas: LocalDateTime sin zona (hora local de Colombia), p. ej. 2026-10-13T08:00:00. */

export interface BloqueIndisponibilidad {
  id: number;
  inicio: string;
  fin: string;
  motivo: string | null;
}

export interface CrearBloqueRequest {
  inicio: string;
  fin: string;
  motivo?: string;
}

export interface ClienteCita {
  nombre: string;
  apellido: string;
  telefono: string | null;
  fotoUrl?: string | null;
}

/** GET /tecnico/citas: solo citas activas (CONFIRMADA, EN_CAMINO, EN_PROCESO). */
export interface CitaTecnico extends DatosElectrodomestico {
  id: number;
  marcaElectrodomestico?: string | null;
  modeloElectrodomestico?: string | null;
  urgencia?: UrgenciaCita | null;
  estado: EstadoCita;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  descripcionProblema: string;
  direccionServicio: string;
  latitud: number | null;
  longitud: number | null;
  cliente: ClienteCita;
  /** Si el backend lo envía, el formulario de diagnóstico se abre con estos datos. */
  diagnostico?: DiagnosticoCita | null;
}

export interface PuntoGeografico {
  latitud: number;
  longitud: number;
}

export interface ParadaRuta {
  orden: number;
  citaId: number;
  inicio: string;
  fin: string;
  direccionServicio: string;
  latitud: number | null;
  longitud: number | null;
  cliente: ClienteCita;
  /** Distancia por carretera desde la parada anterior (la primera, desde la base). */
  distanciaKm: number;
  minutosDesdeAnterior: number;
  /**
   * En la primera parada es la hora en que el técnico debe salir de su base;
   * en las demás, la hora estimada de llegada.
   */
  horaEstimadaLlegada: string;
  alcanzaATiempo: boolean;
  retrasoEstimadoMinutos?: number;
}

/** La ruta no se guarda: el backend la recalcula en cada petición. */
export interface RutaDelDia {
  fecha: string;
  calculadaEn: string;
  origen: PuntoGeografico;
  paradas: ParadaRuta[];
  totalKm: number;
  totalMinutosDeViaje: number;
}
