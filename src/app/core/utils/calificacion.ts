import { HttpErrorResponse } from '@angular/common/http';

export const DIAS_PLAZO_CALIFICACION = 30;
export const MAX_COMENTARIO_CALIFICACION = 500;
export const ESTRELLAS = [1, 2, 3, 4, 5] as const;

/** Trazado de una estrella de 24 × 24. */
export const TRAZO_ESTRELLA = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.2 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8L12 2.5z';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Pasaron más de 30 días desde que terminó el servicio. Es solo una pista para no ofrecer el botón:
 * el backend decide, porque la lista no trae la fecha exacta de finalización (se usa el fin del horario).
 */
export function plazoCalificacionVencido(fechaFin: string | null | undefined, ahora: Date = new Date()): boolean {
  if (!fechaFin) return false;
  const fin = new Date(fechaFin).getTime();
  return Number.isFinite(fin) && ahora.getTime() - fin > DIAS_PLAZO_CALIFICACION * MS_POR_DIA;
}

function mensajeDe(err: unknown): string {
  const cuerpo = err instanceof HttpErrorResponse ? err.error : null;
  const mensaje = cuerpo && typeof cuerpo === 'object' ? (cuerpo.detail ?? cuerpo.error) : undefined;
  return typeof mensaje === 'string' ? mensaje : '';
}

/** 409 porque la cita ya tiene calificación. */
export function esYaCalificada(err: unknown): boolean {
  return err instanceof HttpErrorResponse && err.status === 409 && /ya (fue |est[aá] )?calificad/i.test(mensajeDe(err));
}

/** 409 porque se venció el plazo para calificar. */
export function esPlazoVencido(err: unknown): boolean {
  return err instanceof HttpErrorResponse && err.status === 409 && /plazo|venci/i.test(mensajeDe(err));
}

/** Nombre de cada puntuación, de 1 a 5. */
export const ETIQUETAS_PUNTUACION = ['Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

const FRASES = ['Lamentamos que no haya salido bien', 'Podemos mejorar', 'Gracias por tu opinión', '¡Buen servicio!', '¡Excelente servicio!'];
const AYUDAS = [
  'Cuéntanos qué pasó para que podamos mejorar.',
  'Cuéntanos qué pasó para que podamos mejorar.',
  '¿Qué podría haber sido mejor?',
  '¿Qué fue lo que más te gustó?',
  '¿Qué fue lo que más te gustó?',
];

const SUGERENCIAS_ALTAS = ['Puntual', 'Amable', 'Trabajo limpio', 'Resolvió el problema', 'Buen precio'];
const SUGERENCIAS_BAJAS = ['Llegó tarde', 'No resolvió el problema', 'Poca amabilidad', 'Dejó sucio'];
const SUGERENCIAS_MEDIAS = ['Puntual', 'Amable', 'Llegó tarde', 'Dejó sucio'];

/** Frase grande que acompaña la puntuación; vacía si aún no hay. */
export function fraseDePuntuacion(puntuacion: number): string {
  return FRASES[puntuacion - 1] ?? '';
}

/** Texto de ayuda sobre el comentario según la puntuación. */
export function ayudaDePuntuacion(puntuacion: number): string {
  return AYUDAS[puntuacion - 1] ?? 'Elige una puntuación para continuar.';
}

/** Sugerencias para escribir el comentario: son solo ayuda de redacción, no se envían aparte. */
export function sugerenciasDePuntuacion(puntuacion: number): string[] {
  if (puntuacion >= 4) return SUGERENCIAS_ALTAS;
  if (puntuacion === 3) return SUGERENCIAS_MEDIAS;
  return puntuacion >= 1 ? SUGERENCIAS_BAJAS : [];
}

/** Agrega la sugerencia al final del comentario; sin duplicarla ni pasar del máximo. */
export function agregarSugerencia(comentario: string, sugerencia: string): string {
  if (comentario.includes(sugerencia)) return comentario;
  const base = comentario.trimEnd();
  const unido = base ? `${base}${/[.!?]$/.test(base) ? ' ' : ', '}${sugerencia}` : sugerencia;
  return unido.length > MAX_COMENTARIO_CALIFICACION ? comentario : unido;
}

/** Quita la sugerencia del comentario junto con el separador que la unía al resto. */
export function quitarSugerencia(comentario: string, sugerencia: string): string {
  const inicio = comentario.indexOf(sugerencia);
  if (inicio < 0) return comentario;
  const prefijo = comentario.slice(0, inicio).trimEnd();
  const ultimo = prefijo.at(-1);
  const antes = ultimo === ',' || ultimo === ';' ? prefijo.slice(0, -1) : prefijo;
  const despues = comentario.slice(inicio + sugerencia.length).replace(/^[,;]?\s*/, '');
  return [antes, despues].filter(Boolean).join(', ');
}
