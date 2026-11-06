import { describe, expect, it } from 'vitest';

import { formatearDistanciaKm } from './distancia';

describe('formatearDistanciaKm', () => {
  it('da dos decimales con coma', () => {
    expect(formatearDistanciaKm(3.14)).toBe('3,14 km');
    expect(formatearDistanciaKm(3.1)).toBe('3,10 km');
    expect(formatearDistanciaKm(0)).toBe('0,00 km');
  });

  it('sin ubicación lo dice', () => {
    expect(formatearDistanciaKm(null)).toBe('Sin ubicación registrada');
    expect(formatearDistanciaKm(undefined)).toBe('Sin ubicación registrada');
    expect(formatearDistanciaKm(Number.NaN)).toBe('Sin ubicación registrada');
  });
});
