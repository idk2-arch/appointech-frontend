const FORMATO_KM = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "3,14 km"; "Sin ubicación registrada" cuando el técnico no tiene ubicación (null). */
export function formatearDistanciaKm(km: number | null | undefined): string {
  if (km === null || km === undefined || Number.isNaN(km)) return 'Sin ubicación registrada';
  return `${FORMATO_KM.format(km)} km`;
}
