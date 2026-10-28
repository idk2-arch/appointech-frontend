import type { UrgenciaCita, UrgenciaSugerida } from '../models/cita';

const ETIQUETAS_URGENCIA: Record<UrgenciaCita, string> = { NORMAL: 'Normal', URGENTE: 'Urgente' };
const ETIQUETAS_SUGERIDA: Record<UrgenciaSugerida, string> = { BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta' };

/** Mismas familias de color que los chips de estado: verde (baja), ámbar (media) y rojo (alta). */
const CLASES_SUGERIDA: Record<UrgenciaSugerida, string> = {
  BAJA: 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200',
  MEDIA: 'border-amber-300/40 bg-amber-300/10 text-amber-200',
  ALTA: 'border-rose-300/40 bg-rose-300/10 text-rose-200',
};

export function etiquetaUrgencia(urgencia: UrgenciaCita): string {
  return ETIQUETAS_URGENCIA[urgencia] ?? urgencia;
}

export function etiquetaUrgenciaSugerida(urgencia: UrgenciaSugerida): string {
  return ETIQUETAS_SUGERIDA[urgencia] ?? urgencia;
}

export function claseUrgenciaSugerida(urgencia: UrgenciaSugerida): string {
  return CLASES_SUGERIDA[urgencia] ?? CLASES_SUGERIDA.MEDIA;
}

/** "Marca Modelo" para mostrar; null si no se indicó ninguno de los dos. */
export function equipoDeCita(marca: string | null | undefined, modelo: string | null | undefined): string | null {
  const texto = [marca, modelo]
    .map((parte) => parte?.trim())
    .filter(Boolean)
    .join(' ');
  return texto || null;
}
