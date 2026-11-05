import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { animarNumero, curvaBezier, desplazamientoResorte, parametrosResorte } from './toast-animacion';
import { rubberband, velocidadDe } from './toast.utils';

describe('toast.utils', () => {
  it('la resistencia elástica crece más despacio que el arrastre y conserva el signo', () => {
    expect(rubberband(0, 24)).toBe(0);
    expect(rubberband(-10, 24)).toBeLessThan(0);
    expect(Math.abs(rubberband(-10, 24))).toBeLessThan(10);
    expect(Math.abs(rubberband(-100, 24))).toBeLessThan(24);
  });

  it('la velocidad sale de la primera y la última muestra, y es 0 si la última es vieja', () => {
    expect(velocidadDe([[0, 0]])).toBe(0);
    expect(velocidadDe([[100, 0], [150, 25]], 160)).toBeCloseTo(0.5);
    expect(velocidadDe([[100, 0], [150, 25]], 400)).toBe(0);
    expect(velocidadDe([[100, 5], [100, 25]], 110)).toBe(20);
  });
});

describe('curvaBezier', () => {
  it('es la identidad en los extremos y respeta la curva ease-out del original', () => {
    const facilidad = curvaBezier(0.23, 1, 0.32, 1);
    expect(facilidad(0)).toBe(0);
    expect(facilidad(1)).toBe(1);
    expect(facilidad(0.2)).toBeGreaterThan(0.5);
    expect(curvaBezier(0, 0, 1, 1)(0.4)).toBeCloseTo(0.4, 3);
  });

  it('con una pendiente nula en x no se cuelga', () => {
    expect(curvaBezier(0, 0, 0, 0)(0.5)).toBeGreaterThanOrEqual(0);
  });
});

describe('resorte', () => {
  it('con rebote 0 es críticamente amortiguado y se asienta sin cruzar el destino', () => {
    const parametros = parametrosResorte(0.3, 0);
    expect(parametros.zeta).toBe(1);
    const valores = [0, 0.05, 0.1, 0.2, 0.3].map((t) => desplazamientoResorte(t, 100, 0, parametros));
    expect(valores[0]).toBe(100);
    expect(valores.every((v) => v >= 0)).toBe(true);
    expect(valores[4]).toBeLessThan(1);
  });

  it('con rebote sobrepasa el destino una vez antes de asentarse', () => {
    const parametros = parametrosResorte(0.5, 0.2);
    const muestras = Array.from({ length: 50 }, (_, i) => desplazamientoResorte((i * 0.5) / 49, 100, 0, parametros));
    expect(muestras.some((v) => v < 0)).toBe(true);
    expect(Math.abs(muestras[49])).toBeLessThan(1);
  });

  it('la velocidad inicial empuja el desplazamiento', () => {
    const parametros = parametrosResorte(0.5, 0.2);
    expect(desplazamientoResorte(0.02, 50, 2000, parametros)).toBeGreaterThan(desplazamientoResorte(0.02, 50, 0, parametros));
  });

  it('limita el amortiguamiento y la duración a rangos seguros', () => {
    expect(parametrosResorte(0.5, 2).zeta).toBe(0.05);
    expect(parametrosResorte(0.5, -1).zeta).toBe(1);
    expect(Number.isFinite(parametrosResorte(0, 0).omega)).toBe(true);
  });
});

describe('animarNumero', () => {
  let cuadros: FrameRequestCallback[];

  const avanzar = (ahora: number): void => {
    const pendientes = cuadros.splice(0);
    pendientes.forEach((cb) => cb(ahora));
  };

  beforeEach(() => {
    cuadros = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => cuadros.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  it('un tween avanza con la curva y termina exactamente en el destino', () => {
    const valores: number[] = [];
    const alTerminar = vi.fn();
    animarNumero({ desde: 0, hasta: 100, duracionMs: 200, alActualizar: (v) => valores.push(v), alTerminar });

    avanzar(1000);
    avanzar(1100);
    expect(valores[1]).toBeCloseTo(50, 0);
    avanzar(1200);

    expect(valores.at(-1)).toBe(100);
    expect(alTerminar).toHaveBeenCalledExactlyOnceWith(true);
    expect(cuadros).toHaveLength(0);
  });

  it('un resorte parte del origen y termina en el destino', () => {
    const valores: number[] = [];
    const alTerminar = vi.fn();
    animarNumero({
      desde: 0,
      hasta: 100,
      duracionMs: 500,
      resorte: { bounce: 0.2, velocidad: 0 },
      alActualizar: (v) => valores.push(v),
      alTerminar,
    });

    avanzar(0);
    avanzar(250);
    expect(valores[0]).toBeCloseTo(0, 0);
    expect(valores[1]).toBeGreaterThan(50);
    avanzar(600);

    expect(valores.at(-1)).toBe(100);
    expect(alTerminar).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('cancelar detiene la animación y avisa que no terminó', () => {
    const alActualizar = vi.fn();
    const alTerminar = vi.fn();
    const control = animarNumero({ desde: 0, hasta: 10, duracionMs: 100, alActualizar, alTerminar });

    control.cancelar();
    control.cancelar();
    avanzar(0);

    expect(alActualizar).not.toHaveBeenCalled();
    expect(alTerminar).toHaveBeenCalledExactlyOnceWith(false);
  });
});
