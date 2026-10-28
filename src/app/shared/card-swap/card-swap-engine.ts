import { AjustesPila, limitar, PASO, TAU } from './card-swap-geometria';

/**
 * Motor de la pila de cartas: orden, estado de cada carta y física de resortes.
 * No conoce Angular ni el DOM: recibe tiempos y posiciones, y devuelve cómo debe verse cada carta.
 * El componente solo lo conecta con eventos y estilos.
 */

type Fase = 'rest' | 'exit' | 'enter' | 'drag';
type Eje = 'x' | 'y' | 'z' | 'r' | 'p';
const EJES: readonly Eje[] = ['x', 'y', 'z', 'r', 'p'];

export interface Vector {
  x: number;
  y: number;
}

const ABAJO: Vector = { x: 0, y: 1 };

interface Carta {
  index: number;
  /** Posición en la pila (0 = frente). */
  pos: number;
  /** Posición anterior, que se mantiene hasta `hold` para escalonar el movimiento. */
  from: number;
  hold: number;
  nudge: number;
  fase: Fase;
  dir: Vector;
  tilt: number;
  top: number;
  under: boolean;
  x: number;
  y: number;
  z: number;
  r: number;
  p: number;
  v: Record<Eje, number>;
}

interface Muestra extends Vector {
  t: number;
}

/** Lo que el componente escribe en el DOM para una carta. */
export interface EstiloCarta {
  transform: string;
  zIndex: number;
  /** Cadena vacía = sin opacidad propia. */
  opacity: string;
  visible: boolean;
  sombra: string;
  cursor: string;
  frente: boolean;
}

export interface OpcionesSalida {
  dir?: Vector;
  tilt?: number;
  velocity?: Vector;
}

export type ResultadoSoltar = 'lanzada' | 'devuelta';

const ceros = (): Record<Eje, number> => ({ x: 0, y: 0, z: 0, r: 0, p: 0 });

export class CardSwapEngine {
  private readonly cartas: Carta[];
  private orden: number[];
  private capas = 0;
  private ultimoTiempo = 0;
  private muestras: Muestra[] = [];

  private apertura = 0;
  private aperturaV = 0;
  private px = 0;
  private py = 0;
  private pvx = 0;
  private pvy = 0;
  private objetivoX = 0;
  private objetivoY = 0;
  private sobrevolada = false;

  constructor(
    readonly total: number,
    private ajustes: AjustesPila,
    private readonly reducirMovimiento: boolean
  ) {
    this.cartas = Array.from({ length: total }, (_, index) => ({
      index,
      pos: index,
      from: index,
      hold: 0,
      nudge: 0,
      fase: 'rest',
      dir: { x: 0, y: 1 },
      tilt: 0,
      top: 0,
      under: false,
      x: 0,
      y: 0,
      z: 0,
      r: 0,
      p: 0,
      v: ceros(),
    }));
    this.orden = this.cartas.map((c) => c.index);
  }

  // ---- Consultas ----

  get indiceFrente(): number {
    return this.orden[0];
  }

  /** Posición de una carta en la pila (0 = frente). */
  posicionDe(index: number): number {
    return this.orden.indexOf(index);
  }

  get ordenActual(): readonly number[] {
    return this.orden;
  }

  /** Se puede arrastrar solo la carta del frente, y cuando está quieta. */
  puedeArrastrar(index: number): boolean {
    return this.total > 1 && index === this.orden[0] && this.cartas[index].fase === 'rest';
  }

  get origenPerspectiva(): Vector {
    return { x: this.ajustes.bounds.originX + this.px, y: this.ajustes.bounds.originY + this.py };
  }

  // ---- Configuración ----

  actualizarAjustes(ajustes: AjustesPila): void {
    this.ajustes = ajustes;
  }

  /**
   * Coloca las cartas al empezar: con `intro`, todas parten del frente y se abren una tras otra;
   * sin él, ya aparecen en su lugar.
   */
  iniciar(ahora: number, intro: boolean): void {
    if (intro && !this.reducirMovimiento) {
      this.cartas.forEach((carta) => {
        carta.from = 0;
        carta.hold = ahora + (carta.pos * 70) / this.ajustes.speed;
      });
    } else {
      this.cartas.forEach((carta) => Object.assign(carta, this.ranura(carta.pos)));
    }
  }

  // ---- Puntero (parallax y apertura al pasar el cursor) ----

  /** `nx` y `ny` en [-1, 1] respecto al centro del contenedor. */
  moverPuntero(nx: number, ny: number): void {
    this.objetivoX = nx * this.ajustes.parallax * 0.35 * this.ajustes.bounds.width;
    this.objetivoY = ny * this.ajustes.parallax * 0.35 * this.ajustes.bounds.height;
    this.sobrevolada = true;
  }

  salirPuntero(): void {
    this.sobrevolada = false;
    this.objetivoX = 0;
    this.objetivoY = 0;
  }

  // ---- Acciones ----

  /**
   * Avanza (1: el frente pasa al fondo) o retrocede (-1: la del fondo vuelve al frente).
   * Devuelve false si no hay nada que mover.
   */
  mover(direccion: 1 | -1, tiempo: number, opciones: OpcionesSalida = {}): boolean {
    if (this.total < 2) return false;
    const escalonado = (0.05 / this.ajustes.speed) * 1000;

    if (direccion > 0) {
      const frente = this.cartas[this.orden[0]];
      this.orden = [...this.orden.slice(1), frente.index];
      this.reordenar(tiempo, escalonado);
      frente.fase = 'exit';
      frente.dir = opciones.dir ?? ABAJO;
      frente.tilt = opciones.tilt ?? 0;
      frente.top = ++this.capas;
      frente.under = false;
      frente.nudge = 0;
      frente.hold = 0;
      if (opciones.velocity) {
        frente.v.x = opciones.velocity.x;
        frente.v.y = opciones.velocity.y;
      }
    } else {
      const fondo = this.cartas[this.orden[this.total - 1]];
      this.orden = [fondo.index, ...this.orden.slice(0, this.total - 1)];
      this.reordenar(tiempo, escalonado);
      fondo.fase = 'enter';
      fondo.top = 0;
      fondo.under = true;
      fondo.nudge = 0;
      fondo.hold = 0;
    }
    this.cartas.forEach((carta) => {
      if (carta.fase === 'rest') carta.nudge = 0;
    });
    return true;
  }

  comenzarArrastre(index: number): void {
    const carta = this.cartas[index];
    carta.fase = 'drag';
    carta.v = ceros();
    this.muestras = [];
  }

  /** `dx` y `dy`: desplazamiento del puntero desde que empezó el arrastre, en píxeles del escenario. */
  arrastrar(index: number, dx: number, dy: number, tiempo: number): void {
    const carta = this.cartas[index];
    const base = this.ranura(0);
    carta.x = base.x + dx;
    carta.y = base.y + dy;
    carta.z = base.z;
    carta.r = limitar(dx * 0.035, -9, 9);
    carta.p = 0;

    this.muestras.push({ x: carta.x, y: carta.y, t: tiempo });
    while (this.muestras.length > 2 && tiempo - this.muestras[0].t > 90) this.muestras.shift();

    const progreso = limitar(
      Math.hypot(dx, dy) / (Math.min(this.ajustes.width, this.ajustes.height) * 0.3),
      0,
      1
    );
    const siguiente = this.cartas[this.orden[1]];
    if (siguiente && siguiente.fase === 'rest') siguiente.nudge = -0.22 * progreso;
  }

  /**
   * Suelta la carta arrastrada: si se movió lo suficiente (o con impulso) sale hacia donde apuntaba;
   * si no, vuelve a su lugar. `cancelado` (pointercancel) siempre la devuelve.
   */
  soltar(index: number, tiempo: number, cancelado = false): ResultadoSoltar {
    const carta = this.cartas[index];
    const base = this.ranura(0);
    const primera = this.muestras[0];
    const ultima = this.muestras[this.muestras.length - 1];
    const lapso = primera && ultima ? Math.max(0.016, (ultima.t - primera.t) / 1000) : 1;
    const velocidad: Vector =
      primera && ultima && ultima !== primera
        ? { x: (ultima.x - primera.x) / lapso, y: (ultima.y - primera.y) / lapso }
        : { x: 0, y: 0 };
    const desplazamiento = { x: carta.x - base.x, y: carta.y - base.y };
    const distancia = Math.hypot(desplazamiento.x, desplazamiento.y);
    const impulso = Math.hypot(velocidad.x, velocidad.y);

    const siguiente = this.cartas[this.orden[1]];
    if (siguiente) siguiente.nudge = 0;
    this.muestras = [];

    const lado = Math.min(this.ajustes.width, this.ajustes.height);
    if (!cancelado && (distancia > lado * 0.3 || impulso > 700)) {
      const apunte = { x: desplazamiento.x + velocidad.x * 0.12, y: desplazamiento.y + velocidad.y * 0.12 };
      const largo = Math.hypot(apunte.x, apunte.y) || 1;
      carta.fase = 'rest';
      this.mover(1, tiempo, { dir: { x: apunte.x / largo, y: apunte.y / largo }, tilt: carta.r, velocity: velocidad });
      return 'lanzada';
    }
    carta.fase = 'rest';
    carta.v.x = velocidad.x;
    carta.v.y = velocidad.y;
    return 'devuelta';
  }

  // ---- Simulación ----

  /** Avanza la física hasta `tiempo` (ms). Devuelve true mientras algo siga en movimiento. */
  avanzar(tiempo: number): boolean {
    const a = this.ajustes;
    const dt = this.ultimoTiempo ? Math.min(0.05, (tiempo - this.ultimoTiempo) / 1000) : 1 / 60;
    this.ultimoTiempo = tiempo;
    const omegaReposo = TAU * 1.7 * a.speed;
    const zetaReposo = this.reducirMovimiento ? 1 : 1 - 0.72 * a.bounce;
    const omegaMovimiento = TAU * 1.9 * a.speed;

    let ocupado = this.avanzarPuntero(dt);

    for (const carta of this.cartas) {
      if (carta.fase === 'drag') {
        ocupado = true;
        continue;
      }
      const objetivo = this.objetivoDe(carta, tiempo);
      const enMovimiento = carta.fase === 'exit' || carta.fase === 'enter';
      this.integrar(carta, objetivo, enMovimiento ? omegaMovimiento : omegaReposo, enMovimiento ? 1 : zetaReposo, dt);
      this.terminarFase(carta);
      if (this.sigueMoviendose(carta, objetivo, tiempo)) ocupado = true;
    }

    if (!ocupado) {
      this.ultimoTiempo = 0;
      this.cartas.forEach((carta) => {
        if (carta.top && carta.fase === 'rest') carta.top = 0;
      });
    }
    return ocupado;
  }

  /** Mueve la apertura al pasar el cursor y el parallax; true si alguno sigue en movimiento. */
  private avanzarPuntero(dt: number): boolean {
    const a = this.ajustes;
    const objetivoApertura = this.sobrevolada && !this.reducirMovimiento ? a.hoverSpread : 0;
    [this.apertura, this.aperturaV] = resorte(this.apertura, this.aperturaV, objetivoApertura, TAU * 1.4, 0.9, dt);
    [this.px, this.pvx] = resorte(this.px, this.pvx, this.reducirMovimiento ? 0 : this.objetivoX, TAU * 1.1, 1, dt);
    [this.py, this.pvy] = resorte(this.py, this.pvy, this.reducirMovimiento ? 0 : this.objetivoY, TAU * 1.1, 1, dt);
    return (
      Math.abs(this.apertura - objetivoApertura) > 0.0005 ||
      Math.abs(this.aperturaV) > 0.0005 ||
      Math.abs(this.px - this.objetivoX) > 0.05 ||
      Math.abs(this.py - this.objetivoY) > 0.05 ||
      Math.abs(this.pvx) + Math.abs(this.pvy) > 0.05
    );
  }

  /** Una carta que salió (o entró) lo suficiente deja de estar en esa fase y vuelve a su sitio en la pila. */
  private terminarFase(carta: Carta): void {
    const base = this.ranura(0);
    if (carta.fase === 'exit') {
      const recorrido = (carta.x - base.x) * carta.dir.x + (carta.y - base.y) * carta.dir.y;
      if (recorrido >= this.despeje(carta.dir)) {
        carta.fase = 'rest';
        carta.top = 0;
        carta.hold = 0;
      }
    } else if (carta.fase === 'enter' && carta.y - base.y >= this.despeje(ABAJO)) {
      carta.fase = 'rest';
      carta.under = false;
      carta.hold = 0;
    }
  }

  private sigueMoviendose(carta: Carta, objetivo: Record<Eje, number>, tiempo: number): boolean {
    if (carta.hold > tiempo || carta.fase !== 'rest') return true;
    return EJES.some((eje) => {
      const limite = eje === 'p' ? 0.001 : 0.02;
      return Math.abs(objetivo[eje] - carta[eje]) > limite || Math.abs(carta.v[eje]) > limite;
    });
  }

  /** Estilo de una carta en este instante. */
  estilo(index: number): EstiloCarta {
    const carta = this.cartas[index];
    const a = this.ajustes;
    const desvanecido = limitar(a.visible - carta.p, 0, 1);
    const profundidad = limitar(carta.p / Math.max(1, a.visible - 1), 0, 1);
    return {
      transform: `translate3d(${carta.x.toFixed(2)}px, ${carta.y.toFixed(2)}px, ${carta.z.toFixed(2)}px) rotate(${carta.r.toFixed(3)}deg) skewY(${a.skew}deg)`,
      zIndex: this.capa(carta),
      opacity: desvanecido < 1 ? desvanecido.toFixed(3) : '',
      visible: desvanecido > 0.001,
      sombra: (a.dim * 0.62 * profundidad).toFixed(3),
      cursor: carta.fase === 'drag' ? 'grabbing' : carta.pos > 0 ? 'pointer' : a.draggable && this.total > 1 ? 'grab' : '',
      frente: carta.pos === 0,
    };
  }

  // ---- Internos ----

  private ranura(posicion: number): { x: number; y: number; z: number; r: number; p: number } {
    const a = this.ajustes;
    const q = Math.min(posicion, a.visible);
    const apertura = 1 + this.apertura;
    return { x: q * a.dx * apertura, y: -q * a.dy * apertura, z: -q * a.dz, r: 0, p: q };
  }

  private despeje(dir: Vector): number {
    return Math.abs(dir.x) * this.ajustes.width + Math.abs(dir.y) * this.ajustes.height + 12;
  }

  private objetivoDe(carta: Carta, tiempo: number): Record<Eje, number> {
    if (carta.fase === 'exit') {
      const base = this.ranura(0);
      const alcance = this.despeje(carta.dir) * 1.3;
      return { x: base.x + carta.dir.x * alcance, y: base.y + carta.dir.y * alcance, z: base.z, r: carta.tilt, p: 0 };
    }
    if (carta.fase === 'enter') {
      const base = this.ranura(0);
      return { x: base.x, y: base.y + this.despeje(ABAJO) * 1.3, z: base.z, r: 0, p: carta.p };
    }
    const posicion = (tiempo < carta.hold ? carta.from : carta.pos) + carta.nudge;
    return this.ranura(Math.max(0, posicion));
  }

  private capa(carta: Carta): number {
    if (carta.top) return 1000 + carta.top;
    if (carta.under) return 1;
    return 10 + (this.total - carta.pos) * 2;
  }

  private reordenar(tiempo: number, escalonado: number): void {
    this.orden.forEach((index, posicion) => {
      const carta = this.cartas[index];
      if (carta.pos === posicion) return;
      carta.from = carta.pos;
      carta.pos = posicion;
      carta.hold = tiempo + Math.max(0, posicion) * escalonado;
    });
  }

  private integrar(carta: Carta, objetivo: Record<Eje, number>, omega: number, zeta: number, dt: number): void {
    const k = omega * omega;
    const d = 2 * zeta * omega;
    const pasos = Math.max(1, Math.ceil(dt / PASO));
    const h = dt / pasos;
    for (let i = 0; i < pasos; i++) {
      for (const eje of EJES) {
        const velocidad = carta.v[eje] + (k * (objetivo[eje] - carta[eje]) - d * carta.v[eje]) * h;
        carta.v[eje] = velocidad;
        carta[eje] += velocidad * h;
      }
    }
  }
}

/** Un resorte amortiguado para un valor suelto: devuelve [valor, velocidad]. */
function resorte(valor: number, velocidad: number, objetivo: number, omega: number, zeta: number, dt: number): [number, number] {
  const k = omega * omega;
  const d = 2 * zeta * omega;
  const pasos = Math.max(1, Math.ceil(dt / PASO));
  const h = dt / pasos;
  let x = valor;
  let v = velocidad;
  for (let i = 0; i < pasos; i++) {
    v += (k * (objetivo - x) - d * v) * h;
    x += v * h;
  }
  return [x, v];
}
