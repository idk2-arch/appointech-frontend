import {
  AfterViewInit,
  booleanAttribute,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  numberAttribute,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';

import { animarNumero, ControlAnimacion } from './toast-animacion';
import {
  BURN,
  COLLAPSE_MS,
  DEAD_ZONE,
  EASE_OUT,
  EXIT,
  FLICK,
  MotivoCierre,
  MuestraArrastre,
  PosicionMecha,
  RESIST_PX,
  rubberband,
  TipoToast,
  velocidadDe,
} from './toast.utils';

const TIENE_STARTING_STYLE = typeof window !== 'undefined' && 'CSSStartingStyleRule' in window;

interface Arrastre {
  id: number;
  inicioY: number;
  agarre: number | null;
  movido: boolean;
  historial: MuestraArrastre[];
}

/**
 * Port a Angular de SwipeToast (React Bits): aviso con una mecha que se consume, que se cierra solo, con un
 * gesto de deslizar hacia abajo (zona muerta, resistencia elástica y flick) o con teclado.
 *
 * Diferencias con el original: `motion` se sustituye por `animarNumero` (resorte y tween propios con
 * requestAnimationFrame) y por la API de animaciones web para la mecha; el icono es un SVG según `tipo`.
 */
@Component({
  selector: 'app-toast',
  standalone: false,
  templateUrl: './toast.component.html',
})
export class ToastComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() title = '';
  @Input() description = '';
  @Input() actionLabel = '';
  /** Elige el icono y el color de la mecha cuando no se pasa `fuseColor`. */
  @Input() tipo: TipoToast | null = null;
  /** Si no se pasan, mandan los colores del tema definidos en toast.css. */
  @Input() background: string | null = null;
  @Input() color: string | null = null;
  @Input() fuseColor: string | null = null;
  @Input({ transform: numberAttribute }) width = 356;
  @Input({ transform: numberAttribute }) radius = 12;
  @Input({ transform: numberAttribute }) slideMs = 400;
  @Input({ transform: numberAttribute }) settleBounce = 0.2;
  @Input({ transform: numberAttribute }) swipeDistance = 40;
  /** 0 lo deja hasta que se cierre. Cambiarlo vuelve a encender la mecha. */
  @Input({ transform: numberAttribute }) duration = 4000;
  @Input() fuse: PosicionMecha = 'bottom';
  @Input({ transform: booleanAttribute }) pauseOnHover = true;
  @Input({ transform: booleanAttribute }) closeButton = false;
  @Input({ transform: booleanAttribute }) inline = false;
  @Input({ transform: booleanAttribute }) dismissible = true;
  /** Pasar a falso lo cierra desde fuera; a verdadero otra vez lo vuelve a mostrar. */
  @Input({ transform: booleanAttribute }) open = true;

  /** Después de la salida y, en modo `inline`, de que el hueco se haya colapsado. */
  @Output() cerrado = new EventEmitter<MotivoCierre>();
  /** Se emite al pulsar la acción, antes de cerrar. */
  @Output() accion = new EventEmitter<void>();

  @ViewChild('tarjeta', { static: true }) tarjeta!: ElementRef<HTMLElement>;
  @ViewChild('mecha', { static: true }) mecha!: ElementRef<HTMLElement>;

  readonly fase = signal<'open' | 'closing' | 'gone'>('open');
  readonly instantaneo = signal(false);
  readonly montado = signal(TIENE_STARTING_STYLE);

  private animacionMecha?: Animation;
  private arrastre: Arrastre | null = null;
  private movimiento?: ControlAnimacion;
  private desvanecimiento?: ControlAnimacion;
  private y = 0;
  private opacidad = 1;
  private readonly banderas = { hover: false, interactuando: false, foco: false, oculta: false };
  private ultimaEntrada: 'pointer' | 'keyboard' = 'pointer';
  private cierrePendiente: MotivoCierre | null = null;
  private temporizador: ReturnType<typeof setTimeout> | undefined;
  private saliendo = false;
  private oyentes: [EventTarget, string, EventListener][] = [];

  constructor(private zona: NgZone) {}

  get tieneAccion(): boolean {
    return !!this.actionLabel;
  }

  get rol(): 'status' | 'alert' {
    return this.tipo === 'error' ? 'alert' : 'status';
  }

  ngOnChanges(cambios: SimpleChanges): void {
    const abierto = cambios['open'];
    if (abierto && !abierto.firstChange) {
      if (!this.open) this.cerrar('programmatic');
      else if (this.fase() !== 'open') this.rescatar();
    }
    if (cambios['duration'] && !cambios['duration'].firstChange) this.armarMecha();
    if (cambios['pauseOnHover'] && !this.pauseOnHover) {
      this.banderas.hover = false;
      this.sincronizarMecha();
    }
  }

  ngAfterViewInit(): void {
    if (!this.open) this.cerrar('programmatic');
    if (!TIENE_STARTING_STYLE) requestAnimationFrame(() => this.montado.set(true));
    this.armarMecha();
    this.zona.runOutsideAngular(() => this.escuchar());
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizador);
    this.movimiento?.cancelar();
    this.desvanecimiento?.cancelar();
    this.animacionMecha?.cancel();
    for (const [objetivo, tipo, oyente] of this.oyentes) objetivo.removeEventListener(tipo, oyente);
    this.oyentes = [];
  }

  alAccion(): void {
    this.accion.emit();
    this.cerrar('action');
  }

  cerrar(motivo: MotivoCierre): void {
    if (this.fase() !== 'open' || this.saliendo) return;
    if (this.arrastre) {
      this.cierrePendiente = motivo;
      return;
    }
    this.animacionMecha?.pause();
    const ahora = motivo === 'escape' || ((motivo === 'action' || motivo === 'close') && this.ultimaEntrada === 'keyboard');
    this.instantaneo.set(ahora);
    this.fase.set('closing');
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.terminar(motivo), ahora ? 0 : this.slideMs * EXIT + 60);
  }

  private terminar(motivo: MotivoCierre): void {
    this.fase.set('gone');
    this.saliendo = false;
    if (this.inline) this.temporizador = setTimeout(() => this.cerrado.emit(motivo), COLLAPSE_MS);
    else this.cerrado.emit(motivo);
  }

  private rescatar(): void {
    clearTimeout(this.temporizador);
    this.instantaneo.set(false);
    this.moverY(0);
    this.cambiarOpacidad(1);
    this.fase.set('open');
    this.armarMecha();
  }

  /** La mecha es una animación de `scaleX` de `duration` ms; al acabar, el aviso se cierra solo. */
  private armarMecha(): void {
    this.animacionMecha?.cancel();
    this.animacionMecha = undefined;
    if (this.fase() !== 'open' || this.duration <= 0 || typeof this.mecha.nativeElement.animate !== 'function') return;
    const animacion = this.mecha.nativeElement.animate(BURN, { duration: this.duration, easing: 'linear', fill: 'forwards' });
    animacion.onfinish = () => this.cerrar('timeout');
    this.animacionMecha = animacion;
    this.sincronizarMecha();
  }

  /** La mecha se detiene al pasar el mouse, al enfocar, al interactuar y con la pestaña oculta. */
  private sincronizarMecha(): void {
    const animacion = this.animacionMecha;
    if (!animacion) return;
    const b = this.banderas;
    if (b.hover || b.interactuando || b.foco || b.oculta) animacion.pause();
    else if (animacion.playState === 'paused') animacion.play();
  }

  private moverY(valor: number): void {
    this.y = valor;
    this.tarjeta.nativeElement.style.transform = `translateY(${valor}px)`;
  }

  private cambiarOpacidad(valor: number): void {
    this.opacidad = valor;
    this.tarjeta.nativeElement.style.opacity = String(valor);
  }

  private reducirMovimiento(): boolean {
    return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  }

  private deslizarFuera(dy: number, velocidad: number): void {
    this.animacionMecha?.pause();
    this.saliendo = true;
    this.cierrePendiente = null;
    const tarjeta = this.tarjeta.nativeElement;
    if (!this.reducirMovimiento()) {
      this.movimiento = animarNumero({
        desde: dy,
        hasta: dy + tarjeta.offsetHeight,
        duracionMs: 300,
        resorte: { bounce: 0, velocidad: velocidad * 1000 },
        alActualizar: (valor) => this.moverY(valor),
      });
    }
    this.desvanecimiento = animarNumero({
      desde: this.opacidad,
      hasta: 0,
      duracionMs: 200,
      curva: EASE_OUT,
      alActualizar: (valor) => this.cambiarOpacidad(valor),
      alTerminar: (completa) => {
        if (completa) this.zona.run(() => this.terminar('swipe'));
      },
    });
  }

  private escuchar(): void {
    const tarjeta = this.tarjeta.nativeElement;
    const en = (objetivo: EventTarget, tipo: string, oyente: EventListener): void => {
      objetivo.addEventListener(tipo, oyente);
      this.oyentes.push([objetivo, tipo, oyente]);
    };
    en(tarjeta, 'pointerdown', (e) => this.alPresionar(e as PointerEvent));
    en(tarjeta, 'pointermove', (e) => this.alMover(e as PointerEvent));
    en(tarjeta, 'pointerup', (e) => this.alSoltar(e as PointerEvent));
    en(tarjeta, 'pointercancel', (e) => this.alSoltar(e as PointerEvent));
    en(tarjeta, 'pointerenter', (e) => {
      if (this.pauseOnHover && (e as PointerEvent).pointerType === 'mouse') this.cambiarBandera('hover', true);
    });
    en(tarjeta, 'pointerleave', (e) => {
      if ((e as PointerEvent).pointerType === 'mouse') this.cambiarBandera('hover', false);
    });
    en(tarjeta, 'focusin', () => this.cambiarBandera('foco', true));
    en(tarjeta, 'focusout', (e) => {
      if (!tarjeta.contains((e as FocusEvent).relatedTarget as Node | null)) this.cambiarBandera('foco', false);
    });
    en(tarjeta, 'keydown', (e) => this.alTeclear(e as KeyboardEvent));
    en(document, 'visibilitychange', () => this.cambiarBandera('oculta', document.hidden));
  }

  private cambiarBandera(nombre: 'hover' | 'interactuando' | 'foco' | 'oculta', valor: boolean): void {
    this.banderas[nombre] = valor;
    this.sincronizarMecha();
  }

  private alTeclear(evento: KeyboardEvent): void {
    if (evento.key === 'Enter' || evento.key === ' ') this.ultimaEntrada = 'keyboard';
    if (evento.key === 'Escape' && this.dismissible) {
      evento.stopPropagation();
      this.zona.run(() => this.cerrar('escape'));
    }
  }

  private alPresionar(evento: PointerEvent): void {
    this.ultimaEntrada = 'pointer';
    const objetivo = evento.target as Element | null;
    if (evento.button !== 0 || !this.dismissible || this.arrastre || this.saliendo || objetivo?.closest('button')) return;
    if (this.fase() === 'closing') this.rescatar();
    try {
      this.tarjeta.nativeElement.setPointerCapture(evento.pointerId);
    } catch {
      // Sin captura de puntero el gesto sigue funcionando mientras el cursor permanezca sobre el aviso.
    }
    this.movimiento?.cancelar();
    this.arrastre = {
      id: evento.pointerId,
      inicioY: evento.clientY,
      agarre: null,
      movido: false,
      historial: [[performance.now(), this.y]],
    };
    this.cambiarBandera('interactuando', true);
  }

  private alMover(evento: PointerEvent): void {
    const arrastre = this.arrastre;
    if (!arrastre || arrastre.id !== evento.pointerId) return;
    if (arrastre.agarre === null) {
      if (Math.abs(evento.clientY - arrastre.inicioY) < DEAD_ZONE) return;
      arrastre.agarre = evento.clientY - this.y;
      this.tarjeta.nativeElement.dataset['swiping'] = '';
    }
    const bruto = evento.clientY - arrastre.agarre;
    const siguiente = bruto >= 0 ? bruto : rubberband(bruto, RESIST_PX);
    this.moverY(siguiente);
    arrastre.movido = true;
    arrastre.historial.push([performance.now(), siguiente]);
    if (arrastre.historial.length > 4) arrastre.historial.shift();
  }

  private alSoltar(evento: PointerEvent): void {
    const arrastre = this.arrastre;
    if (!arrastre || arrastre.id !== evento.pointerId) return;
    this.arrastre = null;
    delete this.tarjeta.nativeElement.dataset['swiping'];
    try {
      this.tarjeta.nativeElement.releasePointerCapture(evento.pointerId);
    } catch {
      // La captura ya se había liberado.
    }
    this.banderas.interactuando = false;
    const dy = this.y;
    const velocidad = velocidadDe(arrastre.historial);
    if (dy > 0 && (velocidad > FLICK || (dy >= this.swipeDistance && velocidad >= 0))) {
      this.deslizarFuera(dy, velocidad);
      return;
    }
    if (arrastre.movido) this.volverAlSitio(velocidad);
    const pendiente = this.cierrePendiente;
    this.cierrePendiente = null;
    if (pendiente) this.zona.run(() => this.cerrar(pendiente));
    else this.sincronizarMecha();
  }

  /** Vuelve a y = 0 con resorte (o con un tween corto si se pide menos movimiento). */
  private volverAlSitio(velocidad: number): void {
    this.movimiento?.cancelar();
    const reducir = this.reducirMovimiento();
    this.movimiento = animarNumero({
      desde: this.y,
      hasta: 0,
      duracionMs: reducir ? 200 : 500,
      resorte: reducir ? undefined : { bounce: this.settleBounce, velocidad: velocidad * 1000 },
      curva: reducir ? EASE_OUT : undefined,
      alActualizar: (valor) => this.moverY(valor),
    });
  }
}
