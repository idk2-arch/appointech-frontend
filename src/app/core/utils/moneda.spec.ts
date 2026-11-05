import { describe, expect, it } from 'vitest';

import { formatearPesos, formatearPorcentaje } from './moneda';

const normalizar = (texto: string): string => texto.replace(/\s/g, ' ');

describe('formatearPesos', () => {
  it('da pesos colombianos con separador de miles y sin decimales', () => {
    expect(normalizar(formatearPesos(120000))).toBe('$ 120.000');
    expect(normalizar(formatearPesos(1500.4))).toBe('$ 1.500');
  });

  it('formatea el cero', () => {
    expect(normalizar(formatearPesos(0))).toBe('$ 0');
  });

  it('deja vacío un valor ausente o no numérico', () => {
    expect(formatearPesos(null)).toBe('');
    expect(formatearPesos(undefined)).toBe('');
    expect(formatearPesos(Number.NaN)).toBe('');
  });
});

describe('formatearPorcentaje', () => {
  it('usa coma decimal y un decimal como máximo', () => {
    expect(normalizar(formatearPorcentaje(25.55))).toBe('25,6 %');
    expect(normalizar(formatearPorcentaje(30))).toBe('30 %');
  });

  it('deja vacío un valor ausente o no numérico', () => {
    expect(formatearPorcentaje(null)).toBe('');
    expect(formatearPorcentaje(undefined)).toBe('');
    expect(formatearPorcentaje(Number.NaN)).toBe('');
  });
});
