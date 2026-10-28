import { describe, expect, it } from 'vitest';

import { KilometrosPipe, MinutosViajePipe } from './formato-viaje.pipes';

describe('KilometrosPipe', () => {
  const pipe = new KilometrosPipe();

  it('muestra un decimal con coma, a la colombiana', () => {
    expect(pipe.transform(12.34)).toBe('12,3 km');
    expect(pipe.transform(5)).toBe('5 km');
  });

  it('separa los miles', () => {
    expect(pipe.transform(1234.5)).toBe('1.234,5 km');
  });

  it('una distancia positiva que se redondearía a cero dice "menos de 0,1 km"', () => {
    expect(pipe.transform(0.04)).toBe('menos de 0,1 km');
  });

  it('cero se muestra como 0 km', () => {
    expect(pipe.transform(0)).toBe('0 km');
  });

  it('sin valor devuelve cadena vacía', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});

describe('MinutosViajePipe', () => {
  const pipe = new MinutosViajePipe();

  it('muestra minutos enteros', () => {
    expect(pipe.transform(12.4)).toBe('12 min');
    expect(pipe.transform(90)).toBe('90 min');
  });

  it('entre 0 y 1 minuto dice "menos de 1 min"', () => {
    expect(pipe.transform(0.4)).toBe('menos de 1 min');
  });

  it('cero se muestra como 0 min', () => {
    expect(pipe.transform(0)).toBe('0 min');
  });

  it('sin valor devuelve cadena vacía', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
