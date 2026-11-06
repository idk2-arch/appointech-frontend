import type { MotivoSolicitudEspecial } from '../models/cita';

/** Etiqueta corta para el administrador (insignia de la lista de solicitudes por coordinar). */
const ETIQUETAS_ADMIN: Record<MotivoSolicitudEspecial, string> = {
  SIN_TECNICOS_ESPECIALIDAD: 'Sin técnicos para la especialidad',
  FUERA_DE_COBERTURA: 'Fuera de cobertura',
};

/** Texto para el cliente cuando su solicitud la coordina un administrador. */
const MENSAJES_CLIENTE: Record<MotivoSolicitudEspecial, string> = {
  SIN_TECNICOS_ESPECIALIDAD: 'Por ahora no hay técnicos disponibles para esta especialidad.',
  FUERA_DE_COBERTURA: 'Tu dirección está fuera de nuestra zona de cobertura automática.',
};

const MENSAJE_CLIENTE_GENERICO = 'Por ahora no podemos ofrecerte horarios automáticos para esta solicitud.';

/** Null cuando no hay motivo (filas antiguas): no se muestra nada. */
export function etiquetaMotivoSolicitud(motivo: MotivoSolicitudEspecial | null | undefined): string | null {
  return motivo ? (ETIQUETAS_ADMIN[motivo] ?? null) : null;
}

export function mensajeClienteMotivo(motivo: MotivoSolicitudEspecial | null | undefined): string {
  return (motivo && MENSAJES_CLIENTE[motivo]) || MENSAJE_CLIENTE_GENERICO;
}
