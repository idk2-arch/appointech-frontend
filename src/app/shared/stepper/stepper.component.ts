import {
  afterNextRender,
  AfterContentInit,
  AfterViewChecked,
  AfterViewInit,
  Component,
  contentChildren,
  ElementRef,
  EventEmitter,
  inject,
  Injector,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  signal,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';

import { alAcabarAnimacion } from '../../core/utils/animacion';
import { StepComponent } from './step.component';
import { ASENTAR, curvaResorte, TEMAS_STEPPER, tintaSobre } from './stepper.temas';

export type IndicadorStepper = 'numbers' | 'dots' | 'bars';
export type TransicionStepper = 'slide' | 'fade' | 'none';
type EstadoPaso = 'complete' | 'active' | 'upcoming';

/**
 * Un panel a la vista: el del paso actual y, mientras sale con su animación, el del anterior. El que sale
 * conserva su propio elemento (con su contenido y su foco), así que no se recrea al cambiar de paso.
 */
interface Panel {
  id: number;
  step: number;
  saliente: boolean;
}

const limitar = (valor: number, min: number, max: number): number => Math.min(max, Math.max(min, valor));
const sinMovimiento = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Asistente por pasos. Con `step` el padre manda el paso (y reacciona a `stepChange`); sin él, el asistente
 * lleva su propia cuenta desde `initialStep`. El contenido de cada `app-step` solo se dibuja mientras ese paso
 * está a la vista. Los estilos son globales con prefijo `.stepper` y los colores se escriben como variables CSS.
 * Las animaciones (altura, deslizamiento, indicador) usan la Web Animations API fuera de la zona de Angular
 * y respetan `prefers-reduced-motion`.
 */
@Component({
  selector: 'app-stepper',
  standalone: false,
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class StepperComponent implements AfterContentInit, AfterViewInit, AfterViewChecked, OnChanges, OnDestroy {
  @Input() step?: number;
  @Input() initialStep = 1;
  @Input() indicator: IndicadorStepper = 'numbers';
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
  @Input() transition: TransicionStepper = 'slide';
  /** Solo deja volver (desde los indicadores) a pasos ya alcanzados. */
  @Input() linear = false;
  @Input() disableStepIndicators = false;
  @Input() showFooter = true;
  @Input() backButtonText = 'Atrás';
  @Input() nextButtonText = 'Continuar';
  @Input() completeButtonText = 'Finalizar';
  /** Apaga Continuar mientras el paso actual no sea válido. */
  @Input() nextDisabled = false;
  /** Muestra un indicador de carga en Continuar y lo apaga (p. ej. mientras se envía algo). */
  @Input() nextLoading = false;
  @Input() theme: 'dark' | 'light' = 'dark';
  @Input() accentColor?: string;
  @Input() frame = true;
  @Input() radius = 24;
  @Input() width: number | string = 440;
  /** Altura mínima del área de contenido (cualquier medida CSS), para que los pasos no "brinquen" de tamaño. */
  @Input() contentMinHeight?: number | string;
  @Output() stepChange = new EventEmitter<number>();
  @Output() finalStepCompleted = new EventEmitter<void>();
  /** Terminó la transición entre pasos: ya no hay panel saliente. Quien proyecta contenido lo conserva hasta este aviso. */
  @Output() transitionEnd = new EventEmitter<void>();

  @ViewChild('raiz', { static: true }) private raiz!: ElementRef<HTMLElement>;
  @ViewChild('visor', { static: true }) private visor!: ElementRef<HTMLElement>;

  readonly pasos = contentChildren(StepComponent);

  readonly paneles = signal<Panel[]>([{ id: 0, step: 1, saliente: false }]);
  /** El paso más lejano al que se ha llegado: hasta ahí se puede volver con `linear`. */
  readonly alcanzado = signal(1);
  /** En vertical, con poco ancho se pliega a la disposición horizontal. */
  readonly compacto = signal(false);
  /** Faltan espacio para los títulos: solo se ven los indicadores. */
  readonly apretado = signal(false);

  private readonly zona = inject(NgZone);
  private readonly injector = inject(Injector);
  private interno = 1;
  private alturaAntes = 0;
  private direccion: 1 | -1 = 1;
  private cambios = 0;
  private observador?: ResizeObserver;
  private ultimoAncho = -1;
  private firmaDeslizador = '';
  private deslizadorPuesto = false;
  private anchosEtiqueta: number[] = [];
  private animaciones: Animation[] = [];

  get total(): number {
    return this.pasos().length;
  }

  /** Paso actual (de 1 a total + 1; total + 1 es "completado"). */
  get actual(): number {
    return limitar(Math.round(this.step ?? this.interno), 1, this.total + 1);
  }

  get completado(): boolean {
    return this.actual > this.total;
  }

  get ultimo(): boolean {
    return this.actual === this.total;
  }

  get vertical(): boolean {
    return this.orientation === 'vertical';
  }

  /** Riel: indicadores en columna al lado del contenido. */
  get riel(): boolean {
    return this.vertical && !this.compacto();
  }

  get tipo(): IndicadorStepper {
    return this.vertical ? 'numbers' : this.indicator;
  }

  /** Con los pasos ya conocidos (antes de dibujar) se fija el paso inicial. */
  ngAfterContentInit(): void {
    this.interno = this.initialStep;
    this.paneles.set([{ id: 0, step: this.actual, saliente: false }]);
    this.alcanzado.set(this.actual);
  }

  ngAfterViewInit(): void {
    this.aplicarVariables();
    this.zona.runOutsideAngular(() => {
      if (typeof ResizeObserver === 'undefined') return;
      // Solo importa el ancho: durante la animación de altura el observador se dispararía en cada cuadro y
      // cada aviso leería y escribiría el diseño (reflujo forzado) sin que nada haya cambiado de ancho.
      this.observador = new ResizeObserver(() => {
        const ancho = this.raiz.nativeElement.clientWidth;
        if (ancho === this.ultimoAncho) return;
        this.ultimoAncho = ancho;
        this.medir();
        this.colocarDeslizador(false);
      });
      this.observador.observe(this.raiz.nativeElement);
    });
    afterNextRender(() => this.medir(), { injector: this.injector });
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (!this.raiz) return;
    this.aplicarVariables();
    if (cambios['step'] && !cambios['step'].firstChange) this.sincronizar();
  }

  /** El indicador se recoloca solo cuando algo que lo afecta cambió. */
  ngAfterViewChecked(): void {
    const firma = [this.actual, this.total, this.compacto(), this.apretado(), this.completado, this.tipo, this.riel].join('|');
    if (firma === this.firmaDeslizador) return;
    this.firmaDeslizador = firma;
    this.zona.runOutsideAngular(() => this.colocarDeslizador(this.deslizadorPuesto && !sinMovimiento()));
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    this.observador = undefined;
    this.cancelarAnimaciones();
  }

  plantilla(numero: number | null): TemplateRef<unknown> | null {
    return numero === null ? null : (this.pasos()[numero - 1]?.contenido ?? null);
  }

  estado(numero: number): EstadoPaso {
    if (this.completado || numero < this.actual) return 'complete';
    return numero === this.actual ? 'active' : 'upcoming';
  }

  etiquetaPaso(indice: number): string {
    const titulo = this.pasos()[indice]?.title;
    return titulo ? `Paso ${indice + 1}: ${titulo}` : `Paso ${indice + 1}`;
  }

  /** Un indicador es pulsable si no es el paso actual, no está bloqueado y (con `linear`) ya se alcanzó. */
  alcanzable(numero: number): boolean {
    const paso = this.pasos()[numero - 1];
    if (this.disableStepIndicators || numero === this.actual || paso?.locked) return false;
    return !this.linear || numero <= Math.min(this.alcanzado(), this.total);
  }

  ir(destino: number): void {
    const siguiente = limitar(destino, 1, this.total + 1);
    if (siguiente === this.actual) return;
    if (this.step === undefined) {
      this.interno = siguiente;
      this.sincronizar();
    }
    if (siguiente > this.total) this.finalStepCompleted.emit();
    else this.stepChange.emit(siguiente);
  }

  /** Tema, colores, radio y ancho: todo se escribe como variable CSS en la raíz. */
  private aplicarVariables(): void {
    const estilo = this.raiz.nativeElement.style;
    for (const [clave, valor] of Object.entries(TEMAS_STEPPER[this.theme] ?? TEMAS_STEPPER.dark)) estilo.setProperty(clave, valor);
    estilo.setProperty('--stepper-radius', `${Math.max(0, this.radius)}px`);
    estilo.setProperty('--stepper-spring', curvaResorte());
    estilo.setProperty('--stepper-width', typeof this.width === 'number' ? `${this.width}px` : this.width);
    estilo.setProperty('--stepper-content-min', this.contentMinHeight === undefined ? '0px' : typeof this.contentMinHeight === 'number' ? `${this.contentMinHeight}px` : this.contentMinHeight);
    if (this.accentColor) {
      estilo.setProperty('--stepper-solid', this.accentColor);
      estilo.setProperty('--stepper-solid-ink', tintaSobre(this.accentColor));
    }
  }

  /** Lleva lo que se ve al paso actual: toma la altura de antes y anima cuando ya se dibujó el nuevo. */
  private sincronizar(): void {
    const objetivo = this.actual;
    const lista = this.paneles();
    const vigente = lista.find((p) => !p.saliente);
    if (!vigente || objetivo === vigente.step) return;
    this.alturaAntes = this.visor.nativeElement.offsetHeight;
    this.direccion = objetivo > vigente.step ? 1 : -1;
    const id = ++this.cambios;
    // Solo un panel sale a la vez: si había otro saliendo, se descarta.
    this.paneles.set([{ ...vigente, saliente: true }, { id, step: objetivo, saliente: false }]);
    if (objetivo > this.alcanzado()) this.alcanzado.set(objetivo);
    afterNextRender(() => this.zona.runOutsideAngular(() => this.animar(id)), { injector: this.injector });
  }

  private animar(id: number): void {
    if (!this.paneles().some((p) => p.id === id)) return;
    const visor = this.visor.nativeElement;
    const hijos = Array.from(visor.children) as HTMLElement[];
    const saliente = hijos.find((h) => h.classList.contains('stepper__pane--leaving')) ?? null;
    const panel = hijos.find((h) => h.getAttribute('data-pane') === String(id)) ?? null;
    const reducido = sinMovimiento();
    const modo = this.transition === 'none' ? 'none' : reducido ? 'fade' : this.transition;

    const terminar = (): void => {
      if (!this.paneles().some((p) => p.id === id)) return;
      visor.style.overflow = '';
      if (panel) panel.style.willChange = '';
      this.zona.run(() => {
        this.paneles.update((lista) => lista.filter((p) => !p.saliente));
        this.transitionEnd.emit();
      });
    };

    // Si el foco estaba en lo que sale, pasa al panel nuevo para no perderse.
    if (saliente && panel && saliente.contains(document.activeElement)) panel.focus({ preventScroll: true });
    if (typeof visor.animate !== 'function' || modo === 'none') {
      terminar();
      return;
    }

    this.cancelarAnimaciones();
    const resorte = curvaResorte();
    const desde = this.alturaAntes;
    const hasta = visor.offsetHeight;
    // Los desplegables de los formularios no se recortan: solo se oculta el desborde mientras dura el movimiento.
    visor.style.overflow = 'hidden';
    // La capa propia solo existe mientras dura el movimiento.
    if (panel) panel.style.willChange = 'transform, opacity';
    if (saliente) saliente.style.willChange = 'transform, opacity';
    const lanzadas: Animation[] = [];
    if (Math.abs(desde - hasta) > 0.5) {
      lanzadas.push(visor.animate([{ height: `${desde}px` }, { height: `${hasta}px` }], { duration: reducido ? 200 : 560, easing: reducido ? ASENTAR : resorte }));
    }
    const eje = this.riel ? 'Y' : 'X';
    const desplazamiento = modo === 'slide' ? 36 : 0;
    if (panel) {
      if (desplazamiento) {
        lanzadas.push(panel.animate([{ transform: `translate${eje}(${this.direccion * desplazamiento}px)` }, { transform: 'none' }], { duration: 560, easing: resorte }));
      }
      lanzadas.push(panel.animate([{ opacity: 0 }, { opacity: 0, offset: 0.25 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' }));
    }
    if (saliente) {
      lanzadas.push(saliente.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'cubic-bezier(0.2, 0, 0.4, 1)', fill: 'forwards' }));
      lanzadas.push(
        saliente.animate([{ transform: 'none' }, { transform: `translate${eje}(${-this.direccion * desplazamiento}px)` }], {
          duration: 200,
          easing: 'cubic-bezier(0.4, 0, 1, 1)',
          fill: 'forwards',
        })
      );
    }
    this.animaciones = lanzadas;
    // La más larga manda: al acabar se quita lo que salía y se libera el desborde.
    const ultima = lanzadas.reduce<Animation | null>((a, b) => (a && Number(a.effect?.getTiming().duration) >= Number(b.effect?.getTiming().duration) ? a : b), null);
    if (ultima) alAcabarAnimacion(ultima, terminar);
    else terminar();
  }

  private cancelarAnimaciones(): void {
    for (const animacion of this.animaciones) animacion.cancel();
    this.animaciones = [];
    this.visor.nativeElement.style.overflow = '';
  }

  /** Decide si faltan espacio para los títulos y si la disposición vertical debe plegarse. */
  private medir(): void {
    const raiz = this.raiz.nativeElement;
    const plegado = this.vertical && raiz.clientWidth < 520;
    this.compacto.set(plegado);
    const pista = raiz.querySelector<HTMLElement>('.stepper__track');
    const hayTitulos = this.pasos().some((p) => p.title);
    if (!pista || !hayTitulos || (this.vertical && !plegado) || pista.clientWidth === 0) {
      this.apretado.set(false);
      return;
    }
    const segmentos = Array.from(pista.querySelectorAll<HTMLElement>('.stepper__segment'));
    if (!this.apretado()) {
      this.anchosEtiqueta = segmentos.map((s) => {
        const titulo = s.querySelector<HTMLElement>('.stepper__title');
        return titulo ? titulo.scrollWidth + 8 : 0;
      });
    }
    const insignias = segmentos.reduce((suma, s) => suma + ((s.firstElementChild as HTMLElement | null)?.getBoundingClientRect().width || 22) + 20, 0);
    const etiquetas = this.anchosEtiqueta.slice(0, segmentos.length).reduce((suma, ancho) => suma + ancho, 0);
    const espacio = pista.clientWidth - 8 - 4 * Math.max(0, segmentos.length - 1);
    this.apretado.set(insignias + etiquetas > espacio + 0.5);
  }

  /** El fondo del paso activo se desliza hasta su lugar. */
  private colocarDeslizador(animar: boolean): void {
    const pista = this.raiz.nativeElement.querySelector<HTMLElement>('.stepper__track');
    const deslizador = pista?.querySelector<HTMLElement>('.stepper__glider');
    if (!pista || !deslizador) return;
    const segmento = pista.querySelectorAll<HTMLElement>('.stepper__segment')[Math.min(this.actual, this.total) - 1];
    if (!segmento) return;
    const resorte = curvaResorte();
    deslizador.style.transition = animar
      ? `transform 560ms ${resorte}, width 560ms ${resorte}, height 560ms ${resorte}, opacity 200ms ease`
      : 'opacity 200ms ease';
    deslizador.style.transform = `translate3d(${segmento.offsetLeft}px, ${segmento.offsetTop}px, 0)`;
    deslizador.style.width = `${segmento.offsetWidth}px`;
    deslizador.style.height = `${segmento.offsetHeight}px`;
    deslizador.style.opacity = this.completado ? '0' : '1';
    this.deslizadorPuesto = true;
  }
}
