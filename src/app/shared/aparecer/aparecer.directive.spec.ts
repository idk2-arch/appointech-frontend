import { Component, CUSTOM_ELEMENTS_SCHEMA, NgModule, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SharedModule } from '../shared.module';
import { DEFECTOS_APARECER, MAX_ESCALONADOS, PRESETS_APARECER } from './aparecer.directive';

/** Una animación de mentira: se rechaza con AbortError al cancelarse, pero solo si alguien espera su promesa. */
class AnimacionFalsa {
  pause = vi.fn();
  play = vi.fn();
  cancel = vi.fn(() => {
    if (this.observada) this.rechazar(new DOMException('cancelada', 'AbortError'));
  });
  private observada = false;
  private resolver!: (valor: unknown) => void;
  private rechazar!: (motivo: unknown) => void;
  private promesa = new Promise<unknown>((ok, ko) => {
    this.resolver = ok;
    this.rechazar = ko;
  });

  constructor(
    public objetivo: Element,
    public marcos: Keyframe[],
    public opciones: KeyframeAnimationOptions
  ) {}

  /** Solo se rechaza si alguien la espera: en un navegador real esa promesa no genera errores sin manejar. */
  get finished(): Promise<unknown> {
    this.observada = true;
    return this.promesa;
  }

  terminar(): void {
    this.resolver(this);
  }
}

class ObservadorFalso {
  static instancias: ObservadorFalso[] = [];
  observados: Element[] = [];
  desconectado = false;
  constructor(
    public alCambiar: IntersectionObserverCallback,
    public opciones?: IntersectionObserverInit
  ) {
    ObservadorFalso.instancias.push(this);
  }
  observe(elemento: Element): void {
    this.observados.push(elemento);
  }
  unobserve(): void {}
  disconnect(): void {
    this.desconectado = true;
  }
  emitir(visible: boolean): void {
    this.alCambiar([{ isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

@Component({
  standalone: false,
  template: `
    <app-pantalla-prueba>
    @if (visible()) {
      <ul [appAparecer]="preset()" [stagger]="escalonado()" [aparecerClave]="clave()" [once]="una()" [trigger]="disparo()" data-prueba="lista">
        @for (n of hijos(); track n) {
          <li>{{ n }}</li>
        }
      </ul>
    }
    <section data-prueba="atributos" appAparecer distance="40" direction="horizontal" reverse blur="4" scale="0.9" duration="1" delay="0.2" threshold="0.5"></section>
    </app-pantalla-prueba>
  `,
})
class AnfitrionComponent {
  visible = signal(true);
  preset = signal<'lista' | 'simple' | ''>('lista');
  escalonado = signal<number | undefined>(undefined);
  clave = signal('');
  una = signal(true);
  disparo = signal<'scroll' | 'mount'>('scroll');
  hijos = signal([1, 2, 3]);
}

@NgModule({ imports: [SharedModule], declarations: [AnfitrionComponent], schemas: [CUSTOM_ELEMENTS_SCHEMA] })
class ModuloPruebaModule {}

describe('AparecerDirective', () => {
  let animaciones: AnimacionFalsa[];
  let fixture: ComponentFixture<AnfitrionComponent>;

  const lista = (): HTMLElement => fixture.nativeElement.querySelector('[data-prueba="lista"]');
  const seccion = (): HTMLElement => fixture.nativeElement.querySelector('[data-prueba="atributos"]');
  const de = (elemento: Element): AnimacionFalsa[] => animaciones.filter((a) => a.objetivo === elemento);
  const observador = (indice = 0): ObservadorFalso => ObservadorFalso.instancias[indice];
  const vaciar = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
  };

  async function crear(preparar?: (anfitrion: AnfitrionComponent) => void): Promise<void> {
    await TestBed.configureTestingModule({ imports: [ModuloPruebaModule] }).compileComponents();
    fixture = TestBed.createComponent(AnfitrionComponent);
    preparar?.(fixture.componentInstance);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    animaciones = [];
    ObservadorFalso.instancias = [];
    vi.stubGlobal('IntersectionObserver', ObservadorFalso);
    (Element.prototype as { animate?: unknown }).animate = function (this: Element, marcos: Keyframe[], opciones: KeyframeAnimationOptions) {
      const animacion = new AnimacionFalsa(this, marcos, opciones);
      animaciones.push(animacion);
      return animacion;
    };
  });

  afterEach(() => {
    delete (Element.prototype as { animate?: unknown }).animate;
    vi.unstubAllGlobals();
  });

  describe('primera aparición', () => {
    it('al crearse deja el contenido listo (animación pausada) y espera a entrar en pantalla', async () => {
      await crear((a) => a.preset.set('simple'));

      const [animacion] = de(seccion());
      expect(de(lista())).toHaveLength(1);
      expect(animacion.pause).toHaveBeenCalledOnce();
      expect(animacion.play).not.toHaveBeenCalled();
      expect(observador().observados).toContain(lista());
    });

    it('al entrar en pantalla se reproduce y deja de observar (once)', async () => {
      await crear((a) => a.preset.set('simple'));
      observador().emitir(true);

      expect(de(lista())[0].play).toHaveBeenCalledOnce();
      expect(observador().desconectado).toBe(true);
    });

    it('si todavía no entró en pantalla no se reproduce', async () => {
      await crear((a) => a.preset.set('simple'));
      observador().emitir(false);
      expect(de(lista())[0].play).not.toHaveBeenCalled();
      expect(observador().desconectado).toBe(false);
    });

    it('al terminar la animación se cancela: no queda ningún efecto sobre el elemento', async () => {
      await crear((a) => a.preset.set('simple'));
      observador().emitir(true);
      const animacion = de(lista())[0];

      animacion.terminar();
      await vaciar();
      expect(animacion.cancel).toHaveBeenCalled();
    });

    it('no deja estilos en línea ni atributos nuevos en el elemento', async () => {
      await crear((a) => a.preset.set('simple'));
      observador().emitir(true);
      expect(lista().getAttribute('style')).toBeNull();
      expect(lista().hasAttribute('tabindex')).toBe(false);
      expect(Array.from(lista().children).every((hijo) => !hijo.hasAttribute('style'))).toBe(true);
    });

    it('mueve solo transform y opacity, con la curva power3.out y fill "both"', async () => {
      await crear((a) => a.preset.set('simple'));
      const { marcos, opciones } = de(lista())[0];

      expect(marcos).toEqual([
        { opacity: 0, transform: 'translateY(28px) scale(1)' },
        { opacity: 1, transform: 'translateY(0px) scale(1)' },
      ]);
      expect(opciones).toMatchObject({ duration: 600, delay: 0, easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)', fill: 'both' });
    });
  });

  describe('opciones', () => {
    it('lee distancia, dirección, reverse, blur, escala, duración, retardo y umbral de los atributos', async () => {
      await crear();
      const { marcos, opciones } = de(seccion())[0];

      expect(marcos[0]).toEqual({ opacity: 0, transform: 'translateX(-40px) scale(0.9)', filter: 'blur(4px)' });
      expect(marcos[1]).toEqual({ opacity: 1, transform: 'translateX(0px) scale(1)', filter: 'blur(0px)' });
      expect(opciones).toMatchObject({ duration: 1000, delay: 200 });
      expect(ObservadorFalso.instancias.at(-1)?.opciones).toEqual({ threshold: 0, rootMargin: '0px 0px -50% 0px' });
    });

    it('sin indicar nada usa los valores del original, con 24 px de distancia', async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({ imports: [ModuloPruebaModule] }).compileComponents();
      fixture = TestBed.createComponent(AnfitrionComponent);
      fixture.componentInstance.preset.set('');
      fixture.detectChanges();

      expect(de(lista())[0].marcos[0]).toEqual({ opacity: 0, transform: 'translateY(24px) scale(1)' });
      expect(de(lista())[0].opciones.duration).toBe(500);
      expect(observador().opciones).toEqual({ threshold: 0, rootMargin: '0px 0px -10% 0px' });
      expect(DEFECTOS_APARECER).toMatchObject({ distance: 24, duration: 0.5, threshold: 0.1, blur: 0, scale: 1, stagger: 0, once: true, trigger: 'scroll' });
    });

    it('el preset "simple" mueve 28 px en 0,6 s y no escalona; "lista" mueve 40 px en 0,7 s y escalona cada 0,1 s', async () => {
      expect(PRESETS_APARECER).toEqual({ lista: { distance: 40, duration: 0.7, stagger: 0.1, scale: 0.97 }, simple: { distance: 28, duration: 0.6 } });
      await crear((a) => a.preset.set('simple'));
      expect(de(lista())).toHaveLength(1);
      expect(de(lista())[0].marcos[0]['transform']).toBe('translateY(28px) scale(1)');
      expect(de(lista())[0].opciones.duration).toBe(600);
    });

    it('"lista" mueve 40 px a cada hijo, con una leve escala, en 0,7 s', async () => {
      await crear();
      const [primera] = animaciones.filter((a) => a.objetivo.parentElement === lista());
      expect(primera.marcos[0]).toEqual({ opacity: 0, transform: 'translateY(40px) scale(0.97)' });
      expect(primera.marcos[1]).toEqual({ opacity: 1, transform: 'translateY(0px) scale(1)' });
      expect(primera.opciones.duration).toBe(700);
    });

    it('lo que se indica a mano tiene prioridad sobre el preset', async () => {
      await crear((a) => a.escalonado.set(0));
      expect(de(lista())).toHaveLength(1);
      expect(de(lista())[0].objetivo).toBe(lista());
    });
  });

  describe('lo que ya está a la vista al cargar', () => {
    /** Una caja con tamaño, como la de un elemento real; en jsdom todas miden cero. */
    const conCaja = (top: number, bottom: number) => (a: AnfitrionComponent) => {
      a.preset.set('simple');
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top, bottom, width: 300, height: bottom - top } as DOMRect);
    };

    afterEach(() => vi.restoreAllMocks());

    it('corre de inmediato, una sola vez, sin esperar al observador', async () => {
      await crear(conCaja(100, 400));

      const animacion = de(lista())[0];
      expect(animacion.play).toHaveBeenCalledOnce();
      expect(ObservadorFalso.instancias.every((o) => !o.observados.includes(lista()))).toBe(true);
    });

    it('aunque su borde superior esté en el 10 % inferior de la ventana (donde el umbral no dispararía)', async () => {
      await crear(conCaja(window.innerHeight - 20, window.innerHeight + 300));
      expect(de(lista())[0].play).toHaveBeenCalledOnce();
    });

    it('lo que está debajo de la ventana espera a entrar en pantalla', async () => {
      await crear(conCaja(window.innerHeight + 50, window.innerHeight + 300));
      expect(de(lista())[0].play).not.toHaveBeenCalled();
      observador().emitir(true);
      expect(de(lista())[0].play).toHaveBeenCalledOnce();
    });

    it('lo que quedó arriba, ya desplazado, también espera', async () => {
      await crear(conCaja(-500, -100));
      expect(de(lista())[0].play).not.toHaveBeenCalled();
    });

    it('si el observador avisa después, no la repite', async () => {
      await crear(conCaja(100, 400));
      observador(0)?.emitir(true);
      expect(de(lista())[0].play).toHaveBeenCalledOnce();
    });

    it('con once en falso corre al cargar y además sigue observando para repetir al volver', async () => {
      await crear((a) => {
        conCaja(100, 400)(a);
        a.una.set(false);
      });
      expect(de(lista())[0].play).toHaveBeenCalledOnce();
      expect(observador().observados).toContain(lista());
      observador().emitir(false);
      expect(de(lista())[0].cancel).toHaveBeenCalled();
    });
  });

  describe('stagger', () => {
    it('anima cada hijo directo, uno tras otro, cada 0,1 s', async () => {
      await crear();
      const animacionesLista = animaciones.filter((a) => a.objetivo.parentElement === lista());

      expect(animacionesLista.map((a) => a.objetivo)).toEqual(Array.from(lista().children));
      expect(animacionesLista.map((a) => Math.round(a.opciones.delay as number))).toEqual([0, 100, 200]);
      expect(de(lista())).toHaveLength(0);
    });

    it('se reproducen todas juntas al entrar en pantalla', async () => {
      await crear();
      observador().emitir(true);
      const hijos = animaciones.filter((a) => a.objetivo.parentElement === lista());
      expect(hijos.every((a) => a.play.mock.calls.length === 1)).toBe(true);
    });

    it('con más de 12 hijos solo escalona los primeros 12; del 13 en adelante aparecen sin animación', async () => {
      await crear((a) => a.hijos.set(Array.from({ length: 20 }, (_, i) => i + 1)));
      const hijos = animaciones.filter((a) => a.objetivo.parentElement === lista());

      expect(MAX_ESCALONADOS).toBe(12);
      expect(hijos).toHaveLength(12);
      expect(hijos.map((a) => a.objetivo)).toEqual(Array.from(lista().children).slice(0, 12));
      expect(Math.round(hijos[11].opciones.delay as number)).toBe(1100);
    });

    it('sin hijos anima el propio elemento', async () => {
      await crear((a) => a.hijos.set([]));
      expect(de(lista())).toHaveLength(1);
    });
  });

  describe('una sola vez por pantalla', () => {
    it('si cambian los hijos no vuelve a animar', async () => {
      await crear();
      observador().emitir(true);
      const antes = animaciones.length;

      fixture.componentInstance.hijos.set([1, 2, 3, 4, 5]);
      fixture.detectChanges();
      observador().emitir(true);

      expect(animaciones.length).toBe(antes);
    });

    it('si el bloque se recrea en la misma pantalla (recarga de datos) no se anima de nuevo', async () => {
      await crear();
      fixture.componentInstance.visible.set(false);
      fixture.detectChanges();
      const conteo = animaciones.length;
      fixture.componentInstance.visible.set(true);
      fixture.detectChanges();

      expect(animaciones.length).toBe(conteo);
    });

    it('una pantalla nueva sí vuelve a animar', async () => {
      await crear();
      const primera = animaciones.length;
      TestBed.resetTestingModule();
      animaciones = [];
      await crear();
      expect(animaciones.length).toBe(primera);
    });
  });

  describe('once en falso', () => {
    it('al salir de pantalla vuelve al estado inicial y al volver a entrar repite la entrada', async () => {
      await crear((a) => a.una.set(false));
      observador().emitir(true);
      const primeras = animaciones.filter((a) => a.objetivo.parentElement === lista());
      expect(observador().desconectado).toBe(false);

      observador().emitir(false);
      expect(primeras.every((a) => a.cancel.mock.calls.length > 0)).toBe(true);
      const nuevas = animaciones.filter((a) => a.objetivo.parentElement === lista() && !primeras.includes(a));
      expect(nuevas).toHaveLength(3);
      expect(nuevas.every((a) => a.pause.mock.calls.length === 1)).toBe(true);

      observador().emitir(true);
      expect(nuevas.every((a) => a.play.mock.calls.length === 1)).toBe(true);
    });

    it('seguir dentro de pantalla no repite nada', async () => {
      await crear((a) => a.una.set(false));
      observador().emitir(true);
      const total = animaciones.length;
      observador().emitir(true);
      expect(animaciones.length).toBe(total);
    });

    it('no usa el registro de pantalla: se puede recrear y animar otra vez', async () => {
      await crear((a) => a.una.set(false));
      const total = animaciones.length;
      fixture.componentInstance.visible.set(false);
      fixture.detectChanges();
      fixture.componentInstance.visible.set(true);
      fixture.detectChanges();
      expect(animaciones.length).toBeGreaterThan(total);
    });
  });

  describe('trigger "mount"', () => {
    it('anima al montarse, sin esperar a entrar en pantalla ni usar el observador', async () => {
      await crear((a) => a.disparo.set('mount'));

      const hijos = animaciones.filter((a) => a.objetivo.parentElement === lista());
      expect(hijos.every((a) => a.play.mock.calls.length === 1)).toBe(true);
      expect(ObservadorFalso.instancias.every((o) => !o.observados.includes(lista()))).toBe(true);
    });

    it('funciona aunque no exista IntersectionObserver', async () => {
      vi.stubGlobal('IntersectionObserver', undefined);
      await crear((a) => a.disparo.set('mount'));
      expect(animaciones.filter((a) => a.objetivo.parentElement === lista())[0].play).toHaveBeenCalled();
    });
  });

  describe('el contenido siempre queda visible', () => {
    it('con prefers-reduced-motion no anima nada', async () => {
      vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('reduced-motion') }));
      await crear();
      expect(animaciones).toHaveLength(0);
      expect(ObservadorFalso.instancias).toHaveLength(0);
    });

    it('sin IntersectionObserver (con scroll) no anima nada', async () => {
      vi.stubGlobal('IntersectionObserver', undefined);
      await crear();
      expect(animaciones).toHaveLength(0);
    });

    it('sin element.animate no anima nada ni falla', async () => {
      delete (Element.prototype as { animate?: unknown }).animate;
      await expect(crear()).resolves.toBeUndefined();
      expect(ObservadorFalso.instancias).toHaveLength(0);
    });

    it('si animate() falla, cancela lo creado y no rompe la pantalla', async () => {
      let llamadas = 0;
      (Element.prototype as { animate?: unknown }).animate = function (this: Element, marcos: Keyframe[], opciones: KeyframeAnimationOptions) {
        if (++llamadas === 2) throw new Error('animate roto');
        const animacion = new AnimacionFalsa(this, marcos, opciones);
        animaciones.push(animacion);
        return animacion;
      };
      await expect(crear()).resolves.toBeUndefined();
      const delBloque = animaciones.filter((a) => a.objetivo !== seccion());
      expect(delBloque).toHaveLength(1);
      expect(delBloque[0].cancel).toHaveBeenCalled();
    });

    it('si falla el observador, cancela lo creado y deja el contenido a la vista', async () => {
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor() {
            throw new Error('sin observador');
          }
        }
      );
      await expect(crear()).resolves.toBeUndefined();
      expect(animaciones.length).toBeGreaterThan(0);
      expect(animaciones.every((a) => a.cancel.mock.calls.length > 0)).toBe(true);
    });
  });

  describe('limpieza', () => {
    it('al destruirse desconecta el observador y cancela las animaciones (un AbortError sin manejar haría fallar la corrida)', async () => {
      await crear();
      observador().emitir(true);
      const reproducidas = [...animaciones];
      fixture.destroy();
      await vaciar();

      expect(observador().desconectado).toBe(true);
      expect(reproducidas.every((a) => a.cancel.mock.calls.length > 0)).toBe(true);
    });

    it('destruir antes de entrar en pantalla también limpia', async () => {
      await crear();
      fixture.destroy();
      expect(observador().desconectado).toBe(true);
      expect(animaciones.every((a) => a.cancel.mock.calls.length > 0)).toBe(true);
    });

    it('cancelar una animación en curso rechaza su promesa con AbortError y se da por esperado (sin errores)', async () => {
      await crear();
      ObservadorFalso.instancias.at(-1)!.emitir(true);
      const enCurso = de(seccion())[0];
      enCurso.cancel();
      await vaciar();

      expect(enCurso.cancel.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
