import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SharedModule } from './../shared.module';
import { ImagenBounce } from './bounce-cards.component';

const FOTOS: ImagenBounce[] = [
  { src: 'data:image/jpeg;base64,A', alt: 'Foto 1' },
  { src: 'data:image/jpeg;base64,B', alt: 'Foto 2' },
  { src: 'data:image/jpeg;base64,C', alt: 'Foto 3' },
];

@Component({
  imports: [SharedModule],
  template: `
    <app-bounce-cards [images]="imagenes()" (cardClick)="clics.push($event)"></app-bounce-cards>
  `,
})
class ConClicComponent {
  imagenes = signal<ImagenBounce[]>(FOTOS);
  clics: number[] = [];
}

@Component({
  imports: [SharedModule],
  template: `<app-bounce-cards [images]="imagenes" [enableHover]="hover" [shadow]="sombra"></app-bounce-cards>`,
})
class SimpleComponent {
  imagenes: ImagenBounce[] = FOTOS;
  hover = true;
  sombra = true;
}

describe('BounceCardsComponent', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
    await TestBed.configureTestingModule({ imports: [ConClicComponent, SimpleComponent] }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('con cardClick', () => {
    let fixture: ComponentFixture<ConClicComponent>;
    const raiz = (): HTMLElement => fixture.nativeElement;
    const cartas = (): HTMLElement[] => Array.from(raiz().querySelectorAll('.bounce-cards__card'));
    const conjunto = (): HTMLElement => raiz().querySelector('.bounce-cards')!;
    const anfitrion = (): ConClicComponent => fixture.componentInstance;
    const pasar = (ms: number): void => {
      vi.advanceTimersByTime(ms);
    };

    function crear(imagenes: ImagenBounce[] = FOTOS): void {
      fixture = TestBed.createComponent(ConClicComponent);
      fixture.componentInstance.imagenes.set(imagenes);
      fixture.detectChanges();
    }

    /** jsdom no calcula posiciones: el conjunto mide 0, así que clientX/clientY ya son relativos al centro. */
    const evento = (destino: Element, tipo: string, x = 0, y = 0): void => {
      destino.dispatchEvent(new MouseEvent(tipo, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
    };

    describe('cantidad de fotos', () => {
      it.each([0, 1, 2, 3])('dibuja %s tarjeta(s) con su imagen', (cuantas) => {
        crear(FOTOS.slice(0, cuantas));

        expect(cartas()).toHaveLength(cuantas);
        const imagenes = Array.from(raiz().querySelectorAll('.bounce-cards__card img')) as HTMLImageElement[];
        expect(imagenes.map((i) => i.alt)).toEqual(FOTOS.slice(0, cuantas).map((f) => f.alt));
        expect(imagenes.map((i) => i.getAttribute('src'))).toEqual(FOTOS.slice(0, cuantas).map((f) => f.src));
      });

      it('con una sola foto queda una carta centrada', () => {
        crear(FOTOS.slice(0, 1));
        pasar(3000);
        expect(cartas()[0].style.transform).toContain('translate3d(0.00px');
      });

      it('con tres fotos forman un abanico', () => {
        crear();
        pasar(3000);
        expect(cartas().map((c) => /translate3d\(([-\d.]+)px/.exec(c.style.transform)![1])).toEqual(['-85.00', '0.00', '85.00']);
      });

      it('sin fotos no falla ni deja cuadros pendientes', () => {
        expect(() => crear([])).not.toThrow();
        pasar(3000);
        expect(cartas()).toHaveLength(0);
      });
    });

    describe('aspecto', () => {
      it('aplica los valores pedidos: tamaño, borde blanco, radio y sombra', () => {
        crear();
        const estilo = conjunto().style;
        expect(estilo.width).toBe('500px');
        expect(estilo.height).toBe('320px');
        expect(estilo.getPropertyValue('--bounce-cards-size')).toBe('200px');
        expect(estilo.getPropertyValue('--bounce-cards-border')).toBe('5px');
        expect(estilo.getPropertyValue('--bounce-cards-border-color')).toBe('#ffffff');
        expect(estilo.getPropertyValue('--bounce-cards-radius')).toBe('25px');
        expect(estilo.getPropertyValue('--bounce-cards-shadow')).toContain('--bounce-cards-sombra');
      });

      it('las tarjetas aparecen con rebote, escalonadas', () => {
        crear();
        pasar(200);
        expect(cartas()[0].style.transform).toContain('scale(0.0000)');

        pasar(2500);
        cartas().forEach((c) => expect(Number(/scale\(([\d.]+)\)/.exec(c.style.transform)![1])).toBeCloseTo(1, 1));
      });

    });

    describe('hover y teclado', () => {
      it('al pasar el cursor, la carta de abajo se activa, se endereza y las demás se apartan', () => {
        crear();
        pasar(3000);

        evento(conjunto(), 'pointermove', 0, 0);
        pasar(1500);

        expect(cartas()[1].hasAttribute('data-active')).toBe(true);
        expect(cartas()[1].style.zIndex).toBe('4');
        expect(cartas()[1].style.transform).toMatch(/rotate\(-?0\.000deg\)/);
        // Se aparta poco (50 px) y sin salirse del contenedor.
        expect(Number(/translate3d\(([-\d.]+)px/.exec(cartas()[0].style.transform)![1])).toBeCloseTo(-134.1, 0);
      });

      it('al salir el cursor todo vuelve a su lugar', () => {
        crear();
        pasar(3000);
        evento(conjunto(), 'pointermove', 0, 0);
        pasar(1500);

        evento(conjunto(), 'pointerleave');
        pasar(1500);

        expect(cartas().some((c) => c.hasAttribute('data-active'))).toBe(false);
        expect(/translate3d\(([-\d.]+)px/.exec(cartas()[0].style.transform)![1]).toBe('-85.00');
      });

      it('tocar (pointerdown) también activa la carta', () => {
        crear();
        pasar(3000);
        evento(conjunto(), 'pointerdown', 85, 0);
        pasar(1500);
        expect(cartas()[2].hasAttribute('data-active')).toBe(true);
      });

      it('el foco del teclado (también sobre algo dentro de la carta) activa esa carta', () => {
        crear();
        pasar(3000);

        cartas()[0].querySelector('img')!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        pasar(1500);
        expect(cartas()[0].hasAttribute('data-active')).toBe(true);

        conjunto().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
        pasar(1500);
        expect(cartas()[0].hasAttribute('data-active')).toBe(false);
      });

      it('el foco fuera de las cartas no activa ninguna', () => {
        crear();
        pasar(3000);
        conjunto().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        pasar(500);
        expect(cartas().some((c) => c.hasAttribute('data-active'))).toBe(false);
      });
    });

    describe('cardClick', () => {
      it('las cartas son botones accesibles cuando alguien escucha cardClick', () => {
        crear();
        expect(cartas().map((c) => c.getAttribute('role'))).toEqual(['button', 'button', 'button']);
        expect(cartas().map((c) => c.getAttribute('tabindex'))).toEqual(['0', '0', '0']);
        expect(cartas().map((c) => c.getAttribute('aria-label'))).toEqual(['Foto 1', 'Foto 2', 'Foto 3']);
      });

      it('sin alt usa "Carta n" como nombre', () => {
        crear([{ src: 'data:image/jpeg;base64,A' }]);
        expect(cartas()[0].getAttribute('aria-label')).toBe('Carta 1');
      });

      it('al pulsar una carta avisa su índice', () => {
        crear();
        pasar(3000);

        evento(conjunto(), 'click', 85, 0);
        evento(conjunto(), 'click', -85, 0);

        expect(anfitrion().clics).toEqual([2, 0]);
      });

      it('pulsar fuera de las cartas no avisa nada', () => {
        crear();
        evento(conjunto(), 'click', 0, 250);
        expect(anfitrion().clics).toEqual([]);
      });

      it('Enter y espacio sobre una carta la activan', () => {
        crear();
        const tecla = (key: string): KeyboardEvent => {
          const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
          cartas()[1].dispatchEvent(e);
          return e;
        };

        expect(tecla('Enter').defaultPrevented).toBe(true);
        tecla(' ');
        const otra = tecla('a');

        expect(anfitrion().clics).toEqual([1, 1]);
        expect(otra.defaultPrevented).toBe(false);
      });

      it('Enter sobre algo dentro de la carta (no la carta misma) no cuenta como pulsarla', () => {
        crear();
        cartas()[1].querySelector('img')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(anfitrion().clics).toEqual([]);
      });
    });

    describe('ajuste al ancho disponible', () => {
      const anchoDisponible = (ancho: number): void => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(ancho);
      };

      it('si no cabe, escala todo el conjunto en vez de cortarlo, y reduce el alto del contenedor', () => {
        anchoDisponible(250);
        crear();

        expect(conjunto().style.transform).toBe('translateX(-50%) scale(0.5000)');
        expect((raiz().querySelector('.bounce-cards-ajuste') as HTMLElement).style.height).toBe('160px');
      });

      it('si sobra espacio, no lo agranda', () => {
        anchoDisponible(900);
        crear();

        expect(conjunto().style.transform).toBe('translateX(-50%) scale(1.0000)');
        expect((raiz().querySelector('.bounce-cards-ajuste') as HTMLElement).style.height).toBe('320px');
      });

      it('al escalar, el cursor se interpreta en las medidas originales', () => {
        anchoDisponible(250);
        crear();
        pasar(3000);

        // 42.5 px en pantalla equivalen a 85 px del conjunto: la tercera carta.
        evento(conjunto(), 'click', 42.5, 0);

        expect(anfitrion().clics).toEqual([2]);
      });

      it('sin ancho medido (entorno de pruebas) usa el tamaño original', () => {
        crear();
        expect(conjunto().style.transform).toBe('translateX(-50%) scale(1.0000)');
      });
    });

    describe('al cambiar la cantidad de fotos', () => {
      const hacerHover = (): void => {
        evento(conjunto(), 'pointermove', 0, 0);
        pasar(1500);
      };
      const activas = (): number => cartas().filter((c) => c.hasAttribute('data-active')).length;

      it('tras quitar una foto no queda ninguna carta activa, aunque el cursor siga encima', () => {
        crear();
        pasar(3000);
        hacerHover();
        expect(activas()).toBe(1);

        anfitrion().imagenes.set(FOTOS.slice(0, 2));
        fixture.detectChanges();
        pasar(3000);

        expect(activas()).toBe(0);
      });

      it('un movimiento falso del cursor (mismo punto) no reactiva el hover', () => {
        crear();
        pasar(3000);
        hacerHover();
        anfitrion().imagenes.set(FOTOS.slice(0, 2));
        fixture.detectChanges();
        pasar(3000);

        evento(conjunto(), 'pointermove', 0, 0);
        pasar(1500);

        expect(activas()).toBe(0);
      });

      it('cuando el cursor se mueve de verdad, el hover vuelve', () => {
        crear();
        pasar(3000);
        hacerHover();
        anfitrion().imagenes.set(FOTOS.slice(0, 2));
        fixture.detectChanges();
        pasar(3000);

        evento(conjunto(), 'pointermove', 20, 0);
        pasar(1500);

        expect(activas()).toBe(1);
      });

      it('un toque sí activa la carta aunque sea en el mismo punto', () => {
        crear();
        pasar(3000);
        hacerHover();
        anfitrion().imagenes.set(FOTOS.slice(0, 2));
        fixture.detectChanges();
        pasar(3000);

        evento(conjunto(), 'pointerdown', 0, 0);
        pasar(1500);

        expect(activas()).toBe(1);
      });

      it('si el cursor nunca se había movido, el primer movimiento funciona normal', () => {
        crear();
        pasar(3000);
        anfitrion().imagenes.set(FOTOS.slice(0, 2));
        fixture.detectChanges();
        pasar(3000);

        evento(conjunto(), 'pointermove', 0, 0);
        pasar(1500);

        expect(activas()).toBe(1);
      });

      it('las cartas restantes se reacomodan y luego quedan quietas', () => {
        crear();
        pasar(3000);
        hacerHover();

        anfitrion().imagenes.set(FOTOS.slice(0, 2));
        fixture.detectChanges();
        pasar(4000);

        expect(cartas().map((c) => Number(/translate3d\(([-\d.]+)px/.exec(c.style.transform)![1]))[0]).toBeCloseTo(-42.5, 0);
        expect(vi.getTimerCount()).toBe(0);
      });

      it('al agregar una foto también se apaga el hover', () => {
        crear(FOTOS.slice(0, 2));
        pasar(3000);
        hacerHover();

        anfitrion().imagenes.set(FOTOS);
        fixture.detectChanges();
        pasar(3000);

        expect(activas()).toBe(0);
      });
    });

    describe('cambio de fotos', () => {
      it('al agregar o quitar fotos se redibuja y sigue funcionando', () => {
        crear(FOTOS.slice(0, 2));
        pasar(3000);

        anfitrion().imagenes.set(FOTOS);
        fixture.detectChanges();
        pasar(3000);
        expect(cartas()).toHaveLength(3);
        expect(/translate3d\(([-\d.]+)px/.exec(cartas()[2].style.transform)![1]).toBe('85.00');

        anfitrion().imagenes.set(FOTOS.slice(0, 1));
        fixture.detectChanges();
        pasar(3000);
        expect(cartas()).toHaveLength(1);
        expect(/translate3d\(([-\d.]+)px/.exec(cartas()[0].style.transform)![1]).toBe('0.00');
      });
    });

    describe('entornos sin API de animación', () => {
      it('funciona sin ResizeObserver', () => {
        expect(typeof ResizeObserver).toBe('undefined');
        expect(() => crear()).not.toThrow();
      });

      it('con movimiento reducido las tarjetas aparecen de una vez', () => {
        vi.stubGlobal('matchMedia', () => ({ matches: true }));
        crear();
        pasar(50);
        cartas().forEach((c) => expect(c.style.transform).toContain('scale(1.0000)'));
      });

      it('con ResizeObserver, reajusta al cambiar el tamaño y lo desconecta al destruirse', () => {
        let alCambiar!: () => void;
        const desconectar = vi.fn();
        const observar = vi.fn();
        vi.stubGlobal(
          'ResizeObserver',
          class {
            constructor(callback: () => void) {
              alCambiar = callback;
            }
            observe = observar;
            disconnect = desconectar;
          }
        );
        const ancho = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(500);
        crear();
        expect(observar).toHaveBeenCalledTimes(1);

        ancho.mockReturnValue(100);
        alCambiar();
        expect(conjunto().style.transform).toBe('translateX(-50%) scale(0.2000)');

        fixture.destroy();
        expect(desconectar).toHaveBeenCalledTimes(1);
      });
    });

    describe('limpieza al destruirse', () => {
      it('cancela el cuadro pendiente y quita todos los listeners', () => {
        crear();
        const cancelar = vi.spyOn(window, 'cancelAnimationFrame');
        const quitar = vi.spyOn(conjunto(), 'removeEventListener');

        fixture.destroy();

        expect(cancelar).toHaveBeenCalled();
        expect(quitar.mock.calls.map((c) => c[0]).sort()).toEqual(
          ['click', 'focusin', 'focusout', 'keydown', 'pointerdown', 'pointerleave', 'pointermove'].sort()
        );
      });

      it('después de destruirse no quedan cuadros ni temporizadores', () => {
        crear();
        evento(conjunto(), 'pointermove', 0, 0);
        fixture.destroy();

        pasar(10_000);

        expect(vi.getTimerCount()).toBe(0);
      });

      it('un evento que llega tarde no rompe nada', () => {
        crear();
        const destino = conjunto();
        fixture.destroy();
        expect(() => evento(destino, 'pointermove', 0, 0)).not.toThrow();
      });
    });
  });

  describe('sin cardClick', () => {
    it('sin sombra, quita la sombra de las tarjetas', () => {
      const fixture = TestBed.createComponent(SimpleComponent);
      fixture.componentInstance.sombra = false;
      fixture.detectChanges();

      const conjunto = fixture.nativeElement.querySelector('.bounce-cards') as HTMLElement;
      expect(conjunto.style.getPropertyValue('--bounce-cards-shadow')).toBe('none');
      expect(conjunto.style.getPropertyValue('--bounce-cards-shadow-active')).toBe('none');
    });

    it('las tarjetas no son botones ni se pueden enfocar (solo el botón de adentro)', () => {
      const fixture = TestBed.createComponent(SimpleComponent);
      fixture.detectChanges();
      const carta = fixture.nativeElement.querySelector('.bounce-cards__card') as HTMLElement;
      expect(carta.getAttribute('role')).toBeNull();
      expect(carta.getAttribute('tabindex')).toBeNull();
      expect(carta.classList).not.toContain('bounce-cards__card--clickable');
    });

    it('con enableHover apagado el cursor no activa nada', () => {
      const fixture = TestBed.createComponent(SimpleComponent);
      fixture.componentInstance.hover = false;
      fixture.detectChanges();
      vi.advanceTimersByTime(3000);

      const conjunto = fixture.nativeElement.querySelector('.bounce-cards') as HTMLElement;
      conjunto.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 0, clientY: 0 }));
      vi.advanceTimersByTime(1500);

      expect(fixture.nativeElement.querySelector('[data-active]')).toBeNull();
    });
  });
});
