import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { SharedModule } from '../shared.module';
import { BibliotecaOgl, GradientWavesComponent, OGL } from './gradient-waves.component';

/** WebGL no existe en las pruebas: se inyectan clases falsas que solo registran lo que se les pide. */
const ogl = {
  renderers: [] as {
    opciones: Record<string, unknown>;
    gl: { canvas: HTMLCanvasElement; drawingBufferWidth: number; drawingBufferHeight: number; clearColor: () => void; getExtension: () => unknown };
    setSize: Mock;
    render: Mock;
  }[],
  programas: [] as { uniforms: Record<string, { value: unknown }> }[],
  perderContexto: (() => undefined) as () => void,
  fallar: false,
};

class RendererFalso {
  opciones: Record<string, unknown>;
  gl = {
    canvas: document.createElement('canvas'),
    drawingBufferWidth: 640,
    drawingBufferHeight: 480,
    clearColor: vi.fn(),
    getExtension: vi.fn(() => ({ loseContext: ogl.perderContexto })),
  };
  setSize = vi.fn();
  render = vi.fn();
  constructor(opciones: Record<string, unknown>) {
    if (ogl.fallar) throw new Error('WebGL2 no disponible');
    this.opciones = opciones;
    ogl.renderers.push(this);
  }
}

class ProgramFalso {
  uniforms: Record<string, { value: unknown }>;
  constructor(_gl: unknown, opciones: { uniforms: Record<string, { value: unknown }> }) {
    this.uniforms = opciones.uniforms;
    ogl.programas.push(this);
  }
}

const BIBLIOTECA_FALSA = { Renderer: RendererFalso, Program: ProgramFalso, Mesh: class {}, Triangle: class {} } as unknown as BibliotecaOgl;

describe('GradientWavesComponent', () => {
  let fixture: ComponentFixture<GradientWavesComponent>;
  let alCambiarTamano: () => void;
  let alInterseccion: (entradas: { isIntersecting: boolean }[]) => void;
  let desconexiones: string[];

  const contenedor = (): HTMLElement => fixture.nativeElement.querySelector('.gradient-waves-container');
  const renderer = (): (typeof ogl.renderers)[number] => ogl.renderers[0];
  const uniforms = (): Record<string, { value: unknown }> => ogl.programas[0].uniforms;

  function crear(entradas: Record<string, unknown> = {}): void {
    fixture = TestBed.createComponent(GradientWavesComponent);
    for (const [clave, valor] of Object.entries(entradas)) fixture.componentRef.setInput(clave, valor);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    ogl.renderers.length = 0;
    ogl.programas.length = 0;
    ogl.fallar = false;
    ogl.perderContexto = vi.fn();
    desconexiones = [];

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          alCambiarTamano = callback;
        }
        observe = vi.fn();
        disconnect = () => desconexiones.push('resize');
      }
    );
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: typeof alInterseccion) {
          alInterseccion = callback;
        }
        observe = vi.fn();
        disconnect = () => desconexiones.push('interseccion');
      }
    );
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [{ provide: OGL, useValue: BIBLIOTECA_FALSA }],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('arranque', () => {
    it('crea el renderizador WebGL2 y pone su canvas a llenar el contenedor', () => {
      crear();

      expect(renderer().opciones).toMatchObject({ webgl: 2, alpha: true, antialias: false });
      const canvas = contenedor().querySelector('canvas')!;
      expect(canvas).toBe(renderer().gl.canvas);
      expect(canvas.style.width).toBe('100%');
      expect(canvas.style.height).toBe('100%');
      expect(canvas.style.display).toBe('block');
    });

    it('limita la densidad de píxeles a 2', () => {
      vi.stubGlobal('devicePixelRatio', 3);
      crear();
      expect(renderer().opciones['dpr']).toBe(2);
    });

    it('usa la densidad del dispositivo si es menor que 2, y 1 si no se conoce', () => {
      vi.stubGlobal('devicePixelRatio', 1.5);
      crear();
      expect(renderer().opciones['dpr']).toBe(1.5);

      ogl.renderers.length = 0;
      vi.stubGlobal('devicePixelRatio', 0);
      crear();
      expect(renderer().opciones['dpr']).toBe(1);
    });

    it('pasa las entradas al shader como uniformes', () => {
      crear({ speed: 1.2, amplitude: 3, mouseInteraction: false, grain: false, parallaxStrength: 2 });

      expect(uniforms()['uSpeed'].value).toBe(1.2);
      expect(uniforms()['uAmplitude'].value).toBe(3);
      expect(uniforms()['uEnableMouse'].value).toBe(false);
      expect(uniforms()['uGrain'].value).toBe(0);
      expect(uniforms()['uParallax'].value).toBe(2);
    });

    it('con el grano activado el uniforme vale 1', () => {
      crear();
      expect(uniforms()['uGrain'].value).toBe(1);
    });

    it.each([
      ['low', 40],
      ['medium', 70],
      ['high', 110],
    ] as const)('el detalle "%s" usa %s pasos', (detalle, pasos) => {
      crear({ detail: detalle });
      expect(uniforms()['uSteps'].value).toBe(pasos);
    });

    it('convierte los colores hexadecimales a componentes entre 0 y 1', () => {
      crear({ horizonColor: '#ff0000', waveColor: '00ff00', crestColor: '#0000FF' });

      expect(Array.from(uniforms()['uHorizonColor'].value as Float32Array)).toEqual([1, 0, 0]);
      expect(Array.from(uniforms()['uWaveColor'].value as Float32Array)).toEqual([0, 1, 0]);
      expect(Array.from(uniforms()['uCrestColor'].value as Float32Array)).toEqual([0, 0, 1]);
    });

    it('un color inválido cae en blanco en vez de romper', () => {
      crear({ horizonColor: 'rojo' });
      expect(Array.from(uniforms()['uHorizonColor'].value as Float32Array)).toEqual([1, 1, 1]);
    });

    it('ajusta el tamaño al arrancar y cuando cambia el del contenedor', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 300.7, height: 150.2, left: 0, top: 0 } as DOMRect);
      crear();
      expect(renderer().setSize).toHaveBeenLastCalledWith(300, 150);
      expect(Array.from(uniforms()['iResolution'].value as Float32Array)).toEqual([640, 480]);

      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 0, height: 0, left: 0, top: 0 } as DOMRect);
      alCambiarTamano();
      expect(renderer().setSize).toHaveBeenLastCalledWith(1, 1);
    });
  });

  describe('animación', () => {
    it('dibuja un cuadro tras otro y avanza el tiempo del shader', () => {
      crear();
      const antes = ogl.renderers[0].render.mock.calls.length;

      vi.advanceTimersByTime(100);
      const t1 = uniforms()['iTime'].value as number;
      vi.advanceTimersByTime(100);

      expect(renderer().render.mock.calls.length).toBeGreaterThan(antes);
      expect(uniforms()['iTime'].value as number).toBeGreaterThan(t1);
    });

    it('el cursor mueve suavemente el fondo hacia su posición', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 200, height: 100, left: 0, top: 0 } as DOMRect);
      crear();

      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 200, clientY: 0 }));
      vi.advanceTimersByTime(2000);

      const mouse = uniforms()['uMouse'].value as Float32Array;
      expect(mouse[0]).toBeGreaterThan(0.9);
      expect(mouse[1]).toBeGreaterThan(0.9);
    });

    it('el cursor fuera del área se acota entre 0 y 1', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 200, height: 100, left: 0, top: 0 } as DOMRect);
      crear();

      window.dispatchEvent(new MouseEvent('pointermove', { clientX: -500, clientY: 900 }));
      vi.advanceTimersByTime(3000);

      const mouse = uniforms()['uMouse'].value as Float32Array;
      expect(mouse[0]).toBeLessThan(0.1);
      expect(mouse[1]).toBeLessThan(0.1);
    });

    it('al salir el cursor de la página, el fondo vuelve al centro', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 200, height: 100, left: 0, top: 0 } as DOMRect);
      crear();
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 200, clientY: 0 }));
      vi.advanceTimersByTime(2000);

      document.dispatchEvent(new MouseEvent('mouseleave'));
      vi.advanceTimersByTime(4000);

      const mouse = uniforms()['uMouse'].value as Float32Array;
      expect(mouse[0]).toBeCloseTo(0.5, 1);
      expect(mouse[1]).toBeCloseTo(0.5, 1);
    });

    it('sin interacción con el mouse, el fondo se queda en el centro', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 200, height: 100, left: 0, top: 0 } as DOMRect);
      crear({ mouseInteraction: false });

      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 200, clientY: 0 }));
      vi.advanceTimersByTime(2000);

      const mouse = uniforms()['uMouse'].value as Float32Array;
      expect(mouse[0]).toBeCloseTo(0.5, 2);
      expect(mouse[1]).toBeCloseTo(0.5, 2);
    });

    it('se pausa cuando sale de la pantalla y sigue cuando vuelve', () => {
      crear();
      vi.advanceTimersByTime(50);

      alInterseccion([{ isIntersecting: false }]);
      const pausado = renderer().render.mock.calls.length;
      vi.advanceTimersByTime(500);
      expect(renderer().render.mock.calls.length).toBe(pausado);

      alInterseccion([{ isIntersecting: true }]);
      vi.advanceTimersByTime(100);
      expect(renderer().render.mock.calls.length).toBeGreaterThan(pausado);
    });

    it('volver a la pantalla estando ya animando no duplica los cuadros', () => {
      crear();
      alInterseccion([{ isIntersecting: true }]);
      alInterseccion([{ isIntersecting: true }]);
      const antes = renderer().render.mock.calls.length;
      vi.advanceTimersByTime(17);
      expect(renderer().render.mock.calls.length - antes).toBeLessThanOrEqual(2);
    });

    it('se pausa con la pestaña oculta y sigue al volver a verla', () => {
      crear();
      vi.advanceTimersByTime(50);
      const oculto = vi.spyOn(document, 'hidden', 'get');

      oculto.mockReturnValue(true);
      document.dispatchEvent(new Event('visibilitychange'));
      const pausado = renderer().render.mock.calls.length;
      vi.advanceTimersByTime(500);
      expect(renderer().render.mock.calls.length).toBe(pausado);

      oculto.mockReturnValue(false);
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(100);
      expect(renderer().render.mock.calls.length).toBeGreaterThan(pausado);
    });
  });

  describe('limpieza', () => {
    it('al destruirse cancela la animación, desconecta los observadores y quita los listeners', () => {
      crear();
      const quitarVentana = vi.spyOn(window, 'removeEventListener');
      const quitarDocumento = vi.spyOn(document, 'removeEventListener');
      const cancelar = vi.spyOn(window, 'cancelAnimationFrame');

      fixture.destroy();

      expect(cancelar).toHaveBeenCalled();
      expect(desconexiones.sort()).toEqual(['interseccion', 'resize']);
      expect(quitarVentana.mock.calls.map((c) => c[0])).toContain('pointermove');
      expect(quitarDocumento.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(['visibilitychange', 'mouseleave']));
    });

    it('quita el canvas y libera el contexto WebGL', () => {
      crear();
      const canvas = renderer().gl.canvas;
      expect(contenedor().contains(canvas)).toBe(true);

      fixture.destroy();

      expect(contenedor().contains(canvas)).toBe(false);
      expect(ogl.perderContexto).toHaveBeenCalledTimes(1);
    });

    it('si el canvas ya no está en el contenedor, destruir no falla', () => {
      crear();
      renderer().gl.canvas.remove();
      expect(() => fixture.destroy()).not.toThrow();
    });

    it('después de destruirse ya no se dibuja nada', () => {
      crear();
      fixture.destroy();
      const total = renderer().render.mock.calls.length;
      vi.advanceTimersByTime(1000);
      expect(renderer().render.mock.calls.length).toBe(total);
    });
  });

  describe('sin WebGL2', () => {
    it('no rompe: el fondo animado simplemente no se muestra', () => {
      ogl.fallar = true;
      expect(() => crear()).not.toThrow();
      expect(contenedor().querySelector('canvas')).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('destruir sin haber arrancado tampoco falla', () => {
      ogl.fallar = true;
      crear();
      expect(() => fixture.destroy()).not.toThrow();
    });
  });
});
