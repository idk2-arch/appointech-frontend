import type { MotivoSinFranjas } from '../models/disponibilidad';

/** Texto para el cliente según por qué no hay horarios. */
export const MENSAJES_SIN_FRANJAS: Record<MotivoSinFranjas, string> = {
  SIN_TECNICOS_ESPECIALIDAD: 'Por ahora no tenemos técnicos para este servicio.',
  SIN_HORARIOS: 'No hay horarios libres ese día. Prueba con otra fecha.',
  FUERA_DE_COBERTURA:
    'Tu dirección está fuera de nuestra zona de cobertura automática. Puedes enviar una solicitud y un administrador te contactará para coordinar la visita.',
};
