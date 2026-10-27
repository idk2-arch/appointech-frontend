export interface TecnicoDisponible {
  id: number;
  nombre: string;
  radioCoberturaKm: number;
}

/** Fechas en LocalDateTime sin zona (hora local de Colombia), p. ej. 2026-10-13T08:00:00. */
export interface FranjaDisponible {
  tecnicoId: number;
  inicio: string;
  fin: string;
  distanciaKm: number;
  tecnicoNombre?: string | null;
  tecnicoApellido?: string | null;
}

export type MotivoSinFranjas = 'SIN_TECNICOS_ESPECIALIDAD' | 'SIN_HORARIOS' | 'FUERA_DE_COBERTURA';

/** GET /disponibilidad/franjas-con-motivo: el motivo solo viene cuando no hay franjas. */
export interface FranjasConMotivo {
  franjas: FranjaDisponible[];
  motivoSinFranjas: MotivoSinFranjas | null;
  /** WhatsApp del administrador para escribirle cuando la dirección queda fuera de cobertura. */
  telefonoContactoAdmin?: string | null;
}

export interface ConsultaFranjas {
  especialidadId: number;
  fecha: string;
  latitud: number;
  longitud: number;
}
