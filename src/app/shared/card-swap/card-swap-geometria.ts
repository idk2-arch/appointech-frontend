/** Geometría de la pila de cartas: constantes, límites del escenario y ajustes normalizados. */

export const PERSPECTIVA = 900;
export const TAU = Math.PI * 2;
/** Paso máximo de integración de los resortes (240 Hz) para que sean estables a cualquier fps. */
export const PASO = 1 / 240;
export const MARGEN = 32;

export const limitar = (valor: number, minimo: number, maximo: number): number => Math.min(maximo, Math.max(minimo, valor));

export interface LimitesPila {
  width: number;
  height: number;
  originX: number;
  originY: number;
}

export interface ParametrosLimites {
  width: number;
  height: number;
  cardDistance: number;
  verticalDistance: number;
  depth: number;
  skewAmount: number;
  visible: number;
  hoverSpread: number;
}

/** Caja que contiene todas las cartas visibles (con perspectiva e inclinación) más un margen. */
export function limitesPila(p: ParametrosLimites): LimitesPila {
  const pendiente = Math.tan((p.skewAmount * Math.PI) / 180);
  const apertura = 1 + Math.max(0, p.hoverSpread);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < p.visible; i++) {
    const escala = PERSPECTIVA / (PERSPECTIVA + i * p.depth);
    for (const u of [-p.width / 2, p.width / 2]) {
      for (const v of [-p.height / 2, p.height / 2]) {
        const x = (i * p.cardDistance * apertura + u) * escala;
        const y = (-i * p.verticalDistance * apertura + v + u * pendiente) * escala;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return {
    width: Math.ceil(maxX - minX + MARGEN * 2),
    height: Math.ceil(maxY - minY + MARGEN * 2),
    originX: MARGEN - minX,
    originY: MARGEN - minY,
  };
}

/** Entradas tal como llegan del componente, sin normalizar. */
export interface EntradaAjustes {
  width: number;
  height: number;
  cardDistance: number;
  verticalDistance: number;
  depth: number;
  skewAmount: number;
  visibleCards: number;
  speed: number;
  bounce: number;
  parallax: number;
  hoverSpread: number;
  dim: number;
  draggable: boolean;
}

/** Ajustes ya acotados a rangos válidos, que es lo que usa el motor. */
export interface AjustesPila {
  width: number;
  height: number;
  dx: number;
  dy: number;
  dz: number;
  skew: number;
  visible: number;
  speed: number;
  bounce: number;
  parallax: number;
  hoverSpread: number;
  dim: number;
  draggable: boolean;
  bounds: LimitesPila;
}

export function normalizarAjustes(entrada: EntradaAjustes, total: number): AjustesPila {
  const width = Math.max(40, Number(entrada.width) || 460);
  const height = Math.max(40, Number(entrada.height) || 340);
  const visible = limitar(Math.round(entrada.visibleCards), 1, Math.max(1, total));
  const dz = Math.max(0, entrada.depth);
  const hoverSpread = Math.max(0, entrada.hoverSpread);
  return {
    width,
    height,
    dx: entrada.cardDistance,
    dy: entrada.verticalDistance,
    dz,
    skew: entrada.skewAmount,
    visible,
    speed: limitar(entrada.speed, 0.1, 4),
    bounce: limitar(entrada.bounce, 0, 1),
    parallax: limitar(entrada.parallax, 0, 1),
    hoverSpread,
    dim: limitar(entrada.dim, 0, 1),
    draggable: entrada.draggable,
    bounds: limitesPila({
      width,
      height,
      cardDistance: entrada.cardDistance,
      verticalDistance: entrada.verticalDistance,
      depth: dz,
      skewAmount: entrada.skewAmount,
      visible,
      hoverSpread,
    }),
  };
}
