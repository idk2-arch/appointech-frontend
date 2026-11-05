import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastComponent } from './toast.component';
import { ToastModule } from './toast.module';
import { MotivoCierre } from './toast.utils';

class AnimacionFalsa {
  playState = 'running';
  onfinish: (() => void) | null = null;
  pause = vi.fn(() => (this.playState = 'paused'));
  play = vi.fn(() => (this.playState = 'running'));
  cancel = vi.fn();
}

describe('ToastComponent', () => {
  let fixture: ComponentFixture<ToastComponent>;
  let componente: ToastComponent;
  let cerrados: MotivoCierre[];
  let acciones: number;
  let animaciones: AnimacionFalsa[];
  let animar: ReturnType<typeof vi.fn>;
  let cuadros: FrameRequestCallback[];
  let reloj: number;
  let relojCuadros: number;

  const raiz = (): HTMLElement => fixture.nativeElement.querySelector('.swipe-toast');
  const tarjeta = (): HTMLElement => fixture.nativeElement.querySelector('.swipe-toast__card');
  const boton = (clase: string): HTMLButtonElement => fixture.nativeElement.querySelector(`.swipe-toast__${clase}`);
  const fase = (): string => componente.fase();

  const puntero = (tipo: string, extra: Record<string, unknown> = {}, destino: EventTarget = tarjeta()): void => {
    destino.dispatchEvent(Object.assign(new Event(tipo, { bubbles: true }), { pointerId: 1, button: 0, pointerType: 'mouse', clientY: 0, ...extra }));
  };
  const tecla = (key: string): void => {
    tarjeta().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  };
  /** Avanza los cuadros de animación `ms` milisegundos (cuadros de 16 ms). */
  const correr = (ms: number): void => {
    for (let t = 0; t < ms; t += 16) {
      relojCuadros += 16;
      cuadros.splice(0).forEach((cb) => cb(relojCuadros));
    }
  };
  const vaciarPromesas = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
  };

  async function crear(entradas: Record<string, unknown> = {}): Promise<void> {
    await TestBed.configureTestingModule({ imports: [ToastModule] }).compileComponents();
    fixture = TestBed.createComponent(ToastComponent);
    componente = fixture.componentInstance;
    componente.cerrado.subscribe((motivo) => cerrados.push(motivo));
    componente.accion.subscribe(() => acciones++);
    fixture.componentRef.setInput('title', 'Pago recibido');
    for (const [clave, valor] of Object.entries(entradas)) fixture.componentRef.setInput(clave, valor);
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    cerrados = [];
    acciones = 0;
    animaciones = [];
    cuadros = [];
    reloj = 1000;
    relojCuadros = 0;
    animar = vi.fn(() => {
      const animacion = new AnimacionFalsa();
      animaciones.push(animacion);
      return animacion;
    });
    (Element.prototype as { animate?: unknown }).animate = animar;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => cuadros.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(performance, 'now').mockImplementation(() => reloj);
  });

  afterEach(() => {
    fixture.destroy();
    delete (Element.prototype as { animate?: unknown }).animate;
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('contenido y accesibilidad', () => {
    it('muestra título, descripción, acción y botón de cerrar como región de estado', async () => {
      await crear({ description: 'Listo', actionLabel: 'Ver comprobante', closeButton: true });

      expect(fixture.nativeElement.querySelector('.swipe-toast__title').textContent).toBe('Pago recibido');
      expect(fixture.nativeElement.querySelector('.swipe-toast__desc').textContent).toBe('Listo');
      expect(boton('action').textContent).toBe('Ver comprobante');
      expect(boton('close').getAttribute('aria-label')).toBe('Cerrar aviso');
      expect(tarjeta().getAttribute('role')).toBe('status');
      expect(tarjeta().getAttribute('aria-live')).toBe('polite');
      expect(tarjeta().hasAttribute('tabindex')).toBe(false);
    });

    it('sin descripción, acción ni botón no los dibuja', async () => {
      await crear();
      expect(fixture.nativeElement.querySelector('.swipe-toast__desc')).toBeNull();
      expect(boton('action')).toBeNull();
      expect(boton('close')).toBeNull();
      expect(fixture.nativeElement.querySelector('.swipe-toast__icon')).toBeNull();
    });

    it('los errores se anuncian como alerta; el resto, con cortesía', async () => {
      await crear({ tipo: 'error' });
      expect(tarjeta().getAttribute('role')).toBe('alert');
      expect(tarjeta().getAttribute('aria-live')).toBe('assertive');
    });

    it.each(['exito', 'info', 'advertencia', 'error'] as const)('el tipo %s dibuja su icono y lo marca en la raíz', async (tipo) => {
      await crear({ tipo });
      expect(raiz().getAttribute('data-tipo')).toBe(tipo);
      expect(fixture.nativeElement.querySelector('.swipe-toast__icon svg')).not.toBeNull();
    });

    it('aplica los colores y medidas como variables CSS', async () => {
      await crear({ background: '#111', color: '#eee', fuseColor: '#f00', width: 300, radius: 8, slideMs: 250 });
      const estilo = raiz().style;
      expect([estilo.getPropertyValue('--st-bg'), estilo.getPropertyValue('--st-ink'), estilo.getPropertyValue('--st-fuse')]).toEqual([
        '#111',
        '#eee',
        '#f00',
      ]);
      expect([estilo.getPropertyValue('--st-w'), estilo.getPropertyValue('--st-radius'), estilo.getPropertyValue('--st-slide')]).toEqual([
        '300px',
        '8px',
        '250ms',
      ]);
    });

    it('sin duración la mecha se oculta, y se puede poner arriba', async () => {
      await crear({ duration: 0 });
      expect(raiz().getAttribute('data-fuse')).toBe('none');
      fixture.componentRef.setInput('duration', 4000);
      fixture.componentRef.setInput('fuse', 'top');
      fixture.detectChanges();
      expect(raiz().getAttribute('data-fuse')).toBe('top');
    });

    it('marca el modo inline, si se puede descartar y que ya está montado', async () => {
      await crear({ inline: true, dismissible: false });
      expect(raiz().getAttribute('data-inline')).toBe('true');
      expect(raiz().getAttribute('data-dismissible')).toBe('false');
      correr(32);
      fixture.detectChanges();
      expect(raiz().getAttribute('data-mounted')).toBe('true');
    });
  });

  describe('mecha', () => {
    it('arranca una animación de scaleX de la duración pedida y, al acabar, cierra por timeout', async () => {
      await crear({ duration: 3000 });

      expect(animar).toHaveBeenCalledWith([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
        duration: 3000,
        easing: 'linear',
        fill: 'forwards',
      });
      animaciones[0].onfinish!();
      expect(fase()).toBe('closing');

      vi.advanceTimersByTime(400 * 0.7 + 60);
      expect(fase()).toBe('gone');
      expect(cerrados).toEqual(['timeout']);
    });

    it('sin duración no hay mecha que consumir', async () => {
      await crear({ duration: 0 });
      expect(animar).not.toHaveBeenCalled();
    });

    it('si no existe la API de animaciones el aviso funciona igual (sin cierre por tiempo)', async () => {
      delete (Element.prototype as { animate?: unknown }).animate;
      await crear();
      expect(fase()).toBe('open');
    });

    it('cambiar la duración enciende la mecha otra vez', async () => {
      await crear({ duration: 3000 });
      fixture.componentRef.setInput('duration', 6000);
      fixture.detectChanges();

      expect(animaciones[0].cancel).toHaveBeenCalled();
      expect(animar).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ duration: 6000 }));
    });

    it('se pausa con el mouse encima, al enfocar y con la pestaña oculta, y sigue al soltar todo', async () => {
      await crear();
      const mecha = animaciones[0];

      puntero('pointerenter');
      expect(mecha.pause).toHaveBeenCalled();
      puntero('pointerleave');
      expect(mecha.playState).toBe('running');

      tarjeta().dispatchEvent(new FocusEvent('focusin'));
      expect(mecha.playState).toBe('paused');
      tarjeta().dispatchEvent(new FocusEvent('focusout', { relatedTarget: document.body }));
      expect(mecha.playState).toBe('running');

      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(mecha.playState).toBe('paused');
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(mecha.playState).toBe('running');
    });

    it('mantener el foco dentro del aviso no reanuda la mecha', async () => {
      await crear({ actionLabel: 'Ver' });
      const mecha = animaciones[0];
      tarjeta().dispatchEvent(new FocusEvent('focusin'));
      tarjeta().dispatchEvent(new FocusEvent('focusout', { relatedTarget: boton('action') }));
      expect(mecha.playState).toBe('paused');
    });

    it('un toque no pausa con "hover" y pauseOnHover desactivado lo ignora', async () => {
      await crear({ pauseOnHover: false });
      puntero('pointerenter');
      expect(animaciones[0].pause).not.toHaveBeenCalled();

      fixture.componentRef.setInput('pauseOnHover', true);
      fixture.detectChanges();
      puntero('pointerenter', { pointerType: 'touch' });
      puntero('pointerleave', { pointerType: 'touch' });
      expect(animaciones[0].pause).not.toHaveBeenCalled();
    });

    it('al apagar pauseOnHover con el mouse encima la mecha continúa', async () => {
      await crear();
      puntero('pointerenter');
      expect(animaciones[0].playState).toBe('paused');
      fixture.componentRef.setInput('pauseOnHover', false);
      fixture.detectChanges();
      expect(animaciones[0].playState).toBe('running');
    });
  });

  describe('cierre', () => {
    it('la acción avisa y cierra con el motivo "action"', async () => {
      await crear({ actionLabel: 'Ver comprobante' });
      boton('action').click();

      expect(acciones).toBe(1);
      expect(fase()).toBe('closing');
      vi.advanceTimersByTime(400 * 0.7 + 60);
      expect(cerrados).toEqual(['action']);
    });

    it('con teclado la acción cierra al instante, sin animación', async () => {
      await crear({ actionLabel: 'Ver' });
      tecla('Enter');
      boton('action').click();

      expect(fixture.nativeElement.querySelector('.swipe-toast').hasAttribute('data-instant')).toBe(false);
      fixture.detectChanges();
      expect(raiz().hasAttribute('data-instant')).toBe(true);
      vi.advanceTimersByTime(0);
      expect(cerrados).toEqual(['action']);
    });

    it('el botón de cerrar cierra con el motivo "close"', async () => {
      await crear({ closeButton: true });
      boton('close').click();
      vi.advanceTimersByTime(1000);
      expect(cerrados).toEqual(['close']);
    });

    it('Escape cierra al instante si se puede descartar, y no si no', async () => {
      await crear();
      tecla('Escape');
      vi.advanceTimersByTime(0);
      expect(cerrados).toEqual(['escape']);
    });

    it('Escape y otras teclas no hacen nada con dismissible desactivado', async () => {
      await crear({ dismissible: false });
      tecla('Escape');
      tecla('a');
      vi.advanceTimersByTime(1000);
      expect(cerrados).toEqual([]);
      expect(fase()).toBe('open');
    });

    it('en modo inline espera a que el hueco se colapse antes de avisar', async () => {
      await crear({ inline: true, closeButton: true });
      boton('close').click();
      vi.advanceTimersByTime(400 * 0.7 + 60);
      expect(fase()).toBe('gone');
      expect(cerrados).toEqual([]);

      vi.advanceTimersByTime(200);
      expect(cerrados).toEqual(['close']);
    });

    it('cerrarlo dos veces solo avisa una', async () => {
      await crear();
      componente.cerrar('close');
      componente.cerrar('close');
      vi.advanceTimersByTime(1000);
      expect(cerrados).toEqual(['close']);
    });

    it('open=false lo cierra como "programmatic" y open=true lo vuelve a mostrar', async () => {
      await crear();
      fixture.componentRef.setInput('open', false);
      fixture.detectChanges();
      expect(fase()).toBe('closing');

      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
      expect(fase()).toBe('open');
      expect(animar).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(1000);
      expect(cerrados).toEqual([]);
    });

    it('open=false con el aviso ya cerrado no hace nada', async () => {
      await crear({ closeButton: true });
      boton('close').click();
      vi.advanceTimersByTime(1000);

      fixture.componentRef.setInput('open', false);
      fixture.detectChanges();
      expect(cerrados).toEqual(['close']);
    });

    it('nace cerrado si open es falso desde el principio', async () => {
      await crear({ open: false });
      expect(fase()).toBe('closing');
    });
  });

  describe('teclado (el foco entra por los botones, no por la tarjeta)', () => {
    it('la tarjeta no es focusable: el recorrido es acción → cerrar', async () => {
      await crear({ actionLabel: 'Ver', closeButton: true });
      const enfocables = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[tabindex], button, a[href]'));

      expect(enfocables).toEqual([boton('action'), boton('close')]);
      expect(enfocables.every((el) => !el.hasAttribute('tabindex') || el.getAttribute('tabindex') === '0')).toBe(true);
    });

    it('enfocar un botón pausa la mecha; pasar de un botón al otro la mantiene pausada; salir la reanuda', async () => {
      await crear({ actionLabel: 'Ver', closeButton: true });
      document.body.appendChild(fixture.nativeElement);
      const mecha = animaciones[0];

      boton('action').focus();
      expect(mecha.playState).toBe('paused');

      boton('close').focus();
      expect(mecha.playState).toBe('paused');

      boton('close').blur();
      expect(mecha.playState).toBe('running');
      fixture.nativeElement.remove();
    });

    it('Escape pulsado sobre un botón cierra el aviso al instante', async () => {
      await crear({ actionLabel: 'Ver', closeButton: true });
      boton('action').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(componente.fase()).toBe('closing');
      vi.advanceTimersByTime(0);
      expect(cerrados).toEqual(['escape']);
    });

    it('Enter sobre el botón de acción lo activa y cierra sin animación', async () => {
      await crear({ actionLabel: 'Ver' });
      boton('action').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      boton('action').click();
      fixture.detectChanges();

      expect(raiz().hasAttribute('data-instant')).toBe(true);
      vi.advanceTimersByTime(0);
      expect(cerrados).toEqual(['action']);
    });
  });

  describe('gesto de deslizar', () => {
    it('la zona muerta evita arrastrar por un temblor', async () => {
      await crear();
      puntero('pointerdown', { clientY: 100 });
      puntero('pointermove', { clientY: 102 });
      expect(tarjeta().hasAttribute('data-swiping')).toBe(false);
      expect(tarjeta().style.transform).toBe('');

      puntero('pointermove', { clientY: 110 });
      expect(tarjeta().hasAttribute('data-swiping')).toBe(true);
      puntero('pointermove', { clientY: 130 });
      expect(tarjeta().style.transform).toBe('translateY(20px)');
    });

    it('arrastrando hacia arriba opone resistencia elástica', async () => {
      await crear();
      puntero('pointerdown', { clientY: 100 });
      puntero('pointermove', { clientY: 110 });
      puntero('pointermove', { clientY: 10 });

      const y = parseFloat(tarjeta().style.transform.replace('translateY(', ''));
      expect(y).toBeLessThan(0);
      expect(y).toBeGreaterThan(-24);
    });

    it('soltar tras una distancia suficiente descarta por "swipe" con el resorte de salida', async () => {
      await crear({ inline: false });
      puntero('pointerdown', { clientY: 100 });
      puntero('pointermove', { clientY: 110 });
      puntero('pointermove', { clientY: 170 });
      reloj += 200;
      puntero('pointerup', { clientY: 170 });

      expect(animaciones[0].pause).toHaveBeenCalled();
      correr(500);
      await vaciarPromesas();

      expect(tarjeta().style.opacity).toBe('0');
      expect(fase()).toBe('gone');
      expect(cerrados).toEqual(['swipe']);
    });

    it('un flick corto y rápido también descarta', async () => {
      await crear();
      puntero('pointerdown', { clientY: 100 });
      reloj += 10;
      puntero('pointermove', { clientY: 110 });
      reloj += 10;
      puntero('pointermove', { clientY: 130 });
      reloj += 5;
      puntero('pointerup', { clientY: 130 });

      correr(500);
      await vaciarPromesas();
      expect(cerrados).toEqual(['swipe']);
    });

    it('un arrastre lento y corto vuelve a su sitio con resorte y no descarta', async () => {
      await crear();
      puntero('pointerdown', { clientY: 100 });
      puntero('pointermove', { clientY: 110 });
      puntero('pointermove', { clientY: 125 });
      reloj += 300;
      puntero('pointerup', { clientY: 125 });

      correr(700);
      await vaciarPromesas();

      expect(tarjeta().style.transform).toBe('translateY(0px)');
      expect(fase()).toBe('open');
      expect(cerrados).toEqual([]);
      expect(animaciones[0].playState).toBe('running');
    });

    it('arrastrar hacia arriba y soltar no descarta', async () => {
      await crear();
      puntero('pointerdown', { clientY: 100 });
      puntero('pointermove', { clientY: 110 });
      puntero('pointermove', { clientY: 60 });
      reloj += 300;
      puntero('pointerup', { clientY: 60 });
      correr(700);

      expect(fase()).toBe('open');
      expect(tarjeta().style.transform).toBe('translateY(0px)');
    });

    it('soltar sin haber movido no anima ni descarta', async () => {
      await crear();
      const pendientes = cuadros.length;
      puntero('pointerdown', { clientY: 100 });
      puntero('pointerup', { clientY: 100 });
      expect(cuadros).toHaveLength(pendientes);
      expect(fase()).toBe('open');
      expect(animaciones[0].playState).toBe('running');
    });

    it('con menos movimiento el regreso es un tween corto y la salida solo se desvanece', async () => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
      await crear();
      puntero('pointerdown', { clientY: 100 });
      puntero('pointermove', { clientY: 110 });
      puntero('pointermove', { clientY: 125 });
      reloj += 300;
      puntero('pointerup', { clientY: 125 });
      correr(300);
      expect(tarjeta().style.transform).toBe('translateY(0px)');

      puntero('pointerdown', { clientY: 100 });
      puntero('pointermove', { clientY: 110 });
      puntero('pointermove', { clientY: 170 });
      reloj += 300;
      const antes = tarjeta().style.transform;
      puntero('pointerup', { clientY: 170 });
      expect(tarjeta().style.transform).toBe(antes);
      correr(300);
      await vaciarPromesas();
      expect(cerrados).toEqual(['swipe']);
    });

    it('no empieza a arrastrar con otro botón, sin dismissible, desde un botón del aviso ni con otro puntero', async () => {
      await crear({ actionLabel: 'Ver' });
      puntero('pointerdown', { button: 2, clientY: 100 });
      puntero('pointermove', { clientY: 140 });
      puntero('pointerdown', { clientY: 100 }, boton('action'));
      puntero('pointermove', { clientY: 140 });
      expect(tarjeta().style.transform).toBe('');

      puntero('pointerdown', { clientY: 100, pointerId: 1 });
      puntero('pointermove', { clientY: 110, pointerId: 2 });
      puntero('pointermove', { clientY: 140, pointerId: 2 });
      puntero('pointerup', { pointerId: 2 });
      expect(tarjeta().style.transform).toBe('');
      puntero('pointerup', { pointerId: 1 });

      fixture.componentRef.setInput('dismissible', false);
      fixture.detectChanges();
      puntero('pointerdown', { clientY: 100 });
      puntero('pointermove', { clientY: 140 });
      expect(tarjeta().style.transform).toBe('');
    });

    it('un cierre pedido durante el arrastre espera a que se suelte', async () => {
      await crear();
      puntero('pointerdown', { clientY: 100 });
      puntero('pointermove', { clientY: 110 });
      puntero('pointermove', { clientY: 115 });

      componente.cerrar('close');
      expect(fase()).toBe('open');

      reloj += 300;
      puntero('pointerup', { clientY: 115 });
      expect(fase()).toBe('closing');
      vi.advanceTimersByTime(1000);
      expect(cerrados).toEqual(['close']);
    });

    it('tocar un aviso que se está cerrando lo rescata', async () => {
      await crear();
      componente.cerrar('timeout');
      expect(fase()).toBe('closing');

      puntero('pointerdown', { clientY: 100 });
      expect(fase()).toBe('open');
      vi.advanceTimersByTime(1000);
      expect(cerrados).toEqual([]);
    });

    it('mientras se arrastra la mecha se detiene y al soltar sigue', async () => {
      await crear();
      puntero('pointerdown', { clientY: 100 });
      expect(animaciones[0].playState).toBe('paused');
      reloj += 300;
      puntero('pointerup', { clientY: 100 });
      expect(animaciones[0].playState).toBe('running');
    });

    it('no vuelve a arrancar un descarte mientras sale', async () => {
      await crear();
      puntero('pointerdown', { clientY: 100 });
      puntero('pointermove', { clientY: 110 });
      puntero('pointermove', { clientY: 170 });
      reloj += 300;
      puntero('pointerup', { clientY: 170 });

      puntero('pointerdown', { clientY: 100 });
      componente.cerrar('close');
      correr(500);
      await vaciarPromesas();
      expect(cerrados).toEqual(['swipe']);
    });
  });

  it('al destruirse suelta los oyentes y cancela la mecha', async () => {
    await crear();
    const quitar = vi.spyOn(tarjeta(), 'removeEventListener');
    fixture.destroy();

    expect(animaciones[0].cancel).toHaveBeenCalled();
    expect(quitar).toHaveBeenCalledWith('pointerdown', expect.any(Function));
  });
});
