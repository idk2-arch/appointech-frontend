import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ElementoSpotlight, SpotlightService } from './spotlight.service';

type Falso = ElementoSpotlight & {
  avanzar: ReturnType<typeof vi.fn>;
  alMover: ReturnType<typeof vi.fn>;
  alSoltar: ReturnType<typeof vi.fn>;
  alSalir: ReturnType<typeof vi.fn>;
  alDesplazar: ReturnType<typeof vi.fn>;
};

const creados: Falso[] = [];

function falso(): Falso {
  const tarjeta: Falso = {
    elemento: document.createElement('div'),
    visible: true,
    avanzar: vi.fn().mockReturnValue(false),
    alMover: vi.fn().mockReturnValue(true),
    alSoltar: vi.fn().mockReturnValue(true),
    alSalir: vi.fn().mockReturnValue(true),
    alDesplazar: vi.fn().mockReturnValue(true),
  };
  creados.push(tarjeta);
  return tarjeta;
}

function disparar(destino: EventTarget, tipo: string, propiedades: Record<string, unknown> = {}): void {
  destino.dispatchEvent(Object.assign(new Event(tipo, { bubbles: true }), propiedades));
}

class ObservadorFalso {
  static ultimo?: ObservadorFalso;
  observados = new Set<Element>();
  desconectado = false;
  constructor(public alCambiar: IntersectionObserverCallback) {
    ObservadorFalso.ultimo = this;
  }
  observe(el: Element): void {
    this.observados.add(el);
  }
  unobserve(el: Element): void {
    this.observados.delete(el);
  }
  disconnect(): void {
    this.desconectado = true;
  }
  emitir(el: Element, visible: boolean): void {
    this.alCambiar([{ target: el, isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

describe('SpotlightService', () => {
  let servicio: SpotlightService;
  let cuadros: FrameRequestCallback[];

  const pasarCuadro = (ahora = 16): void => {
    const pendientes = cuadros.splice(0);
    pendientes.forEach((cb) => cb(ahora));
  };

  beforeEach(() => {
    cuadros = [];
    ObservadorFalso.ultimo = undefined;
    vi.stubGlobal('IntersectionObserver', ObservadorFalso);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => cuadros.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    servicio = TestBed.inject(SpotlightService);
  });

  afterEach(() => {
    // Los oyentes son de `window`: hay que soltarlos para que no se filtren a la prueba siguiente.
    creados.splice(0).forEach((tarjeta) => servicio.desregistrar(tarjeta));
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('escucha el puntero una sola vez aunque haya varias tarjetas y deja de escuchar al quedar vacío', () => {
    const agregar = vi.spyOn(window, 'addEventListener');
    const quitar = vi.spyOn(window, 'removeEventListener');
    const a = falso();
    const b = falso();

    servicio.registrar(a);
    servicio.registrar(b);
    expect(agregar.mock.calls.filter(([tipo]) => tipo === 'pointermove')).toHaveLength(1);

    servicio.desregistrar(a);
    expect(quitar).not.toHaveBeenCalled();
    servicio.desregistrar(b);
    expect(quitar.mock.calls.map(([tipo]) => tipo)).toEqual(
      expect.arrayContaining(['pointermove', 'pointerup', 'pointercancel', 'scroll'])
    );
    expect(ObservadorFalso.ultimo?.desconectado).toBe(true);
    servicio.desregistrar(b);
  });

  it('reparte la posición del puntero a las tarjetas visibles y dibuja solo las despiertas', () => {
    const visible = falso();
    const oculta = falso();
    oculta.visible = false;
    servicio.registrar(visible);
    servicio.registrar(oculta);
    cuadros.length = 0;

    disparar(window, 'pointermove', { clientX: 30, clientY: 40 });

    expect(servicio.puntero).toEqual({ x: 30, y: 40, activo: true });
    expect(visible.alMover).toHaveBeenCalled();
    expect(oculta.alMover).not.toHaveBeenCalled();

    pasarCuadro(100);
    expect(visible.avanzar).toHaveBeenCalledWith(100, servicio.puntero);
    expect(oculta.avanzar).not.toHaveBeenCalled();
    expect(cuadros).toHaveLength(0);
  });

  it('sigue dibujando mientras la tarjeta lo pida', () => {
    const tarjeta = falso();
    tarjeta.avanzar.mockReturnValueOnce(true).mockReturnValue(false);
    servicio.registrar(tarjeta);
    cuadros.length = 0;
    servicio.despertar(tarjeta);
    servicio.despertar(tarjeta);
    expect(cuadros).toHaveLength(1);

    pasarCuadro();
    expect(cuadros).toHaveLength(1);
    pasarCuadro();
    expect(tarjeta.avanzar).toHaveBeenCalledTimes(2);
    expect(cuadros).toHaveLength(0);
  });

  it('no despierta una tarjeta que no quiere moverse', () => {
    const tarjeta = falso();
    tarjeta.alMover.mockReturnValue(false);
    servicio.registrar(tarjeta);
    cuadros.length = 0;

    disparar(window, 'pointermove', { clientX: 1, clientY: 1 });
    expect(cuadros).toHaveLength(0);
  });

  it('ignora el despertar de una tarjeta no registrada', () => {
    servicio.despertar(falso());
    expect(cuadros).toHaveLength(0);
  });

  it('al soltar un toque apaga el puntero; con el mouse lo conserva', () => {
    const tarjeta = falso();
    servicio.registrar(tarjeta);
    servicio.fijarPuntero(5, 5);

    disparar(window, 'pointerup', { pointerType: 'mouse' });
    expect(servicio.puntero.activo).toBe(true);
    expect(tarjeta.alSoltar).toHaveBeenCalledWith('mouse');

    disparar(window, 'pointercancel', { pointerType: 'touch' });
    expect(servicio.puntero.activo).toBe(false);
    expect(tarjeta.alSoltar).toHaveBeenCalledWith('touch');
  });

  it('al salir el puntero de la ventana apaga la luz, pero no al pasar a otro elemento', () => {
    const tarjeta = falso();
    servicio.registrar(tarjeta);
    servicio.fijarPuntero(5, 5);

    disparar(document, 'pointerout', { relatedTarget: document.body });
    expect(servicio.puntero.activo).toBe(true);
    expect(tarjeta.alSalir).not.toHaveBeenCalled();

    disparar(document, 'pointerout', { relatedTarget: null });
    expect(servicio.puntero.activo).toBe(false);
    expect(tarjeta.alSalir).toHaveBeenCalled();
  });

  it('al desplazarse consulta a cada tarjeta', () => {
    const tarjeta = falso();
    servicio.registrar(tarjeta);
    disparar(window, 'scroll');
    expect(tarjeta.alDesplazar).toHaveBeenCalledWith(servicio.puntero);
  });

  it('marca la visibilidad con el IntersectionObserver y despierta al aparecer', () => {
    const tarjeta = falso();
    servicio.registrar(tarjeta);
    cuadros.length = 0;
    const observador = ObservadorFalso.ultimo!;
    expect(observador.observados.has(tarjeta.elemento)).toBe(true);

    observador.emitir(tarjeta.elemento, false);
    expect(tarjeta.visible).toBe(false);
    expect(cuadros).toHaveLength(0);

    observador.emitir(tarjeta.elemento, true);
    expect(tarjeta.visible).toBe(true);
    expect(cuadros).toHaveLength(1);

    observador.emitir(document.createElement('p'), true);
  });

  it('sin IntersectionObserver trata las tarjetas como visibles y las dibuja de inmediato', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const tarjeta = falso();
    servicio.registrar(tarjeta);
    expect(cuadros).toHaveLength(1);
    servicio.desregistrar(tarjeta);
  });

  it('sin navegador no registra nada', () => {
    vi.spyOn(servicio, 'hayNavegador', 'get').mockReturnValue(false);
    const agregar = vi.spyOn(window, 'addEventListener');
    servicio.registrar(falso());
    expect(agregar).not.toHaveBeenCalled();
    expect(servicio.esTactil).toBe(false);
    expect(servicio.prefiereMenosMovimiento).toBe(false);
  });

  it('detecta pantallas táctiles y la preferencia de menos movimiento', () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('hover: none') }));
    expect(servicio.esTactil).toBe(true);
    expect(servicio.prefiereMenosMovimiento).toBe(false);

    vi.stubGlobal('matchMedia', undefined);
    expect(servicio.esTactil).toBe(false);
    expect(servicio.prefiereMenosMovimiento).toBe(false);
  });
});
