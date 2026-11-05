import {
  booleanAttribute,
  Directive,
  ElementRef,
  HostBinding,
  Input,
  NgZone,
  numberAttribute,
  OnChanges,
  OnDestroy,
  OnInit,
} from '@angular/core';

import { ElementoSpotlight, PunteroSpotlight, SpotlightService } from './spotlight.service';
import {
  AjustesSpotlight,
  crearAjustes,
  degradadoSpotlight,
  FormaSpotlight,
  paletaDe,
  RUIDO_SPOTLIGHT,
  TemaSpotlight,
} from './spotlight.utils';

interface EstadoLuz {
  x: number;
  y: number;
  presencia: number;
  destello: number;
}

/**
 * Port a Angular de SpotlightCard (React Bits). Se aplica sobre cualquier tarjeta y le añade, sin tocar
 * su contenido, la luz que sigue al puntero, el grano y el borde que capta la luz.
 *
 * El pintado va directo al DOM (sin enlaces de Angular) y el bucle de animación y los oyentes de puntero
 * son compartidos: viven en `SpotlightService`.
 */
@Directive({
  selector: '[appSpotlight]',
  standalone: false,
})
export class SpotlightDirective implements OnInit, OnChanges, OnDestroy, ElementoSpotlight {
  /** Por defecto, el acento del proyecto (tokens.css); el original usa blanco. */
  @Input() spotlightColor = 'var(--color-acento)';
  @Input({ transform: numberAttribute }) intensity = 0.15;
  @Input({ transform: numberAttribute }) spotlightSize = 240;
  @Input({ transform: numberAttribute }) softness = 0.7;
  @Input() shape: FormaSpotlight = 'circle';
  @Input({ transform: numberAttribute }) borderGlow = 0.6;
  @Input({ transform: numberAttribute }) proximity = 80;
  @Input({ transform: numberAttribute }) smoothing = 0.3;
  @Input({ transform: booleanAttribute }) ambient = false;
  @Input({ transform: booleanAttribute }) flare = true;
  @Input({ transform: numberAttribute }) grain = 0;
  @Input() theme: TemaSpotlight = 'dark';

  @HostBinding('class.spotlight-card') readonly esTarjeta = true;

  readonly elemento: HTMLElement;
  visible = true;

  private ajustes!: AjustesSpotlight;
  private luz?: HTMLElement;
  private ruido?: HTMLElement;
  private borde?: HTMLElement;
  private filo?: HTMLElement;
  private readonly estado: EstadoLuz = { x: 0, y: 0, presencia: 0, destello: 0 };
  private tiempo = Math.random() * 60;
  private ultimo = 0;
  private activa = false;
  private presionada = false;
  private foco: Element | null = null;
  private reducir = false;
  private dibujado = { luz: '', filo: '', ruido: '' };
  private oyentes: [string, EventListener][] = [];

  constructor(
    host: ElementRef<HTMLElement>,
    private servicio: SpotlightService,
    private zona: NgZone
  ) {
    this.elemento = host.nativeElement;
  }

  ngOnInit(): void {
    this.calcularAjustes();
    if (!this.servicio.hayNavegador) return;

    this.reducir = this.servicio.prefiereMenosMovimiento;
    this.crearElementos();
    this.zona.runOutsideAngular(() => {
      this.escuchar('pointerdown', (e) => this.alPresionar(e as PointerEvent));
      this.escuchar('focusin', (e) => this.alEnfocar(e));
      this.escuchar('focusout', (e) => this.alDesenfocar(e as FocusEvent));
    });
    this.servicio.registrar(this);
    this.despertar();
  }

  ngOnChanges(): void {
    this.calcularAjustes();
    this.elemento.style?.setProperty('--spotlight-card-border', this.ajustes.borde);
    this.despertar();
  }

  ngOnDestroy(): void {
    this.activa = false;
    this.servicio.desregistrar(this);
    for (const [tipo, oyente] of this.oyentes) this.elemento.removeEventListener(tipo, oyente);
    this.oyentes = [];
    for (const nodo of [this.luz, this.ruido, this.borde, this.filo]) nodo?.remove();
  }

  alMover(objetivo: EventTarget | null): boolean {
    return this.estado.presencia > 0 || this.ajustes.proximity > 0 || this.elemento.contains(objetivo as Node | null);
  }

  alSoltar(tipoPuntero: string): boolean {
    if (!this.presionada && tipoPuntero === 'mouse') return false;
    this.presionada = false;
    return true;
  }

  alSalir(): boolean {
    return this.estado.presencia > 0;
  }

  alDesplazar(puntero: PunteroSpotlight): boolean {
    return puntero.activo || this.estado.presencia > 0;
  }

  avanzar(ahora: number, puntero: PunteroSpotlight): boolean {
    const s = this.ajustes;
    const e = this.estado;
    const dt = Math.min(0.05, Math.max(0.001, (ahora - this.ultimo) / 1000));
    this.ultimo = ahora;
    const caja = this.elemento.getBoundingClientRect();

    const meta = this.calcularMeta(caja, puntero);
    this.derivar(meta, caja, dt);
    if (e.presencia < 0.02 && meta.objetivo > 0 && !s.ambient) {
      e.x = meta.x;
      e.y = meta.y;
    }

    const seguir = this.reducir || s.smoothing === 0 ? 1 : 1 - Math.exp(-dt / (0.015 + s.smoothing * 0.22));
    e.x += (meta.x - e.x) * seguir;
    e.y += (meta.y - e.y) * seguir;
    const desvanecer = this.reducir ? 1 : 1 - Math.exp(-dt / (meta.objetivo > e.presencia ? 0.1 : 0.32));
    e.presencia += (meta.objetivo - e.presencia) * desvanecer;
    if (Math.abs(meta.objetivo - e.presencia) < 0.002) e.presencia = meta.objetivo;

    const presion = this.presionada && s.flare && !this.reducir ? 1 : 0;
    e.destello += (presion - e.destello) * (1 - Math.exp(-dt / (presion ? 0.05 : 0.28)));
    if (Math.abs(presion - e.destello) < 0.002) e.destello = presion;

    this.pintar();

    const moviendo = Math.abs(meta.x - e.x) > 0.1 || Math.abs(meta.y - e.y) > 0.1;
    const reposo = !moviendo && e.presencia === meta.objetivo && e.destello === presion;
    this.activa = !reposo || (s.ambient && this.visible && !this.reducir);
    return this.activa;
  }

  /** Hacia dónde apunta la luz y cuánta presencia debe tener: foco de teclado, puntero o nada. */
  private calcularMeta(caja: DOMRect, puntero: PunteroSpotlight): { x: number; y: number; objetivo: number } {
    if (this.foco && this.elemento.contains(this.foco)) {
      const centro = this.foco.getBoundingClientRect();
      return {
        x: centro.left + centro.width / 2 - caja.left,
        y: centro.top + centro.height / 2 - caja.top,
        objetivo: 1,
      };
    }
    if (!puntero.activo) return { x: this.estado.x, y: this.estado.y, objetivo: 0 };

    const x = puntero.x - caja.left;
    const y = puntero.y - caja.top;
    const distancia = Math.hypot(Math.max(0, -x, x - caja.width), Math.max(0, -y, y - caja.height));
    if (distancia === 0) return { x, y, objetivo: 1 };
    const cerca = this.ajustes.proximity > 0 ? Math.max(0, 1 - distancia / this.ajustes.proximity) ** 2 : 0;
    return { x, y, objetivo: cerca };
  }

  /** Con `ambient`, la luz deriva sola por la tarjeta mientras nada la apunta. */
  private derivar(meta: { x: number; y: number; objetivo: number }, caja: DOMRect, dt: number): void {
    if (meta.objetivo >= 0.6 || !this.ajustes.ambient || !this.visible) return;
    if (!this.reducir) this.tiempo += dt;
    const deriva = (0.6 - meta.objetivo) / 0.6;
    meta.x += (caja.width * (0.5 + 0.34 * Math.sin(this.tiempo * 0.43)) - meta.x) * deriva;
    meta.y += (caja.height * (0.5 + 0.3 * Math.sin(this.tiempo * 0.61 + 1.3)) - meta.y) * deriva;
    meta.objetivo = 0.6;
  }

  private pintar(): void {
    if (!this.luz || !this.filo || !this.ruido) return;
    const s = this.ajustes;
    const e = this.estado;
    const tamano = s.size * (1 + 0.2 * e.destello);
    const impulso = 1 + 0.7 * e.destello;

    const relleno = degradadoSpotlight(s.shape, tamano, e.x, e.y, s.fill);
    const borde = degradadoSpotlight(s.shape, tamano * 0.6, e.x, s.shape === 'beam' ? 0 : e.y, s.edge);
    if (relleno !== this.dibujado.luz) {
      this.dibujado.luz = relleno;
      this.luz.style.background = relleno;
    }
    if (borde !== this.dibujado.filo) {
      this.dibujado.filo = borde;
      this.filo.style.background = borde;
    }
    this.luz.style.opacity = String(Math.min(1, e.presencia * s.intensity * impulso));
    this.filo.style.opacity = String(Math.min(1, e.presencia * s.borderGlow * impulso));

    const granulo = s.grain > 0 ? degradadoSpotlight(s.shape, tamano, e.x, e.y, '#000 0%, transparent 100%') : 'none';
    if (granulo !== this.dibujado.ruido) {
      this.dibujado.ruido = granulo;
      this.ruido.style.webkitMaskImage = granulo;
      this.ruido.style.maskImage = granulo;
    }
    this.ruido.style.opacity = String(e.presencia * s.grain);
  }

  private despertar(): void {
    if (!this.luz) return;
    if (!this.activa) {
      this.activa = true;
      this.ultimo = performance.now();
    }
    this.servicio.despertar(this);
  }

  private calcularAjustes(): void {
    this.ajustes = crearAjustes({
      spotlightColor: this.spotlightColor,
      intensity: this.intensity,
      spotlightSize: this.spotlightSize,
      softness: this.softness,
      shape: this.shape,
      borderGlow: this.borderGlow,
      proximity: this.proximity,
      smoothing: this.smoothing,
      ambient: this.ambient,
      flare: this.flare,
      grain: this.grain,
      theme: this.theme,
      tactil: this.servicio.esTactil,
    });
  }

  /** Los mismos cuatro `span` del original: luz y grano detrás del contenido, borde y filo delante. */
  private crearElementos(): void {
    const crear = (clase: string): HTMLElement => {
      const nodo = this.elemento.ownerDocument.createElement('span');
      nodo.className = `spotlight-card__${clase}`;
      nodo.setAttribute('aria-hidden', 'true');
      return nodo;
    };
    this.luz = crear('light');
    this.ruido = crear('grain');
    this.ruido.style.backgroundImage = RUIDO_SPOTLIGHT;
    this.borde = crear('border');
    this.filo = crear('edge');
    this.elemento.prepend(this.luz, this.ruido);
    this.elemento.append(this.borde, this.filo);
    this.elemento.style.setProperty('--spotlight-card-border', paletaDe(this.theme).border);
  }

  private escuchar(tipo: string, oyente: EventListener): void {
    this.elemento.addEventListener(tipo, oyente);
    this.oyentes.push([tipo, oyente]);
  }

  private alPresionar(evento: PointerEvent): void {
    this.servicio.fijarPuntero(evento.clientX, evento.clientY);
    this.presionada = true;
    this.despertar();
  }

  private alEnfocar(evento: Event): void {
    const objetivo = evento.target;
    if (!(objetivo instanceof Element) || !objetivo.matches(':focus-visible')) return;
    this.foco = objetivo;
    this.despertar();
  }

  private alDesenfocar(evento: FocusEvent): void {
    if (this.elemento.contains(evento.relatedTarget as Node | null)) return;
    this.foco = null;
    this.despertar();
  }
}
