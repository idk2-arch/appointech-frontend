import {
  afterNextRender,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Injector,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
} from '@angular/core';

import { CardSwapEngine, OpcionesSalida } from './card-swap-engine';
import { AjustesPila, EntradaAjustes, limitar, normalizarAjustes } from './card-swap-geometria';

export interface ItemCardSwap {
  title?: string;
  imageUrl: string;
  alt?: string;
}

interface Arrastre {
  id: number;
  index: number;
  inicioX: number;
  inicioY: number;
  activo: boolean;
}

/**
 * Pila de cartas con perspectiva: la del frente sale y pasa al fondo (sola, con flechas, arrastrando
 * o lanzándola); un clic en una carta de atrás la trae al frente. La física vive en CardSwapEngine;
 * este componente solo lo conecta con el DOM y con los eventos.
 *
 * Todo el movimiento corre fuera de la zona de Angular y se limpia en ngOnDestroy.
 */
@Component({
  selector: 'app-card-swap',
  standalone: false,
  templateUrl: './card-swap.component.html',
  styleUrls: ['./card-swap.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardSwapComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() items: ItemCardSwap[] = [];
  @Input() width = 460;
  @Input() height = 340;
  @Input() cardDistance = 60;
  @Input() verticalDistance = 70;
  @Input() depth = 90;
  @Input() skewAmount = 6;
  @Input() visibleCards = 4;
  @Input() delay = 4000;
  @Input() autoplay = true;
  @Input() pauseOnHover = true;
  @Input() draggable = true;
  @Input() speed = 1;
  @Input() bounce = 0.35;
  @Input() parallax = 0.5;
  @Input() hoverSpread = 0.12;
  @Input() dim = 0.5;
  @Input() cardRadius = 18;
  @Input() intro = true;
  @Input() ariaLabel = 'Pila de fotos';

  /** Índice (en `items`) de la carta pulsada. */
  @Output() cardClick = new EventEmitter<number>();
  /** Índice de la carta que quedó al frente. */
  @Output() change = new EventEmitter<number>();

  @ViewChild('raiz', { static: true }) private raiz!: ElementRef<HTMLElement>;
  @ViewChild('escenario', { static: true }) private escenario!: ElementRef<HTMLElement>;
  @ViewChildren('ranura') private ranuras!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('sombra') private sombras!: QueryList<ElementRef<HTMLElement>>;

  ajustes!: AjustesPila;
  /** Variables CSS que dimensionan la pila; se recalculan solo cuando cambian las entradas. */
  estilos: Record<string, string> = {};

  private readonly zona = inject(NgZone);
  private readonly injector = inject(Injector);

  private motor: CardSwapEngine | null = null;
  private reducir = false;
  private raf = 0;
  private temporizador = 0;
  private cola: number[] = [];
  private escala = 1;
  private sobreCarta = false;
  private enPantalla = true;
  private arrastre: Arrastre | null = null;
  private huboArrastre = false;
  private vistaLista = false;
  private limpiezas: (() => void)[] = [];

  ngOnInit(): void {
    this.recalcular();
  }

  ngAfterViewInit(): void {
    this.vistaLista = true;
    this.arrancar();
  }

  ngOnChanges(cambios: SimpleChanges): void {
    this.recalcular();
    if (!this.vistaLista) return;

    const itemsPrevios = cambios['items']?.previousValue as ItemCardSwap[] | undefined;
    if (cambios['items'] && (itemsPrevios?.length ?? 0) !== this.items.length) {
      // Cambió la cantidad de cartas: se rearma la pila cuando el DOM ya tiene las nuevas ranuras.
      this.detener();
      afterNextRender(() => this.arrancar(), { injector: this.injector });
      return;
    }
    this.motor?.actualizarAjustes(this.ajustes);
    this.escribirTodo();
    this.zona.runOutsideAngular(() => {
      this.programar();
      this.despertar();
    });
  }

  ngOnDestroy(): void {
    this.detener();
  }

  next(): void {
    this.zona.runOutsideAngular(() => this.mover(1));
  }

  prev(): void {
    this.zona.runOutsideAngular(() => this.mover(-1));
  }

  alTeclear(evento: KeyboardEvent): void {
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowDown') {
      evento.preventDefault();
      this.next();
    } else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      this.prev();
    }
  }

  // ---- Arranque y limpieza ----

  private recalcular(): void {
    const a = normalizarAjustes(this.entrada(), this.items.length);
    this.ajustes = a;
    this.estilos = {
      '--swap-w': `${a.width}px`,
      '--swap-h': `${a.height}px`,
      '--swap-ox': `${a.bounds.originX}px`,
      '--swap-oy': `${a.bounds.originY}px`,
      '--swap-stage-w': `${a.bounds.width}px`,
      '--swap-stage-h': `${a.bounds.height}px`,
      '--swap-ratio': `${a.bounds.width} / ${a.bounds.height}`,
      '--swap-radius': `${Math.max(0, this.cardRadius)}px`,
    };
  }

  private entrada(): EntradaAjustes {
    return {
      width: this.width,
      height: this.height,
      cardDistance: this.cardDistance,
      verticalDistance: this.verticalDistance,
      depth: this.depth,
      skewAmount: this.skewAmount,
      visibleCards: this.visibleCards,
      speed: this.speed,
      bounce: this.bounce,
      parallax: this.parallax,
      hoverSpread: this.hoverSpread,
      dim: this.dim,
      draggable: this.draggable,
    };
  }

  private arrancar(): void {
    const total = this.items.length;
    if (total === 0) return;

    this.reducir = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motor = new CardSwapEngine(total, this.ajustes, this.reducir);
    this.motor = motor;

    this.zona.runOutsideAngular(() => {
      const unica = total < 2;
      motor.iniciar(performance.now(), this.intro && !unica);
      this.ajustarTamano();
      this.escribirTodo();
      if (this.intro && !unica && !this.reducir) {
        this.escenario.nativeElement.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
      }
      this.despertar();

      const raiz = this.raiz.nativeElement;
      this.escuchar(raiz, 'click', (e) => this.alPulsar(e as MouseEvent));
      if (!unica) {
        this.escuchar(raiz, 'pointermove', (e) => this.alMover(e as PointerEvent));
        this.escuchar(raiz, 'pointerleave', (e) => this.alSalir(e as PointerEvent));
        this.escuchar(raiz, 'pointerdown', (e) => this.alPresionar(e as PointerEvent));
        this.escuchar(raiz, 'pointerup', (e) => this.alSoltar(e as PointerEvent));
        this.escuchar(raiz, 'pointercancel', (e) => this.alSoltar(e as PointerEvent));
        this.escuchar(document, 'visibilitychange', () => this.programar());
        this.observarPantalla(raiz);
        this.programar();
      }
      this.observarTamano(raiz);
    });
  }

  /** Cancela todo lo pendiente y suelta listeners y observadores. */
  private detener(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    clearTimeout(this.temporizador);
    this.temporizador = 0;
    this.cola.forEach(clearTimeout);
    this.cola = [];
    this.limpiezas.forEach((limpiar) => limpiar());
    this.limpiezas = [];
    this.arrastre = null;
    this.sobreCarta = false;
    this.motor = null;
  }

  private escuchar(destino: EventTarget, tipo: string, manejador: (e: Event) => void): void {
    destino.addEventListener(tipo, manejador);
    this.limpiezas.push(() => destino.removeEventListener(tipo, manejador));
  }

  private observarTamano(raiz: HTMLElement): void {
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(() => this.ajustarTamano());
    observador.observe(raiz);
    this.limpiezas.push(() => observador.disconnect());
  }

  private observarPantalla(raiz: HTMLElement): void {
    if (typeof IntersectionObserver === 'undefined') return;
    const observador = new IntersectionObserver((entradas) => {
      this.enPantalla = entradas[entradas.length - 1]?.isIntersecting ?? true;
      this.programar();
    });
    observador.observe(raiz);
    this.limpiezas.push(() => observador.disconnect());
  }

  // ---- Dibujo ----

  private ajustarTamano(): void {
    const raiz = this.raiz.nativeElement;
    const b = this.ajustes.bounds;
    const escala = Math.min(1, raiz.clientWidth / b.width, raiz.clientHeight > 0 ? raiz.clientHeight / b.height : 1);
    this.escala = escala > 0 ? escala : 1;
    this.escenario.nativeElement.style.transform = `translate(-50%, -50%) scale(${this.escala.toFixed(4)})`;
  }

  private escribirTodo(): void {
    const motor = this.motor;
    if (!motor) return;
    const origen = motor.origenPerspectiva;
    this.escenario.nativeElement.style.perspectiveOrigin = `${origen.x.toFixed(2)}px ${origen.y.toFixed(2)}px`;
    for (let i = 0; i < motor.total; i++) {
      const ranura = this.ranuras.get(i)?.nativeElement;
      if (!ranura) continue;
      const estilo = motor.estilo(i);
      ranura.style.transform = estilo.transform;
      ranura.style.zIndex = String(estilo.zIndex);
      ranura.style.opacity = estilo.opacity;
      ranura.style.visibility = estilo.visible ? '' : 'hidden';
      ranura.style.cursor = estilo.cursor;
      ranura.toggleAttribute('data-front', estilo.frente);
      const sombra = this.sombras.get(i)?.nativeElement;
      if (sombra) sombra.style.opacity = estilo.sombra;
    }
  }

  private readonly marco = (tiempo: number): void => {
    this.raf = 0;
    const motor = this.motor;
    if (!motor) return;
    const ocupado = motor.avanzar(tiempo);
    this.escribirTodo();
    if (ocupado) this.raf = requestAnimationFrame(this.marco);
  };

  private despertar(): void {
    if (this.motor && !this.raf) this.raf = requestAnimationFrame(this.marco);
  }

  // ---- Autoplay ----

  private enPausa(): boolean {
    return (
      !this.autoplay ||
      this.items.length < 2 ||
      (this.pauseOnHover && this.sobreCarta) ||
      this.arrastre !== null ||
      !this.enPantalla ||
      document.visibilityState === 'hidden'
    );
  }

  private programar(): void {
    clearTimeout(this.temporizador);
    this.temporizador = 0;
    if (!this.motor || this.enPausa()) return;
    this.temporizador = window.setTimeout(
      () => {
        this.temporizador = 0;
        this.mover(1);
      },
      Math.max(400, this.delay)
    );
  }

  private mover(direccion: 1 | -1, opciones?: OpcionesSalida): void {
    const motor = this.motor;
    if (!motor?.mover(direccion, performance.now(), opciones)) return;
    this.avisarCambio();
    this.despertar();
    this.programar();
  }

  private avisarCambio(): void {
    const frente = this.motor?.indiceFrente ?? 0;
    this.zona.run(() => this.change.emit(frente));
  }

  private irA(posicion: number): void {
    this.cola.forEach(clearTimeout);
    this.cola = [];
    const separacion = 110 / this.ajustes.speed;
    for (let i = 0; i < posicion; i++) {
      this.cola.push(window.setTimeout(() => this.mover(1), i * separacion));
    }
  }

  // ---- Puntero ----

  private indiceDe(evento: Event): number | null {
    const objetivo = (evento.target as Element | null)?.closest?.('[data-swap-index]');
    if (!objetivo || !this.raiz.nativeElement.contains(objetivo)) return null;
    return Number(objetivo.getAttribute('data-swap-index'));
  }

  private alMover(evento: PointerEvent): void {
    const motor = this.motor;
    if (!motor) return;

    if (evento.pointerType !== 'touch') {
      const caja = this.raiz.nativeElement.getBoundingClientRect();
      const nx = limitar(((evento.clientX - caja.left) / Math.max(1, caja.width)) * 2 - 1, -1, 1);
      const ny = limitar(((evento.clientY - caja.top) / Math.max(1, caja.height)) * 2 - 1, -1, 1);
      motor.moverPuntero(nx, ny);
      const sobre = this.indiceDe(evento) !== null;
      if (sobre !== this.sobreCarta) {
        this.sobreCarta = sobre;
        this.programar();
      }
      this.despertar();
    }

    const arrastre = this.arrastre;
    if (!arrastre || arrastre.id !== evento.pointerId) return;
    const dx = (evento.clientX - arrastre.inicioX) / this.escala;
    const dy = (evento.clientY - arrastre.inicioY) / this.escala;
    if (!arrastre.activo) {
      if (Math.hypot(dx, dy) < 5) return;
      arrastre.activo = true;
      this.huboArrastre = true;
      motor.comenzarArrastre(arrastre.index);
      this.raiz.nativeElement.setPointerCapture?.(evento.pointerId);
      this.raiz.nativeElement.style.cursor = 'grabbing';
    }
    motor.arrastrar(arrastre.index, dx, dy, performance.now());
    this.despertar();
  }

  private alSalir(evento: PointerEvent): void {
    if (evento.pointerType === 'touch' || this.arrastre?.activo) return;
    this.motor?.salirPuntero();
    this.sobreCarta = false;
    this.programar();
    this.despertar();
  }

  private alPresionar(evento: PointerEvent): void {
    this.huboArrastre = false;
    const motor = this.motor;
    if (!motor || !this.draggable || evento.button > 0) return;
    const index = this.indiceDe(evento);
    if (index === null || !motor.puedeArrastrar(index)) return;
    this.arrastre = { id: evento.pointerId, index, inicioX: evento.clientX, inicioY: evento.clientY, activo: false };
    this.programar();
  }

  private alSoltar(evento: PointerEvent): void {
    const arrastre = this.arrastre;
    const motor = this.motor;
    if (!motor || !arrastre || arrastre.id !== evento.pointerId) return;
    this.arrastre = null;
    this.raiz.nativeElement.style.cursor = '';
    if (!arrastre.activo) {
      this.programar();
      return;
    }
    this.raiz.nativeElement.releasePointerCapture?.(evento.pointerId);
    const resultado = motor.soltar(arrastre.index, performance.now(), evento.type === 'pointercancel');
    if (resultado === 'lanzada') this.avisarCambio();
    this.despertar();
    this.programar();
  }

  private alPulsar(evento: MouseEvent): void {
    if (this.huboArrastre) {
      this.huboArrastre = false;
      return;
    }
    const index = this.indiceDe(evento);
    if (index === null) return;
    this.zona.run(() => this.cardClick.emit(index));
    const posicion = this.motor?.posicionDe(index) ?? 0;
    if (posicion > 0) this.irA(posicion);
  }
}
