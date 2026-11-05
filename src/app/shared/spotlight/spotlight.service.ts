import { Injectable, NgZone } from '@angular/core';

export interface PunteroSpotlight {
  x: number;
  y: number;
  activo: boolean;
}

/** Lo que el servicio necesita de cada tarjeta con spotlight. */
export interface ElementoSpotlight {
  readonly elemento: HTMLElement;
  visible: boolean;
  /** Dibuja un cuadro. Devuelve `true` mientras la luz siga en movimiento. */
  avanzar(ahora: number, puntero: PunteroSpotlight): boolean;
  /** ¿Debe despertar al moverse el puntero sobre `objetivo`? */
  alMover(objetivo: EventTarget | null): boolean;
  alSoltar(tipoPuntero: string): boolean;
  /** El puntero salió de la ventana: ¿hay luz que apagar? */
  alSalir(): boolean;
  alDesplazar(puntero: PunteroSpotlight): boolean;
}

/**
 * Un único oyente de puntero para todas las tarjetas con spotlight y un único bucle de
 * `requestAnimationFrame` que solo dibuja las tarjetas despiertas. Todo corre fuera de la zona de
 * Angular, así que mover el cursor no dispara detección de cambios.
 */
@Injectable({ providedIn: 'root' })
export class SpotlightService {
  readonly puntero: PunteroSpotlight = { x: 0, y: 0, activo: false };

  private readonly elementos = new Map<Element, ElementoSpotlight>();
  private readonly despiertos = new Set<ElementoSpotlight>();
  private observador?: IntersectionObserver;
  private escuchando = false;
  private cuadro = 0;

  constructor(private zona: NgZone) {}

  get hayNavegador(): boolean {
    return typeof window !== 'undefined';
  }

  /** Pantallas sin cursor (táctiles): ahí la luz nunca la enciende un puntero. */
  get esTactil(): boolean {
    return this.hayNavegador && (window.matchMedia?.('(hover: none)').matches ?? false);
  }

  get prefiereMenosMovimiento(): boolean {
    return this.hayNavegador && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  }

  registrar(elemento: ElementoSpotlight): void {
    if (!this.hayNavegador) return;
    this.elementos.set(elemento.elemento, elemento);
    this.zona.runOutsideAngular(() => {
      this.escuchar();
      this.observar(elemento);
    });
  }

  desregistrar(elemento: ElementoSpotlight): void {
    if (!this.elementos.delete(elemento.elemento)) return;
    this.despiertos.delete(elemento);
    this.observador?.unobserve(elemento.elemento);
    if (this.elementos.size === 0) this.detener();
  }

  /** Marca la posición del puntero (lo usa la tarjeta al presionarse, antes de que llegue un `pointermove`). */
  fijarPuntero(x: number, y: number): void {
    this.puntero.x = x;
    this.puntero.y = y;
    this.puntero.activo = true;
  }

  despertar(elemento: ElementoSpotlight): void {
    if (!this.elementos.has(elemento.elemento)) return;
    this.despiertos.add(elemento);
    if (this.cuadro === 0) {
      this.zona.runOutsideAngular(() => (this.cuadro = requestAnimationFrame(this.dibujar)));
    }
  }

  private observar(elemento: ElementoSpotlight): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.despertar(elemento);
      return;
    }
    this.observador ??= new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        const tarjeta = this.elementos.get(entrada.target);
        if (!tarjeta) continue;
        tarjeta.visible = entrada.isIntersecting;
        if (tarjeta.visible) this.despertar(tarjeta);
      }
    });
    this.observador.observe(elemento.elemento);
  }

  private escuchar(): void {
    if (this.escuchando) return;
    this.escuchando = true;
    window.addEventListener('pointermove', this.alMover);
    window.addEventListener('pointerup', this.alSoltar);
    window.addEventListener('pointercancel', this.alSoltar);
    window.addEventListener('scroll', this.alDesplazar, { capture: true, passive: true });
    document.addEventListener('pointerout', this.alSalir);
  }

  private detener(): void {
    if (this.escuchando) {
      window.removeEventListener('pointermove', this.alMover);
      window.removeEventListener('pointerup', this.alSoltar);
      window.removeEventListener('pointercancel', this.alSoltar);
      window.removeEventListener('scroll', this.alDesplazar, { capture: true });
      document.removeEventListener('pointerout', this.alSalir);
      this.escuchando = false;
    }
    cancelAnimationFrame(this.cuadro);
    this.cuadro = 0;
    this.observador?.disconnect();
    this.observador = undefined;
    this.despiertos.clear();
  }

  private readonly dibujar = (ahora: number): void => {
    this.cuadro = 0;
    for (const elemento of [...this.despiertos]) {
      if (!elemento.avanzar(ahora, this.puntero)) this.despiertos.delete(elemento);
    }
    if (this.despiertos.size > 0) this.cuadro = requestAnimationFrame(this.dibujar);
  };

  private readonly alMover = (evento: PointerEvent): void => {
    this.fijarPuntero(evento.clientX, evento.clientY);
    for (const elemento of this.elementos.values()) {
      if (elemento.visible && elemento.alMover(evento.target)) this.despertar(elemento);
    }
  };

  private readonly alSoltar = (evento: PointerEvent): void => {
    if (evento.pointerType !== 'mouse') this.puntero.activo = false;
    for (const elemento of this.elementos.values()) {
      if (elemento.alSoltar(evento.pointerType)) this.despertar(elemento);
    }
  };

  private readonly alSalir = (evento: PointerEvent): void => {
    if (evento.relatedTarget) return;
    this.puntero.activo = false;
    for (const elemento of this.elementos.values()) {
      if (elemento.alSalir()) this.despertar(elemento);
    }
  };

  private readonly alDesplazar = (): void => {
    for (const elemento of this.elementos.values()) {
      if (elemento.alDesplazar(this.puntero)) this.despertar(elemento);
    }
  };
}
