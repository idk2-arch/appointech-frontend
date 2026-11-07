import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SharedModule } from '../shared.module';
import { PeekRatingComponent } from './peek-rating.component';

describe('PeekRatingComponent', () => {
  let reducido: boolean;
  let configurado: boolean;

  beforeEach(() => {
    reducido = false;
    configurado = false;
    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: reducido && consulta.includes('reduced-motion') }));
  });
  afterEach(() => vi.unstubAllGlobals());

  async function crear(entradas: Partial<PeekRatingComponent> = {}) {
    if (!configurado) {
      configurado = true;
      await TestBed.configureTestingModule({ imports: [SharedModule] }).compileComponents();
    }
    const fixture = TestBed.createComponent(PeekRatingComponent);
    for (const [clave, valor] of Object.entries(entradas)) fixture.componentRef.setInput(clave, valor);
    const cambios = vi.fn();
    const previas = vi.fn();
    fixture.componentInstance.valueChange.subscribe(cambios);
    fixture.componentInstance.preview.subscribe(previas);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const fila = el.querySelector('.peek-rating__row') as HTMLElement;
    return { fixture, el, fila, cambios, previas, estrellas: () => Array.from(el.querySelectorAll<HTMLElement>('.peek-rating__star')) };
  }

  const tecla = (destino: HTMLElement, key: string): KeyboardEvent => {
    const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    destino.dispatchEvent(e);
    return e;
  };
  const puntero = (tipo: string, tipoPuntero: string, x = 0, y = 0, id = 1, boton = 0): Event => {
    const e = new MouseEvent(tipo, { bubbles: true, clientX: x, clientY: y, button: boton });
    Object.defineProperty(e, 'pointerType', { value: tipoPuntero });
    Object.defineProperty(e, 'pointerId', { value: id });
    return e;
  };
  /** Una fila de 5 casillas de 40 px (200 px) con la esquina en 0,0. */
  const conCaja = (fila: HTMLElement): void => {
    fila.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 40, bottom: 40, right: 200 }) as DOMRect;
    fila.setPointerCapture = vi.fn();
  };
  const encendidas = (el: HTMLElement): number => el.querySelectorAll('.peek-rating__glyph[data-lit="true"]').length;

  describe('contenido', () => {
    it('es un grupo de radios con una casilla por glifo, nombres en español y una sola con Tab', async () => {
      const { el, estrellas } = await crear({ defaultValue: 3, labels: ['Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'] });
      expect(el.querySelector('[role="radiogroup"]')?.getAttribute('aria-label')).toBe('Calificación');
      expect(estrellas()).toHaveLength(5);
      expect(estrellas()[2].getAttribute('aria-label')).toBe('3 de 5, Regular');
      expect(estrellas()[2].getAttribute('aria-checked')).toBe('true');
      expect(estrellas().map((e) => e.tabIndex)).toEqual([-1, -1, 0, -1, -1]);
      expect(encendidas(el)).toBe(3);
    });

    it('sin valor, la primera casilla entra con Tab y no hay nada encendido; sin etiquetas solo dice el número', async () => {
      const { el, estrellas } = await crear();
      expect(estrellas().map((e) => e.tabIndex)).toEqual([0, -1, -1, -1, -1]);
      expect(estrellas()[0].getAttribute('aria-label')).toBe('1 de 5');
      expect(encendidas(el)).toBe(0);
    });

    it('acepta otras formas, otro número de glifos y un nombre accesible propio', async () => {
      const { el, estrellas } = await crear({ shape: 'heart', count: 3, ariaLabel: 'Me gusta' });
      expect(estrellas()).toHaveLength(3);
      expect(el.querySelector('[role="radiogroup"]')?.getAttribute('aria-label')).toBe('Me gusta');
      const corazon = el.querySelector('path')!.getAttribute('d');
      const rayo = (await crear({ shape: 'bolt' })).el.querySelector('path')!.getAttribute('d');
      const estrella = (await crear({ shape: 'x' as 'star' })).el.querySelector('path')!.getAttribute('d');
      expect(new Set([corazon, rayo, estrella]).size).toBe(3);
    });

    it('con value controla el valor y lo limita al máximo', async () => {
      const { el } = await crear({ value: 9 });
      expect(encendidas(el)).toBe(5);
    });

    it('aplica los colores y tamaños como variables CSS', async () => {
      const { el } = await crear({ activeColor: '#d98e4a', size: 40, lift: 7 });
      const raiz = el.querySelector('.peek-rating') as HTMLElement;
      expect(raiz.style.getPropertyValue('--pr-active')).toBe('#d98e4a');
      expect(raiz.style.getPropertyValue('--pr-size')).toBe('40px');
      expect(raiz.style.getPropertyValue('--pr-room')).toBe('43px');
    });
  });

  describe('teclado', () => {
    it('las flechas suben y bajan, Inicio y Fin saltan, y emiten el valor', async () => {
      const { estrellas, cambios, fixture } = await crear({ defaultValue: 2 });
      const e = tecla(estrellas()[1], 'ArrowRight');
      expect(e.defaultPrevented).toBe(true);
      expect(cambios).toHaveBeenLastCalledWith(3);
      fixture.detectChanges();
      expect(document.activeElement).toBe(estrellas()[2]);

      tecla(estrellas()[2], 'ArrowUp');
      expect(cambios).toHaveBeenLastCalledWith(4);
      tecla(estrellas()[3], 'ArrowLeft');
      expect(cambios).toHaveBeenLastCalledWith(3);
      tecla(estrellas()[2], 'ArrowDown');
      expect(cambios).toHaveBeenLastCalledWith(2);
      tecla(estrellas()[1], 'End');
      expect(cambios).toHaveBeenLastCalledWith(5);
      tecla(estrellas()[4], 'ArrowRight');
      expect(cambios).toHaveBeenLastCalledWith(5);
      tecla(estrellas()[4], 'Home');
      expect(cambios).toHaveBeenLastCalledWith(1);
    });

    it('Retroceso y Suprimir borran la nota (si se permite) y Espacio o Enter alternan la casilla', async () => {
      const { estrellas, cambios } = await crear({ defaultValue: 3 });
      tecla(estrellas()[2], 'Backspace');
      expect(cambios).toHaveBeenLastCalledWith(0);
      tecla(estrellas()[0], 'Delete');
      expect(cambios).toHaveBeenLastCalledWith(0);

      tecla(estrellas()[1], ' ');
      expect(cambios).toHaveBeenLastCalledWith(2);
      tecla(estrellas()[1], 'Enter');
      expect(cambios).toHaveBeenLastCalledWith(0);
    });

    it('sin allowClear no baja de 1 ni borra', async () => {
      const { estrellas, cambios } = await crear({ defaultValue: 1, allowClear: false });
      tecla(estrellas()[0], 'ArrowLeft');
      expect(cambios).toHaveBeenLastCalledWith(1);
      cambios.mockClear();
      tecla(estrellas()[0], 'Backspace');
      expect(cambios).not.toHaveBeenCalled();
      tecla(estrellas()[0], 'Enter');
      expect(cambios).toHaveBeenLastCalledWith(1);
    });

    it('otras teclas, o Enter fuera de una casilla, no hacen nada', async () => {
      const { el, estrellas, cambios } = await crear({ defaultValue: 2 });
      const e = tecla(estrellas()[0], 'a');
      expect(e.defaultPrevented).toBe(false);
      tecla(el.querySelector('.peek-rating__row') as HTMLElement, 'Enter');
      expect(cambios).not.toHaveBeenCalled();
    });

    it('con value controlado emite el cambio y espera a que el padre lo aplique', async () => {
      const { el, estrellas, cambios, fixture } = await crear({ value: 2 });
      tecla(estrellas()[1], 'ArrowRight');
      expect(cambios).toHaveBeenCalledWith(3);
      fixture.componentRef.setInput('value', 3);
      fixture.detectChanges();
      expect(encendidas(el)).toBe(3);
    });
  });

  describe('puntero', () => {
    it('el mouse explora: levanta las casillas, enciende hasta la explorada y muestra la etiqueta', async () => {
      const { el, fila, previas } = await crear({ labels: ['Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'], lift: 7, magnify: 1.2 });
      conCaja(fila);
      fila.dispatchEvent(puntero('pointerenter', 'mouse'));
      fila.dispatchEvent(puntero('pointermove', 'mouse', 90, 10));

      expect(encendidas(el)).toBe(3);
      const levantes = Array.from(el.querySelectorAll<HTMLElement>('.peek-rating__lift'));
      expect(levantes[2].style.transform).toBe('translateY(-7px) scale(1.2)');
      expect(levantes[0].style.transform).toBe('translateY(-7px) scale(1)');
      expect(levantes[3].style.transform).toBe('translateY(0px) scale(1)');
      const punta = el.querySelector('.peek-rating__tip') as HTMLElement;
      expect(punta.dataset['show']).toBe('true');
      expect(punta.textContent).toBe('Regular');
      expect(previas).toHaveBeenLastCalledWith(3);

      fila.dispatchEvent(puntero('pointermove', 'mouse', 190, 10));
      expect(punta.textContent).toBe('Excelente');
      fila.dispatchEvent(puntero('pointerleave', 'mouse'));
      expect(punta.dataset['show']).toBe('false');
      expect(previas).toHaveBeenLastCalledWith(null);
      expect(encendidas(el)).toBe(0);
    });

    it('sin etiquetas la punta muestra el número', async () => {
      const { el, fila } = await crear();
      conCaja(fila);
      fila.dispatchEvent(puntero('pointermove', 'mouse', 10, 10));
      expect(el.querySelector('.peek-rating__tip')?.textContent).toBe('1');
    });

    it('sin showTip no hay punta', async () => {
      const { el } = await crear({ showTip: false });
      expect(el.querySelector('.peek-rating__tip')).toBeNull();
    });

    it('un clic con el botón principal confirma, y repetirlo sobre la misma nota la borra', async () => {
      const { el, fila, cambios } = await crear();
      conCaja(fila);
      fila.dispatchEvent(puntero('pointerdown', 'mouse', 90, 10));
      fila.dispatchEvent(puntero('pointerup', 'mouse', 90, 10));
      expect(cambios).toHaveBeenLastCalledWith(3);
      expect(encendidas(el)).toBe(3);

      fila.dispatchEvent(puntero('pointerdown', 'mouse', 90, 10));
      fila.dispatchEvent(puntero('pointerup', 'mouse', 90, 10));
      expect(cambios).toHaveBeenLastCalledWith(0);
    });

    it('con el botón derecho o con otro puntero ya presionando no hace nada', async () => {
      const { fila, cambios } = await crear();
      conCaja(fila);
      fila.dispatchEvent(puntero('pointerdown', 'mouse', 90, 10, 1, 2));
      fila.dispatchEvent(puntero('pointerup', 'mouse', 90, 10));
      expect(cambios).not.toHaveBeenCalled();

      fila.dispatchEvent(puntero('pointerdown', 'touch', 90, 10, 5));
      fila.dispatchEvent(puntero('pointerdown', 'touch', 10, 10, 6));
      fila.dispatchEvent(puntero('pointermove', 'touch', 10, 10, 6));
      fila.dispatchEvent(puntero('pointerup', 'touch', 10, 10, 6));
      expect(cambios).not.toHaveBeenCalled();
    });

    it('el toque arrastra y confirma al soltar; si el dedo sale de la fila, cancela; un toque libre no explora', async () => {
      const { el, fila, cambios } = await crear();
      conCaja(fila);
      fila.dispatchEvent(puntero('pointermove', 'touch', 10, 10, 4));
      expect(encendidas(el)).toBe(0);

      fila.dispatchEvent(puntero('pointerdown', 'touch', 10, 10, 4));
      fila.dispatchEvent(puntero('pointermove', 'touch', 150, 20, 4));
      expect(encendidas(el)).toBe(4);
      fila.dispatchEvent(puntero('pointerup', 'touch', 150, 20, 4));
      expect(cambios).toHaveBeenLastCalledWith(4);
      expect(encendidas(el)).toBe(4);

      cambios.mockClear();
      fila.dispatchEvent(puntero('pointerdown', 'touch', 10, 10, 8));
      fila.dispatchEvent(puntero('pointermove', 'touch', 150, 200, 8));
      fila.dispatchEvent(puntero('pointerup', 'touch', 150, 200, 8));
      expect(cambios).not.toHaveBeenCalled();
    });

    it('cancelar el toque no confirma', async () => {
      const { fila, cambios } = await crear();
      conCaja(fila);
      fila.dispatchEvent(puntero('pointerdown', 'touch', 10, 10, 4));
      fila.dispatchEvent(puntero('pointercancel', 'touch', 10, 10, 4));
      expect(cambios).not.toHaveBeenCalled();
    });

    it('funciona aunque el navegador no pueda capturar el puntero', async () => {
      const { fila, cambios } = await crear();
      conCaja(fila);
      fila.setPointerCapture = () => {
        throw new Error('sin captura');
      };
      fila.dispatchEvent(puntero('pointerdown', 'mouse', 90, 10));
      fila.dispatchEvent(puntero('pointerup', 'mouse', 90, 10));
      expect(cambios).toHaveBeenCalledWith(3);
    });

    it('sin medidas (fila sin ancho) no explora', async () => {
      const { el, fila } = await crear();
      fila.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0, bottom: 0, right: 0 }) as DOMRect;
      fila.dispatchEvent(puntero('pointermove', 'mouse', 10, 10));
      expect(encendidas(el)).toBe(0);
    });

    it('en escritura de derecha a izquierda la primera casilla queda a la derecha', async () => {
      const { el, fila } = await crear();
      conCaja(fila);
      fila.style.direction = 'rtl';
      fila.dispatchEvent(puntero('pointerenter', 'mouse'));
      fila.dispatchEvent(puntero('pointermove', 'mouse', 190, 10));
      expect(el.querySelector('.peek-rating__tip')?.textContent).toBe('1');
    });

    it('la ventana que pierde el foco o la pestaña que se oculta cancelan la exploración', async () => {
      const { el, fila, previas } = await crear();
      conCaja(fila);
      fila.dispatchEvent(puntero('pointermove', 'mouse', 90, 10));
      expect(encendidas(el)).toBe(3);
      window.dispatchEvent(new Event('blur'));
      expect(encendidas(el)).toBe(0);
      expect(previas).toHaveBeenLastCalledWith(null);

      fila.dispatchEvent(puntero('pointermove', 'mouse', 90, 10));
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(encendidas(el)).toBe(3);
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(encendidas(el)).toBe(0);
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    });
  });

  describe('pop al confirmar', () => {
    it('anima la casilla elegida con el puntero, pero no con el teclado', async () => {
      const animar = vi.fn();
      const original = HTMLElement.prototype.animate;
      Object.defineProperty(HTMLElement.prototype, 'animate', { value: animar, configurable: true, writable: true });
      HTMLElement.prototype.getAnimations = () => [];
      try {
        const { fila, estrellas } = await crear({ popScale: 1.4 });
        conCaja(fila);
        fila.dispatchEvent(puntero('pointerdown', 'mouse', 90, 10));
        fila.dispatchEvent(puntero('pointerup', 'mouse', 90, 10));
        expect(animar).toHaveBeenCalledTimes(1);
        expect((animar.mock.calls[0][0] as Keyframe[])[1]['transform']).toBe('scale(1.4)');

        tecla(estrellas()[2], 'ArrowRight');
        expect(animar).toHaveBeenCalledTimes(1);
      } finally {
        Object.defineProperty(HTMLElement.prototype, 'animate', { value: original, configurable: true, writable: true });
      }
    });

    it('con popScale 1 o con movimiento reducido no anima', async () => {
      const animar = vi.fn();
      Object.defineProperty(HTMLElement.prototype, 'animate', { value: animar, configurable: true, writable: true });
      try {
        const sinPop = await crear({ popScale: 1 });
        conCaja(sinPop.fila);
        sinPop.fila.dispatchEvent(puntero('pointerdown', 'mouse', 90, 10));
        sinPop.fila.dispatchEvent(puntero('pointerup', 'mouse', 90, 10));

        reducido = true;
        const quieto = await crear();
        conCaja(quieto.fila);
        quieto.fila.dispatchEvent(puntero('pointerdown', 'mouse', 90, 10));
        quieto.fila.dispatchEvent(puntero('pointerup', 'mouse', 90, 10));
        expect(animar).not.toHaveBeenCalled();
      } finally {
        delete (HTMLElement.prototype as { animate?: unknown }).animate;
      }
    });
  });

  describe('movimiento reducido', () => {
    it('explora y enciende, pero sin levantar las casillas', async () => {
      reducido = true;
      const { el, fila } = await crear({ lift: 7 });
      conCaja(fila);
      fila.dispatchEvent(puntero('pointermove', 'mouse', 90, 10));
      expect(encendidas(el)).toBe(3);
      expect(el.querySelector<HTMLElement>('.peek-rating__lift')!.style.transform).toBe('translateY(0px) scale(1)');
    });

    it('funciona aunque no exista matchMedia', async () => {
      vi.stubGlobal('matchMedia', undefined);
      const { el } = await crear({ defaultValue: 2 });
      expect(encendidas(el)).toBe(2);
    });
  });

  describe('solo lectura y deshabilitado', () => {
    it('readOnly se anuncia como imagen, sin botones, sin punta y sin reaccionar', async () => {
      const { el, fila, cambios } = await crear({ value: 4, readOnly: true });
      const raiz = el.querySelector('.peek-rating')!;
      expect(raiz.getAttribute('role')).toBe('img');
      expect(raiz.getAttribute('aria-label')).toBe('4 de 5 estrellas');
      expect(el.querySelector('button')).toBeNull();
      expect(el.querySelector('.peek-rating__tip')).toBeNull();
      expect(encendidas(el)).toBe(4);

      conCaja(fila);
      fila.dispatchEvent(puntero('pointerdown', 'mouse', 10, 10));
      fila.dispatchEvent(puntero('pointerup', 'mouse', 10, 10));
      tecla(el.querySelector('.peek-rating__star') as HTMLElement, 'End');
      expect(cambios).not.toHaveBeenCalled();
    });

    it('disabled se marca, no tiene casillas con Tab y no responde', async () => {
      const { el, fila, estrellas, cambios } = await crear({ defaultValue: 2, disabled: true });
      expect(el.querySelector('.peek-rating')?.getAttribute('aria-disabled')).toBe('true');
      expect(estrellas().every((e) => e.tabIndex === -1)).toBe(true);
      conCaja(fila);
      fila.dispatchEvent(puntero('pointerenter', 'mouse'));
      fila.dispatchEvent(puntero('pointerdown', 'mouse', 90, 10));
      fila.dispatchEvent(puntero('pointermove', 'mouse', 90, 10));
      tecla(estrellas()[0], 'End');
      expect(cambios).not.toHaveBeenCalled();
      expect(encendidas(el)).toBe(2);
    });
  });

  describe('limpieza', () => {
    it('al destruir quita todos sus eventos, incluidos los de la ventana y el documento', async () => {
      const { fixture, fila, el } = await crear();
      const quitadosFila: string[] = [];
      const quitarFila = fila.removeEventListener.bind(fila);
      fila.removeEventListener = ((tipo: string, ...r: unknown[]) => {
        quitadosFila.push(tipo);
        (quitarFila as (...a: unknown[]) => void)(tipo, ...r);
      }) as typeof fila.removeEventListener;
      const raiz = el.querySelector('.peek-rating') as HTMLElement;
      const quitarRaiz = vi.spyOn(raiz, 'removeEventListener');
      const quitarDocumento = vi.spyOn(document, 'removeEventListener');
      const quitarVentana = vi.spyOn(window, 'removeEventListener');

      fixture.destroy();

      expect(quitadosFila.sort()).toEqual(['lostpointercapture', 'pointercancel', 'pointerdown', 'pointerenter', 'pointerleave', 'pointermove', 'pointerup']);
      expect(quitarRaiz).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(quitarDocumento).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      expect(quitarVentana).toHaveBeenCalledWith('blur', expect.any(Function));
    });
  });
});
