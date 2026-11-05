import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  Output,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { alAcabarAnimacion } from '../../core/utils/animacion';

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const INTERACTIVOS = 'a, button, input, select, textarea, [role="button"], [role="link"]';

/** `layout` de Motion por defecto: 0.45 s con la curva [0.4, 0, 0.1, 1]. */
const DURACION_LAYOUT_MS = 450;
const CURVA_LAYOUT = 'cubic-bezier(0.4, 0, 0.1, 1)';
/** Aparición de opacidad por defecto de Motion. */
const DURACION_FUNDIDO_MS = 300;
/** Al cerrar el contenido se apaga antes de que el panel se encoja, para que no se vea recortado. */
const DURACION_SALIDA_CONTENIDO_MS = 200;
/** `exit` del botón de cerrar en el original. */
const DURACION_SALIDA_BOTON_MS = 50;

/** Estilos en línea que se ponen al panel mientras se anima, para que ninguna regla de CSS lo limite. */
const PROPIEDADES_ANIMADAS = ['position', 'margin', 'max-width', 'max-height', 'transition', 'left', 'top', 'width', 'height'];

interface Geometria extends Keyframe {
  left: string;
  top: string;
  width: string;
  height: string;
  borderRadius: string;
}

const geometriaDe = (caja: DOMRect, radio: string): Geometria => ({
  left: `${caja.left}px`,
  top: `${caja.top}px`,
  width: `${caja.width}px`,
  height: `${caja.height}px`,
  borderRadius: radio,
});

/**
 * Port a Angular de Expandable Card (Aceternity UI). La tarjeta compacta (slot `resumen`) se expande a un
 * diálogo centrado (slots `cabecera`, `acciones` y `expandido`) con una animación FLIP: el panel parte de la
 * posición y el tamaño reales de la tarjeta y crece hasta el centro; al cerrar hace el camino inverso.
 *
 * El panel se anima con `left`, `top`, `width` y `height` (nunca con `scale`, que deformaría el texto) y el
 * contenido aparece y desaparece solo con opacidad.
 */
@Component({
  selector: 'app-tarjeta-expandible',
  standalone: false,
  templateUrl: './tarjeta-expandible.component.html',
})
export class TarjetaExpandibleComponent implements OnDestroy {
  /** Nombre accesible del diálogo. */
  @Input() etiqueta = 'Detalles';
  @Input() textoAbrir = 'Ver más';
  @Output() cambio = new EventEmitter<boolean>();

  @ViewChild('compacta', { static: true }) compacta!: ElementRef<HTMLElement>;
  @ViewChild('abrirBoton', { static: true }) abrirBoton!: ElementRef<HTMLButtonElement>;

  /** Verdadero desde que se pulsa la tarjeta hasta que termina de cerrarse (sirve para cargar datos al abrir). */
  abierta = false;

  private capaEl?: HTMLElement;
  private cerrando = false;
  private quitarTeclas?: () => void;
  private bloqueo: { desborde: string; hueco: string; relleno: string } | null = null;
  private enCurso: Animation[] = [];
  /** Identifica la animación vigente: los avisos de una animación cancelada no deben tocar la siguiente. */
  private generacion = 0;
  private destruido = false;

  constructor(
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private doc: Document
  ) {}

  @ViewChild('capa') set capa(ref: ElementRef<HTMLElement> | undefined) {
    if (!ref || ref.nativeElement === this.capaEl) return;
    this.capaEl = ref.nativeElement;
    this.entrar(this.capaEl);
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (!this.capaEl) return;
    this.cancelarAnimaciones();
    this.liberar();
    this.capaEl.remove();
  }

  alClicTarjeta(evento: Event): void {
    const objetivo = evento.target as Element | null;
    if (objetivo?.closest(INTERACTIVOS)) return;
    this.abrir();
  }

  abrir(): void {
    if (this.abierta) return;
    this.abierta = true;
    this.cerrando = false;
    this.cambio.emit(true);
  }

  cerrar(): void {
    if (!this.abierta || this.cerrando) return;
    this.cerrando = true;
    this.animar(false, undefined, () => {
      if (!this.destruido) this.terminarCierre();
    });
  }

  /** Mueve la capa a `body` (para que ningún contenedor la recorte), bloquea el scroll y anima la apertura. */
  private entrar(capa: HTMLElement): void {
    const origen = this.compacta.nativeElement;
    // El origen se mide antes de tocar el scroll: así no incluye ningún desplazamiento de la página.
    const caja = origen.getBoundingClientRect();
    this.doc.body.appendChild(capa);
    this.bloquearScroll();
    this.quitarTeclas = this.renderer.listen('document', 'keydown', (evento: KeyboardEvent) => this.alTecla(evento));
    // La tarjeta "viaja" al panel; `visibility` conserva su hueco, así que la lista no se mueve.
    origen.style.visibility = 'hidden';
    this.panel(capa).focus({ preventScroll: true });
    this.animar(true, caja);
  }

  private terminarCierre(): void {
    this.enCurso = [];
    this.liberar();
    this.capaEl?.remove();
    this.capaEl = undefined;
    this.compacta.nativeElement.style.visibility = '';
    this.abierta = false;
    this.cerrando = false;
    this.abrirBoton.nativeElement.focus({ preventScroll: true });
    this.cambio.emit(false);
    this.cdr.markForCheck();
  }

  /**
   * Bloquea el scroll del body sin que la página se mueva: si había barra de desplazamiento, su hueco se
   * conserva con `scrollbar-gutter: stable` (o, donde no exista, con un relleno del mismo ancho).
   */
  private bloquearScroll(): void {
    const html = this.doc.documentElement;
    const cuerpo = this.doc.body;
    this.bloqueo = { desborde: cuerpo.style.overflow, hueco: html.style.scrollbarGutter, relleno: cuerpo.style.paddingRight };

    const anchoBarra = (this.doc.defaultView?.innerWidth ?? 0) - html.clientWidth;
    if (html.clientWidth > 0 && anchoBarra > 0) {
      if (typeof CSS !== 'undefined' && CSS.supports?.('scrollbar-gutter', 'stable')) {
        html.style.scrollbarGutter = 'stable';
      } else {
        const actual = Number.parseFloat(getComputedStyle(cuerpo).paddingRight) || 0;
        cuerpo.style.paddingRight = `${actual + anchoBarra}px`;
      }
    }
    cuerpo.style.overflow = 'hidden';
  }

  private liberar(): void {
    this.quitarTeclas?.();
    this.quitarTeclas = undefined;
    if (!this.bloqueo) return;
    this.doc.body.style.overflow = this.bloqueo.desborde;
    this.doc.body.style.paddingRight = this.bloqueo.relleno;
    this.doc.documentElement.style.scrollbarGutter = this.bloqueo.hueco;
    this.bloqueo = null;
  }

  private panel(capa: HTMLElement): HTMLElement {
    return capa.querySelector<HTMLElement>('.tarjeta-expandible__panel')!;
  }

  private alTecla(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      this.cerrar();
    } else if (evento.key === 'Tab') {
      this.atrapar(evento);
    }
  }

  /** Mantiene el foco dentro del diálogo mientras está abierto. */
  private atrapar(evento: KeyboardEvent): void {
    const capa = this.capaEl;
    if (!capa) return;
    const lista = Array.from(capa.querySelectorAll<HTMLElement>(ENFOCABLES)).filter(
      (el) => getComputedStyle(el).display !== 'none'
    );
    if (lista.length === 0) {
      evento.preventDefault();
      this.panel(capa).focus();
      return;
    }
    const primero = lista[0];
    const ultimo = lista[lista.length - 1];
    const activo = this.doc.activeElement;
    const dentro = capa.contains(activo);
    if (!dentro || (evento.shiftKey && (activo === primero || activo === this.panel(capa)))) {
      evento.preventDefault();
      (evento.shiftKey && dentro ? ultimo : primero).focus();
    } else if (!evento.shiftKey && activo === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }

  /**
   * FLIP sin librerías. El panel ya está en su sitio final (centrado por CSS): se mide ahí, se fija con
   * `position: fixed` y se anima su rectángulo desde (o hacia) el de la tarjeta, medido en este momento.
   * Mientras dura la animación se quitan `max-width` y `max-height` del panel: con ellos el ancho de una
   * tarjeta más ancha que 500 px se recortaba y, al terminar, el panel "saltaba" a la forma de la tarjeta.
   */
  private animar(abriendo: boolean, cajaOrigen?: DOMRect, alTerminar?: () => void): void {
    const capa = this.capaEl;
    if (!capa) {
      alTerminar?.();
      return;
    }
    const panel = this.panel(capa);
    const interior = capa.querySelector<HTMLElement>('.tarjeta-expandible__interior')!;
    const generacion = ++this.generacion;
    this.cancelarAnimaciones();
    this.limpiarPanel(panel, interior);
    if (this.reducirMovimiento() || typeof panel.animate !== 'function') {
      alTerminar?.();
      return;
    }

    const origen = cajaOrigen ?? this.compacta.nativeElement.getBoundingClientRect();
    const destino = panel.getBoundingClientRect();
    const enOrigen = geometriaDe(origen, getComputedStyle(this.compacta.nativeElement).borderRadius || '0px');
    const enDestino = geometriaDe(destino, getComputedStyle(panel).borderRadius || '0px');

    this.fijarPanel(panel, interior, destino);
    const movimiento = panel.animate(abriendo ? [enOrigen, enDestino] : [enDestino, enOrigen], {
      duration: DURACION_LAYOUT_MS,
      easing: CURVA_LAYOUT,
      fill: abriendo ? 'none' : 'forwards',
    });
    const salida = abriendo ? DURACION_FUNDIDO_MS : DURACION_SALIDA_CONTENIDO_MS;
    const apagados = [
      this.fundir(capa.querySelector('.tarjeta-expandible__fondo'), abriendo, DURACION_FUNDIDO_MS),
      this.fundir(interior, abriendo, salida),
      this.fundir(capa.querySelector('.tarjeta-expandible__cerrar'), abriendo, abriendo ? DURACION_FUNDIDO_MS : DURACION_SALIDA_BOTON_MS),
    ];
    this.enCurso = [movimiento, ...apagados.filter((a): a is Animation => !!a)];

    // Cancelar el movimiento (p. ej. cerrar mientras se abre) cuenta como un final: solo la animación vigente limpia.
    alAcabarAnimacion(movimiento, () => {
      if (abriendo && generacion === this.generacion) this.limpiarPanel(panel, interior);
      alTerminar?.();
    });
  }

  /** Congela el panel en su rectángulo final con estilos en línea, sin transiciones de CSS que compitan. */
  private fijarPanel(panel: HTMLElement, interior: HTMLElement, destino: DOMRect): void {
    const estilo = panel.style;
    estilo.position = 'fixed';
    estilo.margin = '0';
    estilo.maxWidth = 'none';
    estilo.maxHeight = 'none';
    estilo.transition = 'none';
    estilo.left = `${destino.left}px`;
    estilo.top = `${destino.top}px`;
    estilo.width = `${destino.width}px`;
    estilo.height = `${destino.height}px`;
    // El contenido conserva su tamaño final durante la animación para que el texto no se reacomode.
    interior.style.width = `${destino.width}px`;
    interior.style.height = `${destino.height}px`;
    interior.style.flex = 'none';
  }

  private limpiarPanel(panel: HTMLElement, interior: HTMLElement): void {
    for (const propiedad of PROPIEDADES_ANIMADAS) panel.style.removeProperty(propiedad);
    interior.style.removeProperty('width');
    interior.style.removeProperty('height');
    interior.style.removeProperty('flex');
  }

  private cancelarAnimaciones(): void {
    for (const animacion of this.enCurso.splice(0)) animacion.cancel();
  }

  private fundir(elemento: Element | null, entrando: boolean, duracion: number): Animation | undefined {
    return elemento?.animate(entrando ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], {
      duration: duracion,
      easing: 'ease-out',
      fill: entrando ? 'none' : 'forwards',
    });
  }

  private reducirMovimiento(): boolean {
    return this.doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
