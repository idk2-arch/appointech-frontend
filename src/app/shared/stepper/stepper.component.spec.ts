import { ChangeDetectorRef, Component, NgModule } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SharedModule } from '../shared.module';
import type { IndicadorStepper, TransicionStepper } from './stepper.component';
import { tintaSobre } from './stepper.temas';

@Component({
  selector: 'app-anfitrion-stepper',
  standalone: false,
  template: `
    <app-stepper
      [step]="paso"
      [initialStep]="inicial"
      [indicator]="indicador"
      [orientation]="orientacion"
      [transition]="transicion"
      [linear]="lineal"
      [disableStepIndicators]="sinIndicadores"
      [showFooter]="pie"
      [nextDisabled]="siguienteApagado"
      [nextLoading]="cargando"
      [theme]="tema"
      [accentColor]="acento"
      [frame]="marco"
      [contentMinHeight]="alturaMinima"
      (stepChange)="cambios.push($event)"
      (finalStepCompleted)="finales = finales + 1"
      (transitionEnd)="terminadas = terminadas + 1"
    >
      <app-step title="Uno" description="Primero" icon="M5 12h14"><p id="uno">Contenido uno</p></app-step>
      <app-step title="Dos" [locked]="bloqueado"><input id="campo" /></app-step>
      <app-step title="Tres"><p id="tres">Contenido tres</p></app-step>
    </app-stepper>
  `,
})
class AnfitrionComponent {
  paso: number | undefined = undefined;
  inicial = 1;
  indicador: IndicadorStepper = 'numbers';
  orientacion: 'horizontal' | 'vertical' = 'horizontal';
  transicion: TransicionStepper = 'slide';
  lineal = false;
  sinIndicadores = false;
  pie = true;
  siguienteApagado = false;
  cargando = false;
  tema: 'dark' | 'light' = 'dark';
  acento: string | undefined = undefined;
  marco = true;
  alturaMinima: number | string | undefined = undefined;
  bloqueado = false;
  cambios: number[] = [];
  finales = 0;
  terminadas = 0;
}

@NgModule({ imports: [SharedModule], declarations: [AnfitrionComponent] })
class AnfitrionModule {}

class ObservadorFalso {
  static instancias: ObservadorFalso[] = [];
  desconectado = false;
  constructor(public alCambiar: () => void) {
    ObservadorFalso.instancias.push(this);
  }
  observe(): void {
    /* sin efecto */
  }
  disconnect(): void {
    this.desconectado = true;
  }
}

interface AnimacionFalsa {
  objetivo: Element;
  marcos: Keyframe[];
  opciones: KeyframeAnimationOptions;
  cancel: ReturnType<typeof vi.fn>;
  finished: Promise<void>;
  effect: { getTiming: () => { duration: number } };
}

describe('StepperComponent', () => {
  let fixture: ComponentFixture<AnfitrionComponent>;
  let host: AnfitrionComponent;
  let animaciones: AnimacionFalsa[];
  let reducido: boolean;

  const raiz = (): HTMLElement => fixture.nativeElement;
  const refrescar = async (): Promise<void> => {
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const crear = async (ajustes: Partial<AnfitrionComponent> = {}): Promise<void> => {
    fixture = TestBed.createComponent(AnfitrionComponent);
    host = fixture.componentInstance;
    Object.assign(host, ajustes);
    await refrescar();
  };
  const indicadores = (): HTMLButtonElement[] => Array.from(raiz().querySelectorAll<HTMLButtonElement>('.stepper__segment, .stepper__dot, .stepper__bar'));
  const siguiente = (): HTMLButtonElement => raiz().querySelector<HTMLButtonElement>('.stepper__button--next')!;
  const atras = (): HTMLButtonElement => raiz().querySelector<HTMLButtonElement>('.stepper__button--back')!;
  const panel = (): HTMLElement => raiz().querySelector<HTMLElement>('.stepper__pane:not(.stepper__pane--leaving)')!;
  const texto = (): string => (raiz().textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(async () => {
    animaciones = [];
    reducido = false;
    ObservadorFalso.instancias = [];
    vi.stubGlobal('ResizeObserver', ObservadorFalso);
    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: reducido && consulta.includes('reduced-motion') }));
    await TestBed.configureTestingModule({ imports: [AnfitrionModule] }).compileComponents();
  });

  afterEach(() => {
    delete (HTMLElement.prototype as { animate?: unknown }).animate;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** Pone una Web Animations API de mentira y guarda cada animación lanzada. */
  const conAnimaciones = (): void => {
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      writable: true,
      value(this: Element, marcos: Keyframe[], opciones: KeyframeAnimationOptions) {
        const animacion: AnimacionFalsa = {
          objetivo: this,
          marcos,
          opciones,
          cancel: vi.fn(),
          finished: Promise.resolve(),
          effect: { getTiming: () => ({ duration: Number(opciones.duration) }) },
        };
        animaciones.push(animacion);
        return animacion;
      },
    });
  };

  /** Animaciones que nunca terminan solas: permiten mirar el estado a mitad de la transición. */
  const conAnimacionesPendientes = (): void => {
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      writable: true,
      value() {
        return { cancel: vi.fn(), effect: { getTiming: () => ({ duration: 560 }) }, finished: new Promise<void>(() => undefined) };
      },
    });
  };

  describe('indicadores y contenido', () => {
    it('muestra un indicador numerado por paso, con título, nombre accesible y el paso actual marcado', async () => {
      await crear();
      expect(indicadores()).toHaveLength(3);
      expect(indicadores().map((b) => b.getAttribute('aria-label'))).toEqual(['Paso 1: Uno', 'Paso 2: Dos', 'Paso 3: Tres']);
      expect(indicadores().map((b) => b.getAttribute('aria-current'))).toEqual(['step', null, null]);
      expect(texto()).toContain('Uno');
      expect(raiz().querySelectorAll('.stepper__badge')[1].textContent?.trim()).toBe('2');
    });

    it('solo dibuja el contenido del paso actual y lo anuncia con aria-live', async () => {
      await crear();
      expect(raiz().querySelector('#uno')).not.toBeNull();
      expect(raiz().querySelector('#campo')).toBeNull();
      expect(raiz().querySelector('.stepper__viewport')?.getAttribute('aria-live')).toBe('polite');
    });

    it('un icono reemplaza el número dentro del indicador', async () => {
      await crear();
      const insignia = raiz().querySelector('.stepper__badge')!;
      expect(insignia.querySelector('path')?.getAttribute('d')).toBe('M5 12h14');
      expect(insignia.textContent?.trim()).toBe('');
    });

    it('los pasos completados llevan check en vez de número y el resto conserva el estado', async () => {
      await crear({ inicial: 3 });
      const insignias = Array.from(raiz().querySelectorAll('.stepper__badge'));
      expect(insignias.map((i) => i.getAttribute('data-status'))).toEqual(['complete', 'complete', 'active']);
      expect(insignias[0].querySelector('.stepper__check')).not.toBeNull();
    });

    it('con initialStep fuera de rango lo ajusta', async () => {
      await crear({ inicial: 9 });
      expect(raiz().querySelector('[data-completed]')).not.toBeNull();
      expect(panel().textContent?.trim()).toBe('');
    });

    it('indicator dots y bars dibujan un botón por paso con su nombre accesible', async () => {
      await crear({ indicador: 'dots' });
      expect(raiz().querySelectorAll('.stepper__dot')).toHaveLength(3);
      expect(indicadores()[1].getAttribute('aria-label')).toBe('Paso 2: Dos');

      fixture.destroy();
      await crear({ indicador: 'bars', inicial: 2 });
      expect(raiz().querySelectorAll('.stepper__bar')).toHaveLength(3);
      expect(Array.from(raiz().querySelectorAll('.stepper__bar-fill')).map((f) => f.hasAttribute('data-filled'))).toEqual([true, true, false]);
    });

    it('la disposición vertical solo usa números y, con ancho suficiente, un riel con descripciones', async () => {
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
      await crear({ orientacion: 'vertical', indicador: 'dots' });
      expect(raiz().querySelector('.stepper--vertical')).not.toBeNull();
      expect(raiz().querySelector('.stepper__track[data-layout="rail"]')).not.toBeNull();
      expect(raiz().querySelector('.stepper__dots')).toBeNull();
      expect(texto()).toContain('Primero');
    });

    it('la disposición vertical se pliega a horizontal si falta ancho', async () => {
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
      await crear({ orientacion: 'vertical' });
      expect(raiz().querySelector('.stepper--vertical')).toBeNull();
      expect(raiz().querySelector('.stepper__track[data-layout="row"]')).not.toBeNull();
    });

    it('si los títulos no caben, solo quedan los indicadores (los nombres accesibles se conservan)', async () => {
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
      await crear();
      expect(raiz().querySelector('.stepper__title')).toBeNull();
      expect(indicadores()[0].getAttribute('aria-label')).toBe('Paso 1: Uno');
    });

    it('el tema claro y el color de acento se escriben como variables CSS', async () => {
      await crear({ tema: 'light', acento: '#d98e4a' });
      const estilo = (raiz().querySelector('.stepper') as HTMLElement).style;
      expect(estilo.getPropertyValue('--stepper-ink')).toBe('#27272a');
      expect(estilo.getPropertyValue('--stepper-solid')).toBe('#d98e4a');
      expect(estilo.getPropertyValue('--stepper-solid-ink')).toBe('#ffffff');
      expect(estilo.getPropertyValue('--stepper-radius')).toBe('24px');
      expect(estilo.getPropertyValue('--stepper-width')).toBe('440px');
    });

    it('contentMinHeight fija la altura mínima del contenido (número en px o cualquier medida CSS)', async () => {
      await crear();
      const estilo = (raiz().querySelector('.stepper') as HTMLElement).style;
      expect(estilo.getPropertyValue('--stepper-content-min')).toBe('0px');

      host.alturaMinima = 320;
      await refrescar();
      expect(estilo.getPropertyValue('--stepper-content-min')).toBe('320px');

      host.alturaMinima = 'min(30rem, 70dvh)';
      await refrescar();
      expect(estilo.getPropertyValue('--stepper-content-min')).toBe('min(30rem, 70dvh)');
    });

    it('sin marco no dibuja el panel ni el borde', async () => {
      await crear({ marco: false });
      expect(raiz().querySelector('.stepper--framed')).toBeNull();
      expect(raiz().querySelector('.stepper__rim')).toBeNull();
    });

    it('tintaSobre elige texto oscuro o blanco según el color', () => {
      expect(tintaSobre('#fff')).toBe('#18181b');
      expect(tintaSobre('#000000')).toBe('#ffffff');
      expect(tintaSobre('nada')).toBe('#ffffff');
    });

    it('el indicador deslizante se coloca en el paso actual', async () => {
      await crear();
      const deslizador = raiz().querySelector<HTMLElement>('.stepper__glider')!;
      expect(deslizador.style.opacity).toBe('1');
      expect(deslizador.style.transform).toContain('translate3d');
    });
  });

  describe('avanzar y volver (sin step: el asistente lleva su cuenta)', () => {
    it('Continuar avanza, emite stepChange y cambia el contenido; Atrás vuelve', async () => {
      await crear();
      expect(atras().hasAttribute('data-hidden')).toBe(true);

      siguiente().click();
      await refrescar();
      expect(host.cambios).toEqual([2]);
      expect(raiz().querySelector('#campo')).not.toBeNull();
      expect(raiz().querySelector('#uno')).toBeNull();
      expect(atras().hasAttribute('data-hidden')).toBe(false);
      expect(indicadores()[1].getAttribute('aria-current')).toBe('step');

      atras().click();
      await refrescar();
      expect(host.cambios).toEqual([2, 1]);
      expect(raiz().querySelector('#uno')).not.toBeNull();
    });

    it('en el último paso el botón dice Finalizar, emite finalStepCompleted y oculta el pie', async () => {
      await crear({ inicial: 3 });
      expect(siguiente().textContent).toContain('Finalizar');

      siguiente().click();
      await refrescar();

      expect(host.finales).toBe(1);
      expect(host.cambios).toEqual([]);
      expect(raiz().querySelector('[data-completed]')).not.toBeNull();
      expect(raiz().querySelector('.stepper__footer-wrap')?.hasAttribute('data-hidden')).toBe(true);
      expect(raiz().querySelector('.stepper__footer-wrap')?.getAttribute('aria-hidden')).toBe('true');
      expect(siguiente().disabled).toBe(true);
      expect(atras().disabled).toBe(true);
      expect(raiz().querySelector<HTMLElement>('.stepper__glider')!.style.opacity).toBe('0');
    });

    it('nextDisabled apaga Continuar y nextLoading lo apaga con un indicador de carga', async () => {
      await crear({ siguienteApagado: true });
      expect(siguiente().disabled).toBe(true);
      siguiente().click();
      expect(host.cambios).toEqual([]);

      host.siguienteApagado = false;
      host.cargando = true;
      await refrescar();
      expect(siguiente().disabled).toBe(true);
      expect(siguiente().querySelector('.stepper__spinner')).not.toBeNull();

      host.cargando = false;
      await refrescar();
      expect(siguiente().disabled).toBe(false);
    });

    it('sin pie no hay botones', async () => {
      await crear({ pie: false });
      expect(raiz().querySelector('.stepper__button')).toBeNull();
    });

    it('un paso al que ya se está yendo no se repite', async () => {
      await crear();
      indicadores()[0].click();
      expect(host.cambios).toEqual([]);
    });
  });

  describe('indicadores', () => {
    it('sin linear se puede saltar a cualquier paso', async () => {
      await crear();
      expect(indicadores().map((b) => b.disabled)).toEqual([true, false, false]);
      indicadores()[2].click();
      await refrescar();
      expect(host.cambios).toEqual([3]);
      expect(raiz().querySelector('#tres')).not.toBeNull();
    });

    it('con linear solo se vuelve a los pasos ya alcanzados', async () => {
      await crear({ lineal: true });
      expect(indicadores().map((b) => b.disabled)).toEqual([true, true, true]);

      siguiente().click();
      await refrescar();
      expect(indicadores().map((b) => b.disabled)).toEqual([false, true, true]);

      siguiente().click();
      await refrescar();
      atras().click();
      await refrescar();
      expect(indicadores().map((b) => b.disabled)).toEqual([false, true, false]);
    });

    it('disableStepIndicators apaga todos los indicadores', async () => {
      await crear({ sinIndicadores: true });
      expect(indicadores().every((b) => b.disabled)).toBe(true);
    });

    it('un paso bloqueado no se puede elegir desde los indicadores', async () => {
      await crear({ bloqueado: true });
      expect(indicadores().map((b) => b.disabled)).toEqual([true, true, false]);
    });
  });

  describe('con step (el padre manda)', () => {
    it('Continuar solo avisa: el paso cambia cuando el padre cambia step', async () => {
      await crear({ paso: 1 });
      siguiente().click();
      await refrescar();
      expect(host.cambios).toEqual([2]);
      expect(raiz().querySelector('#uno')).not.toBeNull();

      host.paso = 2;
      await refrescar();
      expect(raiz().querySelector('#campo')).not.toBeNull();
      expect(raiz().querySelector('#uno')).toBeNull();

      host.paso = 3;
      await refrescar();
      expect(raiz().querySelector('#tres')).not.toBeNull();
    });

    it('el último paso emite finalStepCompleted aunque el padre mande', async () => {
      await crear({ paso: 3 });
      siguiente().click();
      expect(host.finales).toBe(1);
    });
  });

  describe('animaciones', () => {
    it('al cambiar de paso desliza el nuevo, saca el anterior y libera el desborde al terminar', async () => {
      conAnimaciones();
      await crear();

      siguiente().click();
      await refrescar();

      const propias = animaciones;
      expect(propias.length).toBeGreaterThanOrEqual(3);
      const entrada = propias.find((a) => a.marcos[0]['transform']?.toString().startsWith('translateX(36px)'));
      expect(entrada).toBeDefined();
      expect(propias.some((a) => a.marcos[1]['transform']?.toString().startsWith('translateX(-36px)'))).toBe(true);
      await Promise.resolve();
      await refrescar();
      expect(raiz().querySelector('.stepper__pane--leaving')).toBeNull();
      expect(raiz().querySelector<HTMLElement>('.stepper__viewport')!.style.overflow).toBe('');
    });

    it('al volver, el deslizamiento va en sentido contrario', async () => {
      conAnimaciones();
      await crear({ inicial: 2 });
      atras().click();
      await refrescar();
      expect(animaciones.some((a) => a.marcos[0]['transform']?.toString().startsWith('translateX(-36px)'))).toBe(true);
    });

    it('con transition fade no se desplaza, solo cambia la opacidad', async () => {
      conAnimaciones();
      await crear({ transicion: 'fade' });
      siguiente().click();
      await refrescar();
      expect(animaciones.some((a) => String(a.marcos[0]['transform'] ?? '').includes('translate'))).toBe(false);
      expect(animaciones.some((a) => a.marcos[0]['opacity'] === 0)).toBe(true);
    });

    it('con transition none cambia sin animar', async () => {
      conAnimaciones();
      await crear({ transicion: 'none' });
      const antes = animaciones.length;
      siguiente().click();
      await refrescar();
      expect(animaciones.length).toBe(antes);
      expect(raiz().querySelector('#campo')).not.toBeNull();
      expect(raiz().querySelector('.stepper__pane--leaving')).toBeNull();
    });

    it('con movimiento reducido solo funde, sin desplazar', async () => {
      reducido = true;
      conAnimaciones();
      await crear();
      siguiente().click();
      await refrescar();
      expect(animaciones.some((a) => String(a.marcos[0]['transform'] ?? '').includes('translate'))).toBe(false);
      expect(animaciones.some((a) => a.marcos[0]['opacity'] === 0)).toBe(true);
    });

    it('si el foco estaba en el contenido que sale, pasa al panel nuevo', async () => {
      await crear({ inicial: 2 });
      const campo = raiz().querySelector<HTMLInputElement>('#campo')!;
      campo.focus();
      expect(document.activeElement).toBe(campo);

      siguiente().click();
      await refrescar();

      expect(document.activeElement).toBe(panel());
      expect(panel().getAttribute('tabindex')).toBe('-1');
    });

    it('un cambio mientras otro se anima cancela las animaciones anteriores', async () => {
      conAnimaciones();
      await crear();
      siguiente().click();
      await refrescar();
      const primeras = [...animaciones];
      siguiente().click();
      await refrescar();
      expect(primeras.some((a) => a.cancel.mock.calls.length > 0)).toBe(true);
    });
  });

  describe('rendimiento', () => {
    it('el panel no usa desenfoque de fondo: detrás hay un color liso y recalcularlo en cada cuadro de la animación es puro costo', async () => {
      await crear();
      const estilos = Array.from(document.querySelectorAll('style'))
        .map((e) => e.textContent ?? '')
        .join(' ');
      expect(estilos).toContain('.stepper--framed');
      expect(estilos).not.toMatch(/backdrop-filter\s*:/);
    });

    it('el observador de tamaño ignora los cambios de alto (la animación de altura lo dispararía en cada cuadro) y solo reacciona al ancho', async () => {
      const ancho = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
      await crear();
      const observador = ObservadorFalso.instancias[0];
      observador.alCambiar();

      const lecturas = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
      for (let i = 0; i < 30; i++) observador.alCambiar();
      expect(lecturas).not.toHaveBeenCalled();

      ancho.mockReturnValue(900);
      observador.alCambiar();
      expect(lecturas).toHaveBeenCalled();
    });

    it('la capa propia (will-change) solo existe mientras dura el movimiento y emite transitionEnd al terminar', async () => {
      const resolver: (() => void)[] = [];
      Object.defineProperty(HTMLElement.prototype, 'animate', {
        configurable: true,
        writable: true,
        value() {
          return { cancel: vi.fn(), effect: { getTiming: () => ({ duration: 560 }) }, finished: new Promise<void>((ok) => resolver.push(ok)) };
        },
      });
      await crear();

      siguiente().click();
      await refrescar();
      expect(panel().style.willChange).toBe('transform, opacity');
      expect(raiz().querySelector<HTMLElement>('.stepper__pane--leaving')!.style.willChange).toBe('transform, opacity');
      expect(raiz().querySelector<HTMLElement>('.stepper__viewport')!.style.overflow).toBe('hidden');
      expect(host.terminadas).toBe(0);

      resolver.forEach((ok) => ok());
      await refrescar();
      await refrescar();
      expect(panel().style.willChange).toBe('');
      expect(raiz().querySelector('.stepper__viewport')?.getAttribute('style') ?? '').not.toContain('overflow: hidden');
      expect(host.terminadas).toBe(1);
    });

    it('sin animación (transition none) también avisa transitionEnd, para que quien proyecta contenido pueda soltar el anterior', async () => {
      await crear({ transicion: 'none' });
      siguiente().click();
      await refrescar();
      expect(host.terminadas).toBe(1);
    });

    it('el panel que sale conserva su propio contenido y su estado (no se recrea) durante la transición', async () => {
      conAnimacionesPendientes();
      await crear({ inicial: 2 });
      const campo = raiz().querySelector<HTMLInputElement>('#campo')!;
      campo.value = 'escrito';

      siguiente().click();
      await refrescar();

      expect(raiz().querySelector('.stepper__pane--leaving #campo')).toBe(campo);
      expect(campo.value).toBe('escrito');
    });
  });

  describe('limpieza', () => {
    it('al destruir desconecta el observador de tamaño y cancela las animaciones', async () => {
      conAnimaciones();
      await crear();
      siguiente().click();
      await refrescar();
      const lanzadas = [...animaciones];

      fixture.destroy();

      expect(ObservadorFalso.instancias.every((o) => o.desconectado)).toBe(true);
      expect(lanzadas.some((a) => a.cancel.mock.calls.length > 0)).toBe(true);
    });

    it('un cambio de tamaño recalcula la disposición sin romper nada', async () => {
      await crear();
      ObservadorFalso.instancias[0].alCambiar();
      expect(raiz().querySelector<HTMLElement>('.stepper__glider')!.style.opacity).toBe('1');
    });

    it('funciona aunque el navegador no tenga ResizeObserver ni matchMedia', async () => {
      vi.stubGlobal('ResizeObserver', undefined);
      vi.stubGlobal('matchMedia', undefined);
      await crear();
      siguiente().click();
      await refrescar();
      expect(raiz().querySelector('#campo')).not.toBeNull();
    });
  });
});
