import type { EstadoCita } from '../models/cita';

/** Paso de estado que puede dar el técnico desde el estado actual de la cita. */
export interface TransicionTecnico {
  destino: EstadoCita;
  etiqueta: string;
  /** Finalizar no se puede deshacer, así que se pide confirmación antes. */
  requiereConfirmacion: boolean;
}

export interface AccionesTecnico {
  transicion: TransicionTecnico | null;
  registrarDiagnostico: boolean;
  cancelar: boolean;
}

const TRANSICIONES_TECNICO: Partial<Record<EstadoCita, TransicionTecnico>> = {
  CONFIRMADA: { destino: 'EN_CAMINO', etiqueta: 'Voy en camino', requiereConfirmacion: false },
  EN_CAMINO: { destino: 'EN_PROCESO', etiqueta: 'Iniciar servicio', requiereConfirmacion: false },
  EN_PROCESO: { destino: 'FINALIZADA', etiqueta: 'Finalizar servicio', requiereConfirmacion: true },
};

/** Botones que se muestran al técnico según el estado de la cita. */
export function accionesTecnico(estado: EstadoCita): AccionesTecnico {
  const transicion = TRANSICIONES_TECNICO[estado] ?? null;
  return {
    transicion,
    registrarDiagnostico: estado === 'EN_PROCESO',
    cancelar: transicion !== null,
  };
}

/** El cliente solo puede cancelar o reprogramar mientras la visita no ha comenzado. */
export function clientePuedeModificar(estado: EstadoCita): boolean {
  return estado === 'PENDIENTE' || estado === 'CONFIRMADA';
}
