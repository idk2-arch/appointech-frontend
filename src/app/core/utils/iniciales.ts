/** Hasta dos iniciales del nombre ("Ana María Pérez" → "AM"); "?" si no hay nombre. */
export function iniciales(nombre: string | null | undefined): string {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  return partes
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toLocaleUpperCase('es'))
    .join('');
}
