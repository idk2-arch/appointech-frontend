/** Ajustes que el motor lee en cada cuadro, para reaccionar a cambios de los inputs sin reiniciarse. */
export interface AjustesMotor {
  enableTilt: boolean;
  tiltStrength: number;
  parallax: number;
  intro: boolean;
}

interface Eje {
  p: number;
  v: number;
  target: number;
}

const limitar = (valor: number, min: number, max: number): number => Math.min(max, Math.max(min, valor));

/**
 * Movimiento de la tarjeta: dos resortes (uno por eje) llevan la inclinación hacia el cursor y una luz
 * que se enciende y se apaga. Escribe variables CSS directo en el elemento raíz en cada cuadro, así que
 * debe crearse fuera de la zona de Angular. Si nada se mueve, el bucle se detiene solo.
 */
export class MotorTarjeta {
  private readonly tamano = { ancho: 0, alto: 0 };
  private readonly x: Eje = { p: 0, v: 0, target: 0 };
  private readonly y: Eje = { p: 0, v: 0, target: 0 };
  private readonly luz = { p: 0, target: 0 };
  private readonly reducido: boolean;
  private raf = 0;
  private ultimo = 0;
  private lentoHasta = 0;
  private idToque: number | null = null;
  private observador?: ResizeObserver;

  constructor(
    private readonly raiz: HTMLElement,
    private readonly ajustes: () => AjustesMotor
  ) {
    this.reducido = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Conecta los eventos del puntero y del tamaño, y lanza la entrada "atrapando la luz" si corresponde. */
  iniciar(): void {
    this.tamano.ancho = this.raiz.offsetWidth;
    this.tamano.alto = this.raiz.offsetHeight;

    for (const evento of ['pointerenter', 'pointermove', 'pointerleave', 'pointerdown', 'pointerup', 'pointercancel'] as const) {
      this.raiz.addEventListener(evento, this.manejadores[evento]);
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.observador = new ResizeObserver(() => {
        this.tamano.ancho = this.raiz.offsetWidth;
        this.tamano.alto = this.raiz.offsetHeight;
        this.escribir();
      });
      this.observador.observe(this.raiz);
    }

    if (this.ajustes().intro && !this.reducido) {
      this.x.p = 0.62;
      this.y.p = -0.55;
      this.luz.p = 1;
      this.lentoHasta = performance.now() + 1400;
      this.escribir();
      this.despertar();
    } else {
      this.escribir();
    }
  }

  /** Cancela el cuadro pendiente, deja de observar el tamaño y quita todos los eventos. */
  destruir(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.observador?.disconnect();
    this.observador = undefined;
    for (const evento of ['pointerenter', 'pointermove', 'pointerleave', 'pointerdown', 'pointerup', 'pointercancel'] as const) {
      this.raiz.removeEventListener(evento, this.manejadores[evento]);
    }
  }

  /** Apunta la luz y la inclinación a una posición normalizada (de -1 a 1 en cada eje). */
  apuntar(nx: number, ny: number, encendida = true): void {
    this.x.target = limitar(nx, -1, 1);
    this.y.target = limitar(ny, -1, 1);
    this.luz.target = encendida ? 1 : 0;
    this.lentoHasta = 0;
    this.despertar();
  }

  soltar(): void {
    this.apuntar(0, 0, false);
  }

  /** Vuelca la posición actual a las variables CSS del elemento raíz. */
  escribir(): void {
    const { enableTilt, tiltStrength, parallax } = this.ajustes();
    const angulo = enableTilt && !this.reducido ? tiltStrength : 0;
    const profundidad = this.reducido ? 0 : parallax;
    const { x, y, luz } = this;
    const inclinacion = Math.min(1, Math.hypot(x.p, y.p));
    const estilo = this.raiz.style;
    estilo.setProperty('--pc-light-x', `${((x.p + 1) * 0.5 * this.tamano.ancho).toFixed(1)}px`);
    estilo.setProperty('--pc-light-y', `${((y.p + 1) * 0.5 * this.tamano.alto).toFixed(1)}px`);
    estilo.setProperty('--pc-pointer-x', `${((x.p + 1) * 50).toFixed(2)}%`);
    estilo.setProperty('--pc-pointer-y', `${((y.p + 1) * 50).toFixed(2)}%`);
    estilo.setProperty('--pc-band-x', `${(50 + x.p * 15).toFixed(2)}%`);
    estilo.setProperty('--pc-band-y', `${(50 + y.p * 15).toFixed(2)}%`);
    estilo.setProperty('--pc-rotate-x', `${(y.p * angulo).toFixed(3)}deg`);
    estilo.setProperty('--pc-rotate-y', `${(-x.p * angulo).toFixed(3)}deg`);
    estilo.setProperty('--pc-shift-x', `${(x.p * profundidad).toFixed(2)}px`);
    estilo.setProperty('--pc-shift-y', `${(y.p * profundidad).toFixed(2)}px`);
    estilo.setProperty('--pc-reach', inclinacion.toFixed(4));
    estilo.setProperty('--pc-tilt', (inclinacion * luz.p).toFixed(4));
    estilo.setProperty('--pc-active', luz.p.toFixed(4));
  }

  private readonly cuadro = (ahora: number): void => {
    const dt = Math.min(0.05, (ahora - this.ultimo) / 1000 || 0);
    this.ultimo = ahora;
    const lento = ahora < this.lentoHasta;
    const rigidez = lento ? 24 : 120;
    const amortiguacion = lento ? 9 : 16;
    const pasos = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / pasos;
    for (let i = 0; i < pasos; i++) {
      for (const eje of [this.x, this.y]) {
        eje.v += (rigidez * (eje.target - eje.p) - amortiguacion * eje.v) * h;
        eje.p += eje.v * h;
      }
    }
    const tau = this.luz.target > this.luz.p ? 0.18 : lento ? 0.9 : 0.45;
    this.luz.p += (this.luz.target - this.luz.p) * (1 - Math.exp(-dt / tau));
    this.escribir();

    if (this.enMovimiento()) {
      this.raf = requestAnimationFrame(this.cuadro);
    } else {
      this.x.p = this.x.target;
      this.y.p = this.y.target;
      this.luz.p = this.luz.target;
      this.escribir();
      this.raf = 0;
    }
  };

  private enMovimiento(): boolean {
    const { x, y, luz } = this;
    return (
      Math.abs(x.target - x.p) > 0.0005 ||
      Math.abs(y.target - y.p) > 0.0005 ||
      Math.abs(x.v) > 0.0005 ||
      Math.abs(y.v) > 0.0005 ||
      Math.abs(luz.target - luz.p) > 0.002
    );
  }

  private despertar(): void {
    if (this.raf) return;
    this.ultimo = performance.now();
    this.raf = requestAnimationFrame(this.cuadro);
  }

  private apuntarA(evento: PointerEvent): void {
    const caja = this.raiz.getBoundingClientRect();
    if (!caja.width || !caja.height) return;
    this.apuntar(((evento.clientX - caja.left) / caja.width) * 2 - 1, ((evento.clientY - caja.top) / caja.height) * 2 - 1);
  }

  /** El mouse sigue al cursor mientras está encima; el toque, mientras el dedo esté apoyado. */
  private readonly manejadores = {
    pointerenter: (e: PointerEvent): void => {
      if (e.pointerType === 'mouse') this.apuntarA(e);
    },
    pointermove: (e: PointerEvent): void => {
      if (e.pointerType === 'mouse' || e.pointerId === this.idToque) this.apuntarA(e);
    },
    pointerleave: (e: PointerEvent): void => {
      if (e.pointerType === 'mouse') this.soltar();
    },
    pointerdown: (e: PointerEvent): void => {
      if (e.pointerType === 'mouse') return;
      this.idToque = e.pointerId;
      this.apuntarA(e);
    },
    pointerup: (e: PointerEvent): void => this.terminarToque(e),
    pointercancel: (e: PointerEvent): void => this.terminarToque(e),
  };

  private terminarToque(e: PointerEvent): void {
    if (e.pointerId !== this.idToque) return;
    this.idToque = null;
    this.soltar();
  }
}
