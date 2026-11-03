import type { PedirSugerenciaRequest } from '../models/cita';

/** Cuerpo de las ayudas de IA: descripción sin espacios sobrantes y especialidad solo si hay una. */
export function armarSolicitudIA(
  descripcion: string | null | undefined,
  especialidad: string | null | undefined,
): PedirSugerenciaRequest {
  const especialidadLimpia = (especialidad ?? '').trim();
  return {
    descripcionProblema: (descripcion ?? '').trim(),
    ...(especialidadLimpia && { especialidad: especialidadLimpia }),
  };
}
