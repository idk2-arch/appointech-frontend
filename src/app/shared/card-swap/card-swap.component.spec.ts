import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SharedModule } from '../shared.module';
import { CardSwapComponent, ItemCardSwap } from './card-swap.component';

const ITEMS: ItemCardSwap[] = [
  { title: 'Foto 1', imageUrl: 'blob:uno', alt: 'Primera' },
  { title: 'Foto 2', imageUrl: 'blob:dos', alt: 'Segunda' },
  { title: 'Foto 3', imageUrl: 'blob:tres', alt: 'Tercera' },
];

describe('CardSwapComponent', () => {
  let fixture: ComponentFixture<CardSwapComponent>;
  let cambios: number[];
  let clics: number[];

  const raiz = (): HTMLElement => fixture.nativeElement.querySelector('.card-swap');
  const ranuras = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('.card-swap-slot'));
  const frente = (): number => ranuras().findIndex((r) => r.hasAttribute('data-front'));

  /** jsdom no tiene PointerEvent: un MouseEvent con el mismo nombre llega a los mismos manejadores. */
  const puntero = (destino: Element, tipo: string, datos: MouseEventInit = {}): void => {
    destino.dispatchEvent(new MouseEvent(tipo, { bubbles: true, cancelable: true, ...datos }));
  };

  function crear(items: ItemCardSwap[] = ITEMS, entradas: Record<string, unknown> = {}): void {
    fixture = TestBed.createComponent(CardSwapComponent);
    fixture.componentRef.setInput('items', items);
    for (const [clave, valor] of Object.entries(entradas)) fixture.componentRef.setInput(clave, valor);
    cambios = [];
    clics = [];
    fixture.componentInstance.frontChange.subscribe((i) => cambios.push(i));
    fixture.componentInstance.cardClick.subscribe((i) => clics.push(i));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
    await TestBed.configureTestingModule({ imports: [SharedModule] }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('con varias fotos', () => {
    it('dibuja una carta por foto, con su imagen y su texto alternativo', () => {
      crear();

      expect(ranuras()).toHaveLength(3);
      const imagenes = Array.from(fixture.nativeElement.querySelectorAll('img')) as HTMLImageElement[];
      expect(imagenes.map((i) => i.alt)).toEqual(['Primera', 'Segunda', 'Tercera']);
      expect(imagenes.map((i) => i.getAttribute('src'))).toEqual(['blob:uno', 'blob:dos', 'blob:tres']);
      expect(raiz().getAttribute('role')).toBe('region');
      // El contenedor no es enfocable: lo es la carta del frente.
      expect(raiz().hasAttribute('tabindex')).toBe(false);
    });

    it('la primera carta empieza al frente', () => {
      crear();
      vi.advanceTimersByTime(100);
      expect(frente()).toBe(0);
    });

    it('con autoplay pasa a la siguiente carta cada 4 segundos', () => {
      crear(ITEMS, { delay: 4000 });

      vi.advanceTimersByTime(3900);
      expect(cambios).toEqual([]);
      vi.advanceTimersByTime(200);
      expect(cambios).toEqual([1]);

      vi.advanceTimersByTime(4000);
      expect(cambios).toEqual([1, 2]);
    });

    it('sin autoplay no cambia sola', () => {
      crear(ITEMS, { autoplay: false });
      vi.advanceTimersByTime(20_000);
      expect(cambios).toEqual([]);
    });

    it('se pausa mientras el cursor está sobre una carta y sigue al salir', () => {
      crear();
      puntero(ranuras()[0], 'pointermove', { clientX: 10, clientY: 10 });

      vi.advanceTimersByTime(20_000);
      expect(cambios).toEqual([]);

      puntero(raiz(), 'pointerleave');
      vi.advanceTimersByTime(4100);
      expect(cambios).toEqual([1]);
    });

    it('con pauseOnHover desactivado sigue aunque el cursor esté encima', () => {
      crear(ITEMS, { pauseOnHover: false });
      puntero(ranuras()[0], 'pointermove', { clientX: 10, clientY: 10 });
      vi.advanceTimersByTime(4100);
      expect(cambios).toEqual([1]);
    });

    it('las flechas del teclado avanzan y retroceden', () => {
      crear(ITEMS, { autoplay: false });

      raiz().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(cambios).toEqual([1]);
      raiz().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(cambios).toEqual([1, 2]);
      raiz().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      raiz().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(cambios).toEqual([1, 2, 1, 0]);

      raiz().dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      expect(cambios).toHaveLength(4);
    });

    it('next() y prev() son públicos', () => {
      crear(ITEMS, { autoplay: false });
      fixture.componentInstance.next();
      fixture.componentInstance.next();
      fixture.componentInstance.prev();
      expect(cambios).toEqual([1, 2, 1]);
    });

    it('pulsar la carta del frente solo avisa', () => {
      crear(ITEMS, { autoplay: false });
      ranuras()[0].click();
      vi.advanceTimersByTime(1000);
      expect(clics).toEqual([0]);
      expect(cambios).toEqual([]);
    });

    it('pulsar una carta de atrás la trae al frente', () => {
      crear(ITEMS, { autoplay: false });
      ranuras()[2].click();
      vi.advanceTimersByTime(1000);

      expect(clics).toEqual([2]);
      expect(cambios).toEqual([1, 2]);
    });

    it('arrastrar la carta del frente lejos la lanza y no cuenta como clic', () => {
      crear(ITEMS, { autoplay: false });
      puntero(ranuras()[0], 'pointerdown', { clientX: 0, clientY: 0, button: 0 });
      puntero(ranuras()[0], 'pointermove', { clientX: 150, clientY: 10 });
      vi.advanceTimersByTime(300);
      puntero(ranuras()[0], 'pointermove', { clientX: 220, clientY: 10 });
      puntero(ranuras()[0], 'pointerup', { clientX: 220, clientY: 10 });
      ranuras()[0].click();

      expect(cambios).toEqual([1]);
      expect(clics).toEqual([]);
    });

    it('cancelar el arrastre deja la carta donde estaba', () => {
      crear(ITEMS, { autoplay: false });
      puntero(ranuras()[0], 'pointerdown', { clientX: 0, clientY: 0, button: 0 });
      puntero(ranuras()[0], 'pointermove', { clientX: 300, clientY: 0 });
      puntero(ranuras()[0], 'pointercancel');

      expect(cambios).toEqual([]);
    });

    it('con draggable apagado el arrastre no hace nada', () => {
      crear(ITEMS, { autoplay: false, draggable: false });
      puntero(ranuras()[0], 'pointerdown', { clientX: 0, clientY: 0, button: 0 });
      puntero(ranuras()[0], 'pointermove', { clientX: 300, clientY: 0 });
      puntero(ranuras()[0], 'pointerup');
      expect(cambios).toEqual([]);
    });

    it('un toque sin mover cuenta como clic y no como arrastre', () => {
      crear(ITEMS, { autoplay: false });
      puntero(ranuras()[0], 'pointerdown', { clientX: 5, clientY: 5, button: 0 });
      puntero(ranuras()[0], 'pointerup', { clientX: 5, clientY: 5 });
      ranuras()[0].click();
      expect(clics).toEqual([0]);
    });

    it('al recibir una cantidad distinta de fotos se rearma la pila', () => {
      crear(ITEMS, { autoplay: false });

      fixture.componentRef.setInput('items', ITEMS.slice(0, 2));
      fixture.detectChanges();
      vi.advanceTimersByTime(100);

      expect(ranuras()).toHaveLength(2);
      fixture.componentInstance.next();
      expect(cambios).toEqual([1]);
    });

    it('cambiar solo las imágenes (misma cantidad) no reinicia la pila', () => {
      crear(ITEMS, { autoplay: false });
      fixture.componentInstance.next();

      fixture.componentRef.setInput('items', ITEMS.map((i) => ({ ...i, imageUrl: i.imageUrl + '2' })));
      fixture.detectChanges();

      expect(frente()).toBe(1);
    });
  });

  describe('accesibilidad con teclado', () => {
    it('cada carta es un botón con nombre; solo la del frente entra en el orden del teclado', () => {
      crear(ITEMS, { autoplay: false });

      expect(ranuras().map((r) => r.getAttribute('role'))).toEqual(['button', 'button', 'button']);
      expect(ranuras().map((r) => r.getAttribute('aria-label'))).toEqual(['Primera', 'Segunda', 'Tercera']);
      expect(ranuras().map((r) => r.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    });

    it('sin alt usa el título y, si tampoco hay, un nombre con el número', () => {
      crear([{ imageUrl: 'blob:a', title: 'Foto A' }, { imageUrl: 'blob:b' }], { autoplay: false });
      expect(ranuras().map((r) => r.getAttribute('aria-label'))).toEqual(['Foto A', 'Foto 2']);
    });

    it('el tabindex acompaña a la carta que queda al frente', () => {
      crear(ITEMS, { autoplay: false });

      fixture.componentInstance.next();
      vi.advanceTimersByTime(100);

      expect(ranuras().map((r) => r.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    });

    it('si el foco estaba en la pila, pasa a la carta que queda al frente', () => {
      crear(ITEMS, { autoplay: false });
      ranuras()[0].focus();

      raiz().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

      expect(document.activeElement).toBe(ranuras()[1]);
    });

    it('si el foco está fuera de la pila, no se lo roba', () => {
      const otro = document.createElement('button');
      document.body.appendChild(otro);
      crear(ITEMS, { autoplay: false });
      otro.focus();

      fixture.componentInstance.next();

      expect(document.activeElement).toBe(otro);
      otro.remove();
    });

    it('Enter sobre la carta del frente avisa cardClick', () => {
      crear(ITEMS, { autoplay: false });
      const evento = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });

      ranuras()[0].dispatchEvent(evento);

      expect(clics).toEqual([0]);
      expect(evento.defaultPrevented).toBe(true);
    });

    it('la barra espaciadora también activa la carta', () => {
      crear(ITEMS, { autoplay: false });
      ranuras()[0].dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
      expect(clics).toEqual([0]);
    });

    it('Enter sobre una carta de atrás la trae al frente', () => {
      crear(ITEMS, { autoplay: false });
      ranuras()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      vi.advanceTimersByTime(1000);

      expect(clics).toEqual([2]);
      expect(cambios).toEqual([1, 2]);
    });

    it('Enter sobre algo dentro de la carta (no la carta misma) no hace nada', () => {
      crear(ITEMS, { autoplay: false });
      ranuras()[0].querySelector('img')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      expect(clics).toEqual([]);
    });

    it('Enter sobre el contenedor (sin carta) no hace nada', () => {
      crear(ITEMS, { autoplay: false });
      raiz().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      expect(clics).toEqual([]);
    });
  });

  describe('con una sola foto', () => {
    it('muestra la carta fija: sin autoplay, sin teclado y sin arrastre', () => {
      const temporizador = vi.spyOn(window, 'setTimeout');
      crear([ITEMS[0]]);

      vi.advanceTimersByTime(30_000);
      raiz().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      puntero(ranuras()[0], 'pointerdown', { clientX: 0, clientY: 0, button: 0 });
      puntero(ranuras()[0], 'pointermove', { clientX: 300, clientY: 0 });
      puntero(ranuras()[0], 'pointerup');

      expect(ranuras()).toHaveLength(1);
      expect(cambios).toEqual([]);
      expect(frente()).toBe(0);
      expect(temporizador.mock.calls.filter(([, espera]) => Number(espera) >= 400)).toHaveLength(0);
    });

    it('sigue avisando cuando se pulsa la carta', () => {
      crear([ITEMS[0]]);
      ranuras()[0].click();
      expect(clics).toEqual([0]);
    });

    it('la carta es un botón enfocable y Enter la activa', () => {
      crear([ITEMS[0]]);
      expect(ranuras()[0].getAttribute('role')).toBe('button');
      expect(ranuras()[0].getAttribute('tabindex')).toBe('0');

      ranuras()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      expect(clics).toEqual([0]);
    });
  });

  describe('sin fotos', () => {
    it('no dibuja cartas ni programa nada', () => {
      crear([]);
      expect(ranuras()).toHaveLength(0);
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('entornos sin observadores ni animate', () => {
    it('funciona sin ResizeObserver, IntersectionObserver ni element.animate', () => {
      expect(typeof ResizeObserver).toBe('undefined');
      expect(typeof IntersectionObserver).toBe('undefined');
      expect(() => crear()).not.toThrow();
      vi.advanceTimersByTime(4100);
      expect(cambios).toEqual([1]);
    });

    it('usa animate para la entrada si el navegador lo trae', () => {
      const animate = vi.fn();
      Element.prototype.animate = animate;
      try {
        crear();
        expect(animate).toHaveBeenCalledTimes(1);
      } finally {
        delete (Element.prototype as { animate?: unknown }).animate;
      }
    });

    it('con movimiento reducido no anima la entrada', () => {
      const animate = vi.fn();
      Element.prototype.animate = animate;
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
      try {
        crear();
        expect(animate).not.toHaveBeenCalled();
      } finally {
        delete (Element.prototype as { animate?: unknown }).animate;
      }
    });
  });

  describe('con observadores', () => {
    let desconectados: string[];
    let dispararInterseccion: (visible: boolean) => void;

    beforeEach(() => {
      desconectados = [];
      class ResizeFalso {
        observe(): void {}
        disconnect(): void {
          desconectados.push('resize');
        }
      }
      class InterseccionFalsa {
        constructor(private alCambiar: (e: { isIntersecting: boolean }[]) => void) {
          dispararInterseccion = (visible) => this.alCambiar([{ isIntersecting: visible }]);
        }
        observe(): void {}
        disconnect(): void {
          desconectados.push('interseccion');
        }
      }
      vi.stubGlobal('ResizeObserver', ResizeFalso);
      vi.stubGlobal('IntersectionObserver', InterseccionFalsa);
    });

    it('se pausa cuando sale de la pantalla y sigue al volver', () => {
      crear();

      dispararInterseccion(false);
      vi.advanceTimersByTime(20_000);
      expect(cambios).toEqual([]);

      dispararInterseccion(true);
      vi.advanceTimersByTime(4100);
      expect(cambios).toEqual([1]);
    });

    it('desconecta ambos observadores al destruirse', () => {
      crear();
      fixture.destroy();
      expect(desconectados.sort()).toEqual(['interseccion', 'resize']);
    });
  });

  describe('limpieza al destruirse', () => {
    it('cancela la animación, los temporizadores y los listeners', () => {
      crear();
      const cancelar = vi.spyOn(window, 'cancelAnimationFrame');
      const limpiarTemporizador = vi.spyOn(window, 'clearTimeout');
      const quitarEnRaiz = vi.spyOn(raiz(), 'removeEventListener');
      const quitarEnDocumento = vi.spyOn(document, 'removeEventListener');

      fixture.destroy();

      expect(cancelar).toHaveBeenCalled();
      expect(limpiarTemporizador).toHaveBeenCalled();
      expect(quitarEnRaiz.mock.calls.map((c) => c[0])).toEqual(
        expect.arrayContaining(['click', 'pointercancel', 'pointerdown', 'pointerleave', 'pointermove', 'pointerup'])
      );
      expect(quitarEnDocumento.mock.calls.map((c) => c[0])).toContain('visibilitychange');
    });

    it('después de destruirse no quedan temporizadores ni avisos pendientes', () => {
      crear();
      ranuras()[2].click();
      fixture.destroy();
      const avisos = cambios.length;

      vi.advanceTimersByTime(60_000);

      expect(cambios).toHaveLength(avisos);
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
