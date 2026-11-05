/** Constantes y funciones puras del port de SwipeToast (React Bits). Los valores son los del original. */

export type MotivoCierre = 'timeout' | 'swipe' | 'action' | 'close' | 'escape' | 'programmatic';
export type PosicionMecha = 'bottom' | 'top' | 'none';
export type TipoToast = 'exito' | 'info' | 'advertencia' | 'error';

export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
/** Velocidad (px/ms) a partir de la cual un deslizamiento corto cuenta como "flick" y cierra siempre. */
export const FLICK = 0.11;
/** Píxeles que hay que mover antes de que el gesto empiece a arrastrar. */
export const DEAD_ZONE = 3;
export const RESIST_PX = 24;
export const COLLAPSE_MS = 200;
export const EXIT = 0.7;
export const BURN: Keyframe[] = [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }];

/** Resistencia elástica al arrastrar contra el borde (hacia arriba). */
export const rubberband = (exceso: number, dim: number, c = 0.55): number =>
  (exceso * dim * c) / (dim + c * Math.abs(exceso));

/** Muestra del historial de arrastre: [instante en ms, posición en y]. */
export type MuestraArrastre = [number, number];

/** Velocidad (px/ms) de las últimas muestras; 0 si la última tiene más de 100 ms. */
export function velocidadDe(historial: readonly MuestraArrastre[], ahora = performance.now()): number {
  if (historial.length < 2) return 0;
  const [t0, y0] = historial[0];
  const [t1, y1] = historial[historial.length - 1];
  return ahora - t1 > 100 ? 0 : (y1 - y0) / Math.max(1, t1 - t0);
}
