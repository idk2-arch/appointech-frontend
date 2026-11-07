import { AfterViewInit, booleanAttribute, Directive, ElementRef, Input, numberAttribute, OnDestroy } from '@angular/core';

import { alAcabarAnimacion } from '../../core/utils/animacion';

export type PresetAparecer = 'lista' | 'simple';

interface ConfigAparecer {
  distance: number;
  direction: 'vertical' | 'horizontal';
  reverse: boolean;
  duration: number;
  delay: number;
  threshold: number;
  blur: number;
  scale: number;
  stagger: number;
  once: boolean;
  trigger: 'scroll' | 'mount';
}

/** Valores por defecto de AnimatedContent (React Bits), salvo la distancia: 24 px y no 100. */
export const DEFECTOS_APARECER: ConfigAparecer = {
  distance: 24,
  direction: 'vertical',
  reverse: false,
  duration: 0.5,
  delay: 0,
  threshold: 0.1,
  blur: 0,
  scale: 1,
  stagger: 0,
  once: true,
  trigger: 'scroll',
};

/**
 * Los dos usos de la app, definidos aquí para no repetir números en las plantillas:
 * - `lista`: tarjetas o filas que suben una tras otra (40 px, 0,7 s, 0,1 s entre una y otra, y una leve escala).
 * - `simple`: encabezados y tarjetas de formulario, que entran juntos (28 px, 0,6 s).
 */
export const PRESETS_APARECER: Record<PresetAparecer, Partial<ConfigAparecer>> = {
  lista: { distance: 40, duration: 0.7, stagger: 0.1, scale: 0.97 },
  simple: { distance: 28, duration: 0.6 },
};

/** Solo los primeros hijos se escalonan: en una lista larga el resto aparece sin animación. */
export const MAX_ESCALONADOS = 12;

/** "power3.out" de GSAP. */
const CURVA = 'cubic-bezier(0.215, 0.61, 0.355, 1)';

/** Pantallas (por su elemento) que ya hicieron aparecer cada clave: una recarga de datos no la repite. */
const YA_APARECIERON = new WeakMap<Element, Set<string>>();

/**
 * Hace que el contenido "aparezca": sube un poco y se desvanece hacia adentro al entrar en pantalla (o al
 * montarse), uno tras otro si hay `stagger`. Traducción a Angular de AnimatedContent (React Bits) con la Web
 * Animations API y un IntersectionObserver; no usa GSAP.
 *
 * Cómo se cuida el contenido:
 * - Nada queda oculto por CSS. El estado inicial es una animación pausada que se cancela al terminar, así que
 *   no deja estilos en línea ni cambia el estilo base del elemento.
 * - Sin IntersectionObserver, sin `animate()`, con `prefers-reduced-motion` o ante cualquier error, no se hace
 *   nada y el contenido queda visible.
 * - Anima solo la primera aparición del contenedor *en esa pantalla*: si la lista se recrea por filtros,
 *   paginación o "Actualizar", o cambian sus hijos, no se vuelve a animar.
 * - Solo se mueven `transform` y `opacity` (y `filter` si `blur` > 0). No cambia el orden del DOM ni el foco.
 *
 * Se lee la configuración una vez, al crearse. Con `stagger` se animan los primeros 12 hijos directos
 * (los demás aparecen sin animación): conviene ponerla en el elemento que nace con los datos.
 */
@Directive({
  selector: '[appAparecer]',
  standalone: false,
})
export class AparecerDirective implements AfterViewInit, OnDestroy {
  /** Un preset (`lista` o `simple`); lo que se indique a mano en los demás inputs tiene prioridad. */
  @Input('appAparecer') preset: PresetAparecer | '' = '';
  /** Para distinguir dos usos del mismo preset en una pantalla. */
  @Input() aparecerClave = '';

  @Input({ transform: numberAttribute }) distance?: number;
  @Input() direction?: 'vertical' | 'horizontal';
  @Input({ transform: booleanAttribute }) reverse?: boolean;
  @Input({ transform: numberAttribute }) duration?: number;
  @Input({ transform: numberAttribute }) delay?: number;
  @Input({ transform: numberAttribute }) threshold?: number;
  @Input({ transform: numberAttribute }) blur?: number;
  @Input({ transform: numberAttribute }) scale?: number;
  @Input({ transform: numberAttribute }) stagger?: number;
  @Input({ transform: booleanAttribute }) once?: boolean;
  @Input() trigger?: 'scroll' | 'mount';

  private config: ConfigAparecer = DEFECTOS_APARECER;
  private objetivos: HTMLElement[] = [];
  private animaciones: Animation[] = [];
  private observador?: IntersectionObserver;
  private reproduciendo = false;

  constructor(private ref: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    try {
      this.iniciar();
    } catch {
      // Ante cualquier fallo el contenido tiene que quedar a la vista.
      this.limpiar();
    }
  }

  ngOnDestroy(): void {
    this.limpiar();
  }

  private iniciar(): void {
    if (typeof window === 'undefined') return;
    this.config = this.configurar();
    if (this.config.once && this.yaAparecio()) return;

    const elemento = this.ref.nativeElement;
    if (this.prefiereMenosMovimiento() || typeof elemento.animate !== 'function') return;
    if (this.config.trigger === 'scroll' && typeof IntersectionObserver === 'undefined') return;

    this.objetivos = this.elegirObjetivos();
    this.crearAnimaciones();
    if (this.config.trigger === 'mount') this.reproducir();
    else this.observar();
  }

  private configurar(): ConfigAparecer {
    const preset = this.preset ? PRESETS_APARECER[this.preset] : undefined;
    const indicados: Partial<ConfigAparecer> = {
      distance: this.distance,
      direction: this.direction,
      reverse: this.reverse,
      duration: this.duration,
      delay: this.delay,
      threshold: this.threshold,
      blur: this.blur,
      scale: this.scale,
      stagger: this.stagger,
      once: this.once,
      trigger: this.trigger,
    };
    const config: ConfigAparecer = { ...DEFECTOS_APARECER, ...preset };
    for (const [clave, valor] of Object.entries(indicados)) {
      const valido = valor !== undefined && !(typeof valor === 'number' && Number.isNaN(valor));
      if (valido) Object.assign(config, { [clave]: valor });
    }
    config.threshold = Math.min(1, Math.max(0, config.threshold));
    return config;
  }

  /** Marca que esta pantalla ya hizo aparecer este bloque; devuelve si ya lo había hecho. */
  private yaAparecio(): boolean {
    const pantalla = this.pantalla();
    const claves = YA_APARECIERON.get(pantalla) ?? new Set<string>();
    const clave = this.aparecerClave || this.preset || 'aparecer';
    if (claves.has(clave)) return true;
    claves.add(clave);
    YA_APARECIERON.set(pantalla, claves);
    return false;
  }

  /** El componente más cercano (p. ej. app-mis-citas): una pantalla nueva es un elemento nuevo y vuelve a animar. */
  private pantalla(): Element {
    for (let elemento = this.ref.nativeElement.parentElement; elemento; elemento = elemento.parentElement) {
      if (elemento.localName.startsWith('app-')) return elemento;
    }
    return document.body;
  }

  private prefiereMenosMovimiento(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  private elegirObjetivos(): HTMLElement[] {
    const elemento = this.ref.nativeElement;
    if (this.config.stagger <= 0) return [elemento];
    const hijos = Array.from(elemento.children).filter((hijo): hijo is HTMLElement => hijo instanceof HTMLElement);
    return hijos.length ? hijos.slice(0, MAX_ESCALONADOS) : [elemento];
  }

  /** Una animación pausada por objetivo: mientras espera, el primer cuadro (invisible) ya está aplicado. */
  private crearAnimaciones(): void {
    const { distance, direction, reverse, blur, scale, duration, delay, stagger } = this.config;
    const eje = direction === 'horizontal' ? 'X' : 'Y';
    const signo = reverse ? -1 : 1;
    const conBlur = blur > 0;
    const desde: Keyframe = { opacity: 0, transform: `translate${eje}(${distance * signo}px) scale(${scale})` };
    const hasta: Keyframe = { opacity: 1, transform: `translate${eje}(0px) scale(1)` };
    if (conBlur) {
      desde['filter'] = `blur(${blur}px)`;
      hasta['filter'] = 'blur(0px)';
    }

    // Cada animación se registra apenas se crea: si una falla a mitad, limpiar() cancela las anteriores y el contenido no queda oculto.
    this.animaciones = [];
    this.objetivos.forEach((objetivo, indice) => {
      const animacion = objetivo.animate([desde, hasta], {
        duration: duration * 1000,
        delay: (delay + indice * stagger) * 1000,
        easing: CURVA,
        fill: 'both',
      });
      this.animaciones.push(animacion);
      animacion.pause();
    });
  }

  /**
   * Dispara cuando el borde superior del elemento entra en el `threshold` de la altura de la pantalla (como el
   * "top 90%" de GSAP). Se logra recortando el borde inferior del observador: así funciona también con
   * elementos más altos que la pantalla, que con un umbral de proporción visible nunca llegarían.
   */
  private observar(): void {
    // Lo que ya está a la vista al cargar corre de inmediato: no depende del primer aviso del observador ni de
    // que su borde superior pase de la línea del umbral (si la página no se desplaza, nunca la pasaría).
    if (this.yaEstaVisible()) {
      this.reproducir();
      if (this.config.once) return;
    }
    this.observador = new IntersectionObserver((entradas) => this.alIntersectar(entradas), {
      threshold: 0,
      rootMargin: `0px 0px -${Math.round(this.config.threshold * 100)}% 0px`,
    });
    this.observador.observe(this.ref.nativeElement);
  }

  /** Una sola lectura de la caja al crearse. Un elemento sin tamaño todavía no está a la vista. */
  private yaEstaVisible(): boolean {
    const caja = this.ref.nativeElement.getBoundingClientRect();
    const sinTamano = caja.width === 0 && caja.height === 0;
    return !sinTamano && caja.top < window.innerHeight && caja.bottom > 0;
  }

  private alIntersectar(entradas: IntersectionObserverEntry[]): void {
    const dentro = entradas.some((entrada) => entrada.isIntersecting);
    if (dentro && !this.reproduciendo) {
      this.reproducir();
      if (this.config.once) this.desconectar();
    } else if (!dentro && this.reproduciendo && !this.config.once) {
      this.reiniciar();
    }
  }

  private reproducir(): void {
    this.reproduciendo = true;
    for (const animacion of this.animaciones) {
      animacion.play();
      // Al acabar se cancela: se quita el efecto y el elemento queda con su estilo normal. Cancelar antes de
      // tiempo (al destruir) rechaza con AbortError, que alAcabarAnimacion da por esperado.
      alAcabarAnimacion(animacion, () => animacion.cancel());
    }
  }

  /** Con `once` en falso, al salir de pantalla vuelve al estado inicial para repetir la entrada. */
  private reiniciar(): void {
    this.reproduciendo = false;
    for (const animacion of this.animaciones) animacion.cancel();
    this.crearAnimaciones();
  }

  private desconectar(): void {
    this.observador?.disconnect();
    this.observador = undefined;
  }

  private limpiar(): void {
    this.desconectar();
    for (const animacion of this.animaciones) animacion.cancel();
    this.animaciones = [];
  }
}
