import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';

import { AjustesBounceCards, BOUNCE_CARDS_POR_DEFECTO as BASE } from '../../core/config/bounce-cards.config';
import { ajustesDelMotor, AjustesMotor, BounceCardsEngine } from './bounce-cards-engine';

export interface ImagenBounce {
  src: string;
  alt?: string;
}

interface Punto {
  x: number;
  y: number;
}

const SELECTOR_CARTA = '.bounce-cards__card';
/** Más allá de este ancho disponible, el conjunto no se agranda: solo se reduce. */
const ESCALA_MAXIMA = 1;

/**
 * Tarjetas de foto con borde, algo inclinadas, que aparecen con rebote; al pasar el cursor (o con
 * el foco) la carta de abajo se endereza y sube, y las demás se apartan. Solo pinta cartas: la física
 * vive en BounceCardsEngine y no sabe nada de qué representan las imágenes.
 *
 * Si el espacio disponible es menor que `containerWidth`, escala todo el conjunto en vez de cortarlo.
 * Al cambiar la cantidad de imágenes, el hover se apaga hasta que el cursor se mueva de verdad.
 */
@Component({
  selector: 'app-bounce-cards',
  standalone: false,
  templateUrl: './bounce-cards.component.html',
  styleUrls: ['./bounce-cards.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BounceCardsComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() images: ImagenBounce[] = [];
  @Input() containerWidth = BASE.containerWidth;
  @Input() containerHeight = BASE.containerHeight;
  @Input() cardSize = BASE.cardSize;
  @Input() spread = BASE.spread;
  @Input() rotation = BASE.rotation;
  @Input() arc = BASE.arc;
  @Input() pushDistance = BASE.pushDistance;
  @Input() hoverScale = BASE.hoverScale;
  @Input() bounciness = BASE.bounciness;
  @Input() animationDelay = BASE.animationDelay;
  @Input() animationStagger = BASE.animationStagger;
  @Input() borderWidth = BASE.borderWidth;
  @Input() borderColor = BASE.borderColor;
  @Input() radius = BASE.radius;
  @Input() shadow = BASE.shadow;
  @Input() enableHover = BASE.enableHover;

  /** Índice de la carta pulsada (o activada con Enter o espacio). */
  @Output() cardClick = new EventEmitter<number>();

  @ViewChild('ajuste', { static: true }) private ajuste!: ElementRef<HTMLElement>;
  @ViewChild('conjunto', { static: true }) private conjunto!: ElementRef<HTMLElement>;
  @ViewChildren('carta') private cartas!: QueryList<ElementRef<HTMLElement>>;

  /** Variables CSS del conjunto; se recalculan solo cuando cambian las entradas. */
  estilos: Record<string, string> = {};

  private readonly zona = inject(NgZone);
  private motor: BounceCardsEngine | null = null;
  private reducir = false;
  private raf = 0;
  private ultimoMarco = 0;
  private escala = ESCALA_MAXIMA;
  private vivo = false;
  private cantidadPrevia = 0;
  /** Último punto del cursor, y el punto en que se "congeló" el hover tras cambiar la cantidad de cartas. */
  private ultimoPunto: Punto | null = null;
  private puntoCongelado: Punto | null = null;
  private limpiezas: (() => void)[] = [];

  /** Con quien escucha `cardClick`, las cartas son botones (enfocables y con rol). */
  get clicable(): boolean {
    return this.cardClick.observed;
  }

  ngOnInit(): void {
    this.recalcularEstilos();
  }

  ngAfterViewInit(): void {
    this.arrancar();
  }

  ngOnChanges(): void {
    this.recalcularEstilos();
    if (!this.motor) return;
    if (this.images.length !== this.cantidadPrevia) {
      // Las cartas se reacomodan solas; algunos navegadores emiten un movimiento falso del cursor tras
      // el cambio, que no debe volver a activar una carta mientras el cursor siga en el mismo punto.
      this.puntoCongelado = this.ultimoPunto;
      this.cantidadPrevia = this.images.length;
    }
    this.motor.actualizar(this.ajustesMotor());
    this.ajustarTamano();
    this.zona.runOutsideAngular(() => this.despertar());
  }

  ngOnDestroy(): void {
    this.vivo = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.limpiezas.forEach((limpiar) => limpiar());
    this.limpiezas = [];
    this.motor = null;
  }

  // ---- Configuración ----

  private ajustesMotor(): AjustesMotor {
    return ajustesDelMotor({
      count: this.images.length,
      containerWidth: this.containerWidth,
      containerHeight: this.containerHeight,
      cardSize: this.cardSize,
      spread: this.spread,
      rotation: this.rotation,
      arc: this.arc,
      pushDistance: this.pushDistance,
      hoverScale: this.hoverScale,
      bounciness: this.bounciness,
      animationDelay: this.animationDelay,
      animationStagger: this.animationStagger,
      enableHover: this.enableHover,
    });
  }

  private recalcularEstilos(): void {
    const ajustes = this.ajustesDelConjunto();
    this.estilos = {
      '--bounce-cards-size': `${Math.max(10, ajustes.cardSize)}px`,
      '--bounce-cards-border': `${Math.max(0, ajustes.borderWidth)}px`,
      '--bounce-cards-border-color': ajustes.borderColor,
      '--bounce-cards-radius': `${Math.max(0, ajustes.radius)}px`,
      '--bounce-cards-shadow': ajustes.shadow ? 'var(--bounce-cards-sombra)' : 'none',
      '--bounce-cards-shadow-active': ajustes.shadow ? 'var(--bounce-cards-sombra-activa)' : 'none',
      width: `${ajustes.containerWidth}px`,
      height: `${ajustes.containerHeight}px`,
    };
  }

  private ajustesDelConjunto(): AjustesBounceCards {
    return {
      containerWidth: this.containerWidth,
      containerHeight: this.containerHeight,
      cardSize: this.cardSize,
      spread: this.spread,
      arc: this.arc,
      pushDistance: this.pushDistance,
      hoverScale: this.hoverScale,
      rotation: this.rotation,
      bounciness: this.bounciness,
      animationDelay: this.animationDelay,
      animationStagger: this.animationStagger,
      borderWidth: this.borderWidth,
      borderColor: this.borderColor,
      radius: this.radius,
      shadow: this.shadow,
      enableHover: this.enableHover,
    };
  }

  // ---- Arranque ----

  private arrancar(): void {
    this.reducir = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.motor = new BounceCardsEngine(this.ajustesMotor(), this.reducir);
    this.vivo = true;
    this.cantidadPrevia = this.images.length;

    this.zona.runOutsideAngular(() => {
      const conjunto = this.conjunto.nativeElement;
      this.escuchar(conjunto, 'pointermove', (e) => this.alMover(e as PointerEvent));
      this.escuchar(conjunto, 'pointerdown', (e) => this.alTocar(e as PointerEvent));
      this.escuchar(conjunto, 'pointerleave', () => this.desactivar());
      this.escuchar(conjunto, 'click', (e) => this.alPulsar(e as MouseEvent));
      this.escuchar(conjunto, 'focusin', (e) => this.alEnfocar(e as FocusEvent));
      this.escuchar(conjunto, 'focusout', () => this.desactivar());
      this.escuchar(conjunto, 'keydown', (e) => this.alTeclear(e as KeyboardEvent));
      this.observarTamano();
      this.ajustarTamano();
      this.despertar();
    });
  }

  private escuchar(destino: EventTarget, tipo: string, manejador: (e: Event) => void): void {
    destino.addEventListener(tipo, manejador);
    this.limpiezas.push(() => destino.removeEventListener(tipo, manejador));
  }

  private observarTamano(): void {
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(() => this.ajustarTamano());
    observador.observe(this.ajuste.nativeElement);
    this.limpiezas.push(() => observador.disconnect());
  }

  /** Reduce el conjunto (sin cortarlo) cuando el ancho disponible es menor que `containerWidth`. */
  private ajustarTamano(): void {
    const ancho = this.ajuste.nativeElement.clientWidth;
    const escala = ancho > 0 ? Math.min(ESCALA_MAXIMA, ancho / this.containerWidth) : ESCALA_MAXIMA;
    this.escala = escala > 0 ? escala : ESCALA_MAXIMA;
    this.ajuste.nativeElement.style.height = `${(this.containerHeight * this.escala).toFixed(2)}px`;
    this.conjunto.nativeElement.style.transform = `translateX(-50%) scale(${this.escala.toFixed(4)})`;
  }

  // ---- Dibujo ----

  private readonly marco = (ahora: number): void => {
    this.raf = 0;
    const motor = this.motor;
    if (!motor || !this.vivo) return;

    const segundos = (ahora - this.ultimoMarco) / 1000;
    this.ultimoMarco = ahora;
    const ocupado = motor.avanzar(segundos);

    this.cartas.forEach((carta, i) => {
      const estilo = motor.estilo(i);
      if (!estilo) return;
      const el = carta.nativeElement;
      el.style.transform = estilo.transform;
      el.style.zIndex = String(estilo.zIndex);
      el.toggleAttribute('data-active', estilo.activa);
    });

    if (ocupado) this.raf = requestAnimationFrame(this.marco);
  };

  private despertar(): void {
    if (this.raf || !this.vivo) return;
    this.ultimoMarco = performance.now();
    this.raf = requestAnimationFrame(this.marco);
  }

  // ---- Eventos ----

  private alMover(evento: PointerEvent): void {
    const punto = { x: evento.clientX, y: evento.clientY };
    const congelado = this.puntoCongelado;
    this.ultimoPunto = punto;
    if (congelado) {
      if (congelado.x === punto.x && congelado.y === punto.y) return;
      this.puntoCongelado = null;
    }
    this.activarBajo(evento);
  }

  /** Un toque es una acción real: activa la carta aunque el punto no haya cambiado. */
  private alTocar(evento: PointerEvent): void {
    this.ultimoPunto = { x: evento.clientX, y: evento.clientY };
    this.puntoCongelado = null;
    this.activarBajo(evento);
  }

  private activarBajo(evento: PointerEvent): void {
    const motor = this.motor;
    if (!motor) return;
    const caja = this.conjunto.nativeElement.getBoundingClientRect();
    const px = (evento.clientX - caja.left - caja.width / 2) / this.escala;
    const py = (evento.clientY - caja.top - caja.height / 2) / this.escala;
    if (motor.activar(motor.cartaBajo(px, py))) this.despertar();
  }

  private desactivar(): void {
    if (this.motor?.activar(-1)) this.despertar();
  }

  private alPulsar(evento: MouseEvent): void {
    const motor = this.motor;
    if (!motor) return;
    const caja = this.conjunto.nativeElement.getBoundingClientRect();
    const indice = motor.cartaBajo(
      (evento.clientX - caja.left - caja.width / 2) / this.escala,
      (evento.clientY - caja.top - caja.height / 2) / this.escala
    );
    if (indice < 0) return;
    this.avisarPulsacion(indice);
  }

  private alEnfocar(evento: FocusEvent): void {
    const indice = this.indiceDeCarta(evento.target);
    if (indice >= 0 && this.motor?.activar(indice)) this.despertar();
  }

  private alTeclear(evento: KeyboardEvent): void {
    if (evento.key !== 'Enter' && evento.key !== ' ') return;
    // Solo la carta misma responde a Enter y espacio.
    const indice = this.cartas.toArray().findIndex((c) => c.nativeElement === evento.target);
    if (indice < 0 || !this.clicable) return;
    evento.preventDefault();
    this.avisarPulsacion(indice);
  }

  private avisarPulsacion(indice: number): void {
    // Con el clic la carta toma el foco, así quien abra algo encima puede devolvérselo al cerrar.
    if (this.clicable) this.cartas.get(indice)?.nativeElement.focus({ preventScroll: true });
    this.motor?.pulsar(indice);
    this.despertar();
    this.zona.run(() => this.cardClick.emit(indice));
  }

  /** Índice de la carta que contiene al elemento (que puede ser la carta o un botón dentro de ella). */
  private indiceDeCarta(destino: EventTarget | null): number {
    const carta = (destino as Element | null)?.closest?.(SELECTOR_CARTA);
    return this.cartas.toArray().findIndex((c) => c.nativeElement === carta);
  }
}
