/** Valores por defecto de app-bounce-cards (tarjetas de foto con rebote). */
export interface AjustesBounceCards {
  containerWidth: number;
  containerHeight: number;
  cardSize: number;
  spread: number;
  rotation: number;
  arc: number;
  pushDistance: number;
  hoverScale: number;
  bounciness: number;
  animationDelay: number;
  animationStagger: number;
  borderWidth: number;
  borderColor: string;
  radius: number;
  shadow: boolean;
  enableHover: boolean;
}

export const BOUNCE_CARDS_POR_DEFECTO: AjustesBounceCards = {
  containerWidth: 500,
  containerHeight: 320,
  cardSize: 200,
  spread: 85,
  rotation: 10,
  arc: 0,
  pushDistance: 50,
  hoverScale: 1.04,
  bounciness: 0.3,
  animationDelay: 0.3,
  animationStagger: 0.12,
  borderWidth: 5,
  borderColor: '#ffffff',
  radius: 25,
  shadow: true,
  enableHover: true,
};

/** Física de los resortes: más rigidez = más rápido; menos amortiguamiento = más rebote. */
export const BOUNCE_CARDS_FISICA = {
  rigidezAparicion: 80,
  rigidezMovimiento: 90,
  /** Razón de amortiguamiento del movimiento (1 = sin rebote). */
  amortiguacionMovimiento: 0.9,
  /** Cuánto baja el amortiguamiento de la aparición por cada punto de `bounciness`. */
  efectoRebote: 0.85,
} as const;

/** Inclinación de cada carta, como múltiplo de `rotation`; se repite si hay más cartas. */
export const BOUNCE_CARDS_PATRON_INCLINACION: readonly number[] = [1, 0.5, -0.3, -1, 0.2, 0.75, -0.6, 0.35, -0.85, 0.1];

/** Medidas que se multiplican al reducir el conjunto; los demás ajustes (rebote, tiempos, color) no cambian. */
const MEDIDAS_ESCALABLES = [
  'containerWidth',
  'containerHeight',
  'cardSize',
  'spread',
  'arc',
  'pushDistance',
  'borderWidth',
  'radius',
] as const;

/** El mismo conjunto reducido proporcionalmente (todas las medidas en píxeles por `factor`). */
export function escalarBounceCards(base: AjustesBounceCards, factor: number): AjustesBounceCards {
  const escalado = { ...base };
  for (const medida of MEDIDAS_ESCALABLES) escalado[medida] = Math.round(base[medida] * factor);
  return escalado;
}

/**
 * Para la vista previa de fotos en formularios: el conjunto a 70 % (tarjetas de 140 px en un
 * contenedor de 350 × 224), que ocupa menos alto sin perder el efecto.
 */
export const BOUNCE_CARDS_VISTA_PREVIA: AjustesBounceCards = escalarBounceCards(BOUNCE_CARDS_POR_DEFECTO, 0.7);
