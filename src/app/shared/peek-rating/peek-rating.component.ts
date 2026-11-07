import {
  AfterViewInit,
  OnInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';

import { TRAZO_ESTRELLA } from '../../core/utils/calificacion';

export type FormaCalificacion = 'star' | 'heart' | 'bolt';

/** Trazados de 24 × 24 de cada forma. */
const FORMAS: Record<FormaCalificacion, string> = {
  star: TRAZO_ESTRELLA,
  heart: 'M12 21s-7.6-4.7-9.7-9.4C.9 8.4 2.7 4.8 6.2 4.8c2.1 0 3.6 1 4.4 2.3L12 9l1.4-1.9c.8-1.3 2.3-2.3 4.4-2.3 3.5 0 5.3 3.6 3.9 6.8C19.6 16.3 12 21 12 21z',
  bolt: 'M13.5 2 4 13.5h6.2L9 22l10-12.2h-6.4L13.5 2z',
};

const SALIDA_SUAVE = 'cubic-bezier(0.23, 1, 0.32, 1)';

const limitar = (valor: number, min: number, max: number): number => Math.min(max, Math.max(min, valor));
const sinMovimiento = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Calificación con estrellas (o corazones o rayos) que se levantan al pasar el cursor, con una etiqueta
 * que sigue al puntero y un "pop" al confirmar. Sirve para elegir (`valueChange`) o solo para mostrar (`readOnly`).
 * Con `value` indefinido guarda su propio valor a partir de `defaultValue`.
 * El movimiento corre fuera de la zona de Angular y escribe los estilos directo en los elementos.
 */
@Component({
  selector: 'app-peek-rating',
  standalone: false,
  templateUrl: './peek-rating.component.html',
  styleUrl: './peek-rating.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class PeekRatingComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() value?: number;
  @Input() defaultValue = 0;
  @Input() count = 5;
  @Input() shape: FormaCalificacion = 'star';
  @Input() labels: string[] = [];
  @Input() activeColor = '#f5b400';
  @Input() idleColor = '#52525b';
  @Input() tipColor = '#27272a';
  @Input() tipTextColor = '#f5f5f5';
  @Input() size = 28;
  @Input() lift = 6;
  @Input() magnify = 1.15;
  @Input() riseDuration = 320;
  @Input() popScale = 1.3;
  @Input() showTip = true;
  @Input() allowClear = true;
  @Input() readOnly = false;
  @Input() disabled = false;
  @Input() ariaLabel = 'Calificación';
  /** Se confirma una puntuación (clic, soltar el dedo o teclado). */
  @Output() valueChange = new EventEmitter<number>();
  /** En cada casilla que cruza el cursor mientras se explora, y `null` cuando termina. */
  @Output() preview = new EventEmitter<number | null>();

  @ViewChild('raiz', { static: true }) private raiz!: ElementRef<HTMLElement>;
  @ViewChild('fila', { static: true }) private fila!: ElementRef<HTMLElement>;

  private interno = 0;
  private hover: number | null = null;
  private presionando = false;
  private idPuntero: number | null = null;
  private asentado = false;
  private caja: DOMRect | null = null;
  private rtl = false;

  constructor(
    private zona: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  get indices(): number[] {
    return Array.from({ length: Math.max(0, this.count) }, (_, i) => i);
  }

  get actual(): number {
    return limitar(this.value ?? this.interno, 0, this.count);
  }

  get interactivo(): boolean {
    return !this.readOnly && !this.disabled;
  }

  get trazo(): string {
    return FORMAS[this.shape] ?? FORMAS.star;
  }

  etiquetaDe(i: number): string {
    return this.labels[i] ? `${i + 1} de ${this.count}, ${this.labels[i]}` : `${i + 1} de ${this.count}`;
  }

  /** Solo una casilla entra con Tab: la elegida, o la primera si no hay ninguna. */
  tabindexDe(i: number): number {
    if (!this.interactivo) return -1;
    return (this.actual === 0 ? i === 0 : this.actual === i + 1) ? 0 : -1;
  }

  ngOnInit(): void {
    this.interno = this.defaultValue;
  }

  ngAfterViewInit(): void {
    this.aplicarVariables();
    this.zona.runOutsideAngular(() => {
      const fila = this.fila.nativeElement;
      fila.addEventListener('pointerenter', this.alEntrar);
      fila.addEventListener('pointerdown', this.alPresionar);
      fila.addEventListener('pointermove', this.alMover);
      fila.addEventListener('pointerup', this.alTerminar);
      fila.addEventListener('pointercancel', this.alTerminar);
      fila.addEventListener('lostpointercapture', this.alTerminar);
      fila.addEventListener('pointerleave', this.alSalir);
      this.raiz.nativeElement.addEventListener('keydown', this.alTeclear);
      document.addEventListener('visibilitychange', this.alOcultar);
      window.addEventListener('blur', this.reiniciar);
    });
    this.pintar();
  }

  ngOnChanges(): void {
    if (!this.raiz) return;
    this.aplicarVariables();
    this.pintar();
  }

  ngOnDestroy(): void {
    const fila = this.fila.nativeElement;
    fila.removeEventListener('pointerenter', this.alEntrar);
    fila.removeEventListener('pointerdown', this.alPresionar);
    fila.removeEventListener('pointermove', this.alMover);
    fila.removeEventListener('pointerup', this.alTerminar);
    fila.removeEventListener('pointercancel', this.alTerminar);
    fila.removeEventListener('lostpointercapture', this.alTerminar);
    fila.removeEventListener('pointerleave', this.alSalir);
    this.raiz.nativeElement.removeEventListener('keydown', this.alTeclear);
    document.removeEventListener('visibilitychange', this.alOcultar);
    window.removeEventListener('blur', this.reiniciar);
  }

  private aplicarVariables(): void {
    const estilo = this.raiz.nativeElement.style;
    const sitioPunta = this.interactivo && this.showTip ? Math.round(this.size * 0.9) : 0;
    estilo.setProperty('--pr-active', this.activeColor);
    estilo.setProperty('--pr-idle', this.idleColor);
    estilo.setProperty('--pr-tip', this.tipColor);
    estilo.setProperty('--pr-tip-text', this.tipTextColor);
    estilo.setProperty('--pr-size', `${this.size}px`);
    estilo.setProperty('--pr-gap', `${Math.round(this.size * 0.22)}px`);
    estilo.setProperty('--pr-room', `${this.lift + sitioPunta}px`);
    estilo.setProperty('--pr-rise', `${this.riseDuration}ms`);
  }

  /** Levanta las casillas exploradas, enciende las que corresponden y coloca la etiqueta. */
  private pintar(): void {
    const previsualizando = this.hover !== null && !this.asentado;
    const mostrado = previsualizando ? (this.hover as number) + 1 : this.actual;
    const quieto = sinMovimiento();
    const fila = this.fila.nativeElement;
    const levantes = fila.querySelectorAll<HTMLElement>('.peek-rating__lift');
    const glifos = fila.querySelectorAll<HTMLElement>('.peek-rating__glyph');

    levantes.forEach((levante, i) => {
      const levantada = previsualizando && !quieto && i <= (this.hover as number);
      levante.style.transform = levantada
        ? `translateY(${-this.lift}px) scale(${i === this.hover ? this.magnify : 1})`
        : 'translateY(0px) scale(1)';
      glifos[i].dataset['lit'] = String(i < mostrado);
    });

    const punta = fila.querySelector<HTMLElement>('.peek-rating__tip');
    if (!punta) return;
    if (previsualizando && this.showTip) {
      const hover = this.hover as number;
      const casilla = fila.clientWidth / this.count || this.size;
      const visual = this.rtl ? this.count - 1 - hover : hover;
      const estabaOculta = punta.dataset['show'] !== 'true';
      if (estabaOculta) punta.style.transition = 'none';
      punta.textContent = this.labels[hover] ?? String(hover + 1);
      punta.style.transform = `translate(calc(${casilla * (visual + 0.5)}px - 50%), 0)`;
      if (estabaOculta) {
        void punta.offsetWidth;
        punta.style.transition = '';
      }
      punta.dataset['show'] = 'true';
    } else {
      punta.dataset['show'] = 'false';
    }
  }

  private fijarHover(indice: number | null): void {
    if (indice === this.hover) return;
    this.hover = indice;
    if (indice !== null) this.asentado = false;
    this.pintar();
    this.zona.run(() => this.preview.emit(indice === null ? null : indice + 1));
  }

  private medir(): void {
    const fila = this.fila.nativeElement;
    this.caja = fila.getBoundingClientRect();
    this.rtl = getComputedStyle(fila).direction === 'rtl';
  }

  private indiceEn(x: number, y: number): number | null {
    const caja = this.caja;
    if (!caja || !caja.width) return null;
    if (this.presionando && (y < caja.top - this.size || y > caja.bottom + this.size)) return null;
    const indice = limitar(Math.floor(((x - caja.left) / caja.width) * this.count), 0, this.count - 1);
    return this.rtl ? this.count - 1 - indice : indice;
  }

  /** Confirma una puntuación; el "pop" lo anima la casilla elegida (no con el teclado). */
  private confirmar(siguiente: number, pop = true): void {
    this.interno = siguiente;
    this.asentado = true;
    this.pintar();
    this.zona.run(() => {
      this.valueChange.emit(siguiente);
      this.cdr.markForCheck();
    });
    const glifo = this.fila.nativeElement.querySelectorAll<HTMLElement>('.peek-rating__glyph')[siguiente - 1];
    if (pop && siguiente > 0 && this.popScale > 1 && glifo && typeof glifo.animate === 'function' && !sinMovimiento()) {
      glifo.getAnimations().forEach((a) => a.cancel());
      glifo.animate(
        [
          { transform: 'scale(1)', easing: SALIDA_SUAVE },
          { transform: `scale(${this.popScale})`, offset: 0.35, easing: SALIDA_SUAVE },
          { transform: 'scale(1)' },
        ],
        { duration: 300 }
      );
    }
  }

  private readonly alEntrar = (e: PointerEvent): void => {
    if (!this.interactivo || e.pointerType !== 'mouse') return;
    this.raiz.nativeElement.removeAttribute('data-instant');
    this.medir();
  };

  private readonly alPresionar = (e: PointerEvent): void => {
    if (!this.interactivo || e.button !== 0 || this.idPuntero !== null) return;
    this.raiz.nativeElement.removeAttribute('data-instant');
    try {
      this.fila.nativeElement.setPointerCapture(e.pointerId);
    } catch {
      // Sin captura del puntero (o un id ya inactivo), el arrastre sigue funcionando dentro de la fila.
    }
    this.idPuntero = e.pointerId;
    this.presionando = true;
    this.medir();
    this.fijarHover(this.indiceEn(e.clientX, e.clientY));
  };

  private readonly alMover = (e: PointerEvent): void => {
    if (!this.interactivo) return;
    if (e.pointerType !== 'mouse' && !this.presionando) return;
    if (this.presionando && e.pointerId !== this.idPuntero) return;
    if (!this.presionando && !this.caja) this.medir();
    this.fijarHover(this.indiceEn(e.clientX, e.clientY));
  };

  private readonly alTerminar = (e: PointerEvent): void => {
    if (!this.presionando || e.pointerId !== this.idPuntero) return;
    const hover = this.hover;
    this.presionando = false;
    this.idPuntero = null;
    if (e.type === 'pointerup' && hover !== null) {
      const siguiente = hover + 1;
      this.confirmar(this.allowClear && siguiente === this.actual ? 0 : siguiente);
    }
    if (e.pointerType !== 'mouse') this.fijarHover(null);
  };

  private readonly alSalir = (): void => {
    if (!this.presionando) this.fijarHover(null);
  };

  private readonly alTeclear = (e: KeyboardEvent): void => {
    if (!this.interactivo) return;
    const minimo = this.allowClear ? 0 : 1;
    const estrellas = Array.from(this.fila.nativeElement.querySelectorAll<HTMLElement>('.peek-rating__star'));
    let siguiente: number;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        siguiente = limitar(this.actual + 1, minimo, this.count);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        siguiente = limitar(this.actual - 1, minimo, this.count);
        break;
      case 'Home':
        siguiente = 1;
        break;
      case 'End':
        siguiente = this.count;
        break;
      case 'Backspace':
      case 'Delete':
        if (!this.allowClear) return;
        siguiente = 0;
        break;
      case ' ':
      case 'Enter': {
        const indice = estrellas.indexOf(e.target as HTMLElement);
        if (indice === -1) return;
        siguiente = this.allowClear && indice + 1 === this.actual ? 0 : indice + 1;
        break;
      }
      default:
        return;
    }
    e.preventDefault();
    this.raiz.nativeElement.setAttribute('data-instant', 'true');
    this.hover = null;
    this.confirmar(siguiente, false);
    estrellas[Math.max(siguiente, 1) - 1]?.focus();
  };

  /** Si la pestaña se oculta o la ventana pierde el foco, se cancela la exploración. */
  private readonly reiniciar = (): void => {
    this.presionando = false;
    this.idPuntero = null;
    this.fijarHover(null);
  };

  private readonly alOcultar = (): void => {
    if (document.hidden) this.reiniciar();
  };
}
