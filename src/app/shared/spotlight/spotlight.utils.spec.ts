import { describe, expect, it } from 'vitest';

import {
  caidaSpotlight,
  crearAjustes,
  degradadoSpotlight,
  EntradasSpotlight,
  limitar,
  paletaDe,
  TEMAS_SPOTLIGHT,
} from './spotlight.utils';

const base: EntradasSpotlight = {
  spotlightColor: '#d98e4a',
  intensity: 0.15,
  spotlightSize: 240,
  softness: 0.7,
  shape: 'circle',
  borderGlow: 0.6,
  proximity: 80,
  smoothing: 0.3,
  ambient: false,
  flare: true,
  grain: 0,
  theme: 'dark',
  tactil: false,
};

describe('spotlight.utils', () => {
  it('limita un valor a un rango', () => {
    expect(limitar(5, 0, 1)).toBe(1);
    expect(limitar(-5, 0, 1)).toBe(0);
    expect(limitar(0.4, 0, 1)).toBe(0.4);
  });

  it('la caída empieza opaca en el centro y termina transparente en el borde', () => {
    const paradas = caidaSpotlight('#fff', 0.7).split(', color-mix(');
    expect(paradas).toHaveLength(16);
    expect(paradas[0]).toContain('#fff 100.00%');
    expect(paradas[0]).toContain(' 0.00%');
    expect(paradas.at(-1)).toContain('#fff 0.00%');
    expect(paradas.at(-1)).toContain('100.00%');
  });

  it('con suavidad 0 el disco se mantiene opaco hasta el 85 % y con 1 el resplandor decae desde el centro', () => {
    const nitido = caidaSpotlight('red', 0).split(', color-mix(');
    const suave = caidaSpotlight('red', 1).split(', color-mix(');
    expect(nitido[1]).toContain('red 100.00%, transparent) 85.00%');
    expect(suave[1]).toContain('red 100.00%, transparent) 0.00%');
    expect(suave[2]).not.toContain('red 100.00%');
  });

  it('dibuja el círculo y el haz', () => {
    expect(degradadoSpotlight('circle', 100, 10, 20, 'X')).toBe('radial-gradient(circle 100.0px at 10.0px 20.0px, X)');
    expect(degradadoSpotlight('beam', 100, 10, 20, 'X')).toBe('radial-gradient(55.0px 75.0px at 10.0px 0px, X)');
    expect(degradadoSpotlight('beam', 100, 10, 0, 'X')).toBe('radial-gradient(55.0px 60.0px at 10.0px 0px, X)');
  });

  it('usa el tema oscuro si el pedido no existe', () => {
    expect(paletaDe('light')).toBe(TEMAS_SPOTLIGHT.light);
    expect(paletaDe('otro')).toBe(TEMAS_SPOTLIGHT.dark);
  });

  it('crea los ajustes del original con sus límites', () => {
    const a = crearAjustes({ ...base, intensity: 5, spotlightSize: 3, borderGlow: -1, proximity: -9, smoothing: 7, grain: 3 });
    expect(a).toMatchObject({ intensity: 1, size: 20, borderGlow: 0, proximity: 0, smoothing: 1, grain: 1, shape: 'circle', flare: true });
    expect(a.borde).toBe(TEMAS_SPOTLIGHT.dark.border);
  });

  it('atenúa la luz y el filo en el tema claro', () => {
    const a = crearAjustes({ ...base, theme: 'light', intensity: 1, borderGlow: 1 });
    expect(a.intensity).toBeCloseTo(0.28);
    expect(a.borderGlow).toBeCloseTo(0.7);
  });

  it('cae al círculo ante una forma desconocida y al color del tema sin color', () => {
    const a = crearAjustes({ ...base, shape: 'cuadrado', spotlightColor: '' });
    expect(a.shape).toBe('circle');
    expect(a.fill).toContain('#ffffff');
    expect(crearAjustes({ ...base, shape: 'beam' }).shape).toBe('beam');
  });

  it('en pantallas táctiles activa el ambiente aunque no se pida', () => {
    expect(crearAjustes(base).ambient).toBe(false);
    expect(crearAjustes({ ...base, tactil: true }).ambient).toBe(true);
    expect(crearAjustes({ ...base, ambient: true }).ambient).toBe(true);
  });
});
