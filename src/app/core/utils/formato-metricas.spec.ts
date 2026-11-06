import { describe, expect, it } from 'vitest';

import { formatearCantidad, formatearDia, formatearPromedio, formatearTasa } from './formato-metricas';

describe('formato-metricas', () => {
  it('la tasa lleva siempre un decimal y el signo de porcentaje', () => {
    expect(formatearTasa(5)).toBe('5,0 %');
    expect(formatearTasa(0)).toBe('0,0 %');
    expect(formatearTasa(33.333)).toBe('33,3 %');
    expect(formatearTasa(100)).toBe('100,0 %');
  });

  it('una tasa que no es número queda vacía', () => {
    expect(formatearTasa(null)).toBe('');
    expect(formatearTasa(undefined)).toBe('');
    expect(formatearTasa(Number.NaN)).toBe('');
  });

  it('el promedio lleva un decimal y, sin calificaciones, lo dice', () => {
    expect(formatearPromedio(5)).toBe('5,0');
    expect(formatearPromedio(4.25)).toBe('4,3');
    expect(formatearPromedio(null)).toBe('Sin calificaciones');
    expect(formatearPromedio(undefined)).toBe('Sin calificaciones');
    expect(formatearPromedio(Number.NaN)).toBe('Sin calificaciones');
  });

  it('las cantidades llevan separador de miles', () => {
    expect(formatearCantidad(20)).toBe('20');
    expect(formatearCantidad(1250)).toBe('1.250');
    expect(formatearCantidad(0)).toBe('0');
    expect(formatearCantidad(null)).toBe('');
    expect(formatearCantidad(Number.NaN)).toBe('');
  });

  it('el día se escribe corto y en español, sin puntos', () => {
    expect(formatearDia('2026-10-08')).toBe('8 oct 2026');
    expect(formatearDia('2026-11-06')).toBe('6 nov 2026');
    expect(formatearDia('2026-01-01')).toBe('1 ene 2026');
  });
});
