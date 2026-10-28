import { BOUNCE_CARDS_FISICA, BOUNCE_CARDS_PATRON_INCLINACION } from '../../core/config/bounce-cards.config';

/**
 * Motor de las tarjetas con rebote: dónde reposa cada carta, qué carta está bajo el cursor y la
 * física de resortes que las mueve. No conoce Angular ni el DOM: recibe tiempos y posiciones y
 * devuelve el estilo que debe tener cada carta.
 */

export interface Ranura {
  x: number;
  y: number;
  rotate: number;
}

/** Entradas sin normalizar, tal como llegan del componente. */
export interface EntradaMotor {
  count: number;
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
  enableHover: boolean;
}

export interface AjustesMotor {
  slots: Ranura[];
  /** Límites dentro de los que deben quedar las cartas, con su inclinación y su escala. */
  containerWidth: number;
  containerHeight: number;
  cardSize: number;
  delay: number;
  stagger: number;
  bounciness: number;
  enableHover: boolean;
  pushDistance: number;
  hoverScale: number;
}

export interface EstiloCartaBounce {
  transform: string;
  zIndex: number;
  /** Carta bajo el cursor (o con el foco). */
  activa: boolean;
}

interface Cuerpo {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  vx: number;
  vy: number;
  vr: number;
  vs: number;
  /** Instante (en segundos del motor) en que apareció la carta. */
  nacio: number;
}

interface Objetivo {
  x: number;
  y: number;
  rotate: number;
  scale: number;
}

const limitar = (valor: number, minimo: number, maximo: number): number => Math.min(maximo, Math.max(minimo, valor));

/** Paso de integración. */
const SUBPASO_MAXIMO = 1 / 240;
const DT_MAXIMO = 1 / 30;
/** Impulso de escala al pulsar una carta. */
const IMPULSO_PULSAR = 2.2;
/** Margen (px) alrededor de la carta en el que el cursor todavía cuenta como "encima". */
const MARGEN_PUNTERO = 12;
/** Ventaja (px) que debe tener otra carta para quitarle el cursor a la actual. */
const HISTERESIS = 6;
/** Por debajo de este movimiento acumulado, la simulación se considera quieta. */
const UMBRAL_QUIETO = 0.02;

/** Normaliza las entradas y calcula dónde reposa cada carta (abanico centrado). */
export function ajustesDelMotor(entrada: EntradaMotor): AjustesMotor {
  const medio = (entrada.count - 1) / 2;
  const alcance = Math.max(1, medio);
  const patron = BOUNCE_CARDS_PATRON_INCLINACION;
  const slots = Array.from({ length: entrada.count }, (_, i) => {
    const desplazamiento = i - medio;
    return {
      x: desplazamiento * entrada.spread,
      y: entrada.arc * (desplazamiento / alcance) ** 2,
      rotate: entrada.rotation * patron[i % patron.length],
    };
  });
  return {
    slots,
    containerWidth: entrada.containerWidth,
    containerHeight: entrada.containerHeight,
    cardSize: Math.max(10, entrada.cardSize),
    delay: Math.max(0, entrada.animationDelay),
    stagger: Math.max(0, entrada.animationStagger),
    bounciness: limitar(entrada.bounciness, 0, 1),
    enableHover: entrada.enableHover,
    pushDistance: entrada.pushDistance,
    hoverScale: limitar(entrada.hoverScale, 0.5, 2),
  };
}

/** Cuánto le falta a un cuerpo para quedar quieto en su objetivo (velocidades más distancias). */
function inquietud(cuerpo: Cuerpo, objetivo: Objetivo, aparecio: boolean): number {
  return (
    Math.abs(cuerpo.vx) +
    Math.abs(cuerpo.vy) +
    Math.abs(cuerpo.vr) +
    Math.abs(cuerpo.vs) * 100 +
    Math.abs(objetivo.x - cuerpo.x) +
    Math.abs(objetivo.y - cuerpo.y) +
    Math.abs(objetivo.rotate - cuerpo.rotate) +
    Math.abs(objetivo.scale - cuerpo.scale) * 100 +
    (aparecio ? 0 : 1)
  );
}

function paso(valor: number, velocidad: number, objetivo: number, rigidez: number, amortiguacion: number, dt: number): [number, number] {
  const siguiente = velocidad + ((objetivo - valor) * rigidez - velocidad * amortiguacion) * dt;
  return [valor + siguiente * dt, siguiente];
}

export class BounceCardsEngine {
  private cuerpos: Cuerpo[] = [];
  private tiempo = 0;
  private activa = -1;

  constructor(
    private ajustes: AjustesMotor,
    private readonly reducirMovimiento: boolean
  ) {}

  get cantidad(): number {
    return this.ajustes.slots.length;
  }

  get indiceActivo(): number {
    return this.ajustes.enableHover ? this.activa : -1;
  }

  actualizar(ajustes: AjustesMotor): void {
    // Si cambia la cantidad (se agregó o quitó una carta), el hover anterior ya no corresponde a
    // ninguna carta: se apaga hasta que el cursor se mueva de verdad.
    if (ajustes.slots.length !== this.ajustes.slots.length) this.activa = -1;
    this.ajustes = ajustes;
    // Si hay menos cartas, se olvidan los cuerpos que sobran; si vuelven, aparecen de nuevo.
    this.cuerpos.length = Math.min(this.cuerpos.length, ajustes.slots.length);
  }

  /** Marca la carta activa (-1 = ninguna). Devuelve true si cambió. */
  activar(indice: number): boolean {
    if (indice === this.activa) return false;
    this.activa = indice;
    return true;
  }

  /**
   * Carta que corresponde a un punto, dado respecto al centro del contenedor y en píxeles sin escalar.
   * Se elige por cercanía horizontal; la carta que ya estaba activa conserva el cursor si la ventaja
   * de la nueva es pequeña (evita parpadeos entre cartas que se solapan). -1 si no hay ninguna.
   */
  cartaBajo(px: number, py: number): number {
    const { slots, cardSize } = this.ajustes;
    let mejor = -1;
    let distancia = Infinity;
    slots.forEach((ranura, i) => {
      const brecha = Math.abs(px - ranura.x);
      if (brecha < distancia) {
        distancia = brecha;
        mejor = i;
      }
    });
    if (mejor < 0) return -1;

    const mitad = cardSize / 2;
    if (Math.abs(py - slots[mejor].y) > mitad + MARGEN_PUNTERO || distancia > mitad + MARGEN_PUNTERO) return -1;

    const actual = slots[this.activa];
    if (this.activa >= 0 && this.activa !== mejor && actual && Math.abs(px - actual.x) - distancia < HISTERESIS) {
      return this.activa;
    }
    return mejor;
  }

  /** Un pequeño rebote al pulsar una carta. */
  pulsar(indice: number): void {
    const cuerpo = this.cuerpos[indice];
    if (cuerpo && !this.reducirMovimiento) cuerpo.vs -= IMPULSO_PULSAR;
  }

  /** Avanza la física `segundos`. Devuelve true mientras algo siga moviéndose. */
  avanzar(segundos: number): boolean {
    const dt = limitar(segundos, SUBPASO_MAXIMO, DT_MAXIMO);
    this.tiempo += dt;

    const subpasos = Math.ceil(dt / SUBPASO_MAXIMO);
    const h = dt / subpasos;
    const activa = this.indiceActivo;
    let movimiento = 0;

    this.ajustes.slots.forEach((ranura, i) => {
      const cuerpo = this.cuerpo(i);
      const aparecio = this.reducirMovimiento || this.tiempo - cuerpo.nacio >= this.ajustes.delay + i * this.ajustes.stagger;
      const objetivo = this.objetivoDe(i, ranura, aparecio, activa);
      this.integrar(cuerpo, objetivo, subpasos, h);
      movimiento += inquietud(cuerpo, objetivo, aparecio);
    });

    return movimiento > UMBRAL_QUIETO;
  }

  /** Estilo actual de una carta; null si todavía no se simuló. */
  estilo(indice: number): EstiloCartaBounce | null {
    const cuerpo = this.cuerpos[indice];
    if (!cuerpo) return null;
    const activa = this.indiceActivo === indice;
    return {
      transform: `translate(-50%, -50%) translate3d(${cuerpo.x.toFixed(2)}px, ${cuerpo.y.toFixed(2)}px, 0) rotate(${cuerpo.rotate.toFixed(3)}deg) scale(${Math.max(0, cuerpo.scale).toFixed(4)})`,
      zIndex: activa ? this.cantidad + 1 : indice + 1,
      activa,
    };
  }

  /** Dónde debe estar la carta: en su sitio, apartada por el hover o, si está activa, enderezada y más grande. */
  private objetivoDe(indice: number, ranura: Ranura, aparecio: boolean, activa: number): Objetivo {
    const a = this.ajustes;
    let objetivo: Objetivo = { x: ranura.x, y: ranura.y, rotate: ranura.rotate, scale: aparecio ? 1 : 0 };

    if (activa >= 0 && aparecio) {
      objetivo =
        indice === activa
          ? { x: ranura.x, y: ranura.y - a.cardSize * 0.04, rotate: 0, scale: a.hoverScale }
          : { ...objetivo, x: ranura.x + Math.sign(indice - activa) * a.pushDistance };
    }

    const [x, y] = this.dentroDelContenedor(objetivo.x, objetivo.y, objetivo.rotate, objetivo.scale);
    return { ...objetivo, x, y };
  }

  /** Mueve el cuerpo hacia el objetivo con resortes (la escala, con el de aparición, que sí rebota). */
  private integrar(cuerpo: Cuerpo, objetivo: Objetivo, subpasos: number, h: number): void {
    const { rigidezAparicion, rigidezMovimiento, efectoRebote, amortiguacionMovimiento } = BOUNCE_CARDS_FISICA;
    const amortiguacionAparicion = 2 * (1 - efectoRebote * this.ajustes.bounciness) * Math.sqrt(rigidezAparicion);
    const amortiguacion = 2 * (this.reducirMovimiento ? 1 : amortiguacionMovimiento) * Math.sqrt(rigidezMovimiento);

    for (let k = 0; k < subpasos; k++) {
      [cuerpo.x, cuerpo.vx] = paso(cuerpo.x, cuerpo.vx, objetivo.x, rigidezMovimiento, amortiguacion, h);
      [cuerpo.y, cuerpo.vy] = paso(cuerpo.y, cuerpo.vy, objetivo.y, rigidezMovimiento, amortiguacion, h);
      [cuerpo.rotate, cuerpo.vr] = paso(cuerpo.rotate, cuerpo.vr, objetivo.rotate, rigidezMovimiento, amortiguacion, h);
      if (this.reducirMovimiento) {
        cuerpo.scale = objetivo.scale;
        cuerpo.vs = 0;
      } else {
        [cuerpo.scale, cuerpo.vs] = paso(cuerpo.scale, cuerpo.vs, objetivo.scale, rigidezAparicion, amortiguacionAparicion, h);
      }
    }
  }

  /**
   * Mantiene la carta dentro del contenedor: a su posición se le descuenta lo que ocupa girada y
   * escalada, para que al apartarse nunca quede cortada ni fuera.
   */
  private dentroDelContenedor(x: number, y: number, rotacion: number, escala: number): [number, number] {
    const radianes = (rotacion * Math.PI) / 180;
    const alcance = (this.ajustes.cardSize / 2) * Math.max(1, escala) * (Math.abs(Math.cos(radianes)) + Math.abs(Math.sin(radianes)));
    const holguraX = Math.max(0, this.ajustes.containerWidth / 2 - alcance);
    const holguraY = Math.max(0, this.ajustes.containerHeight / 2 - alcance);
    return [limitar(x, -holguraX, holguraX), limitar(y, -holguraY, holguraY)];
  }

  private cuerpo(indice: number): Cuerpo {
    if (!this.cuerpos[indice]) {
      const ranura = this.ajustes.slots[indice] ?? { x: 0, y: 0, rotate: 0 };
      this.cuerpos[indice] = {
        x: ranura.x,
        y: ranura.y,
        rotate: ranura.rotate,
        scale: this.reducirMovimiento ? 1 : 0,
        vx: 0,
        vy: 0,
        vr: 0,
        vs: 0,
        nacio: this.tiempo,
      };
    }
    return this.cuerpos[indice];
  }
}
