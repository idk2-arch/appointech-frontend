import { describe, expect, it } from 'vitest';

import { iniciales } from './iniciales';

describe('iniciales', () => {
  it('toma la inicial de las dos primeras palabras en mayúscula', () => {
    expect(iniciales('ana maría pérez')).toBe('AM');
  });

  it('con una sola palabra devuelve una inicial', () => {
    expect(iniciales('Luis')).toBe('L');
  });

  it('ignora espacios de más y maneja nombres vacíos', () => {
    expect(iniciales('  Ana   Pérez ')).toBe('AP');
    expect(iniciales('')).toBe('?');
    expect(iniciales(null)).toBe('?');
    expect(iniciales(undefined)).toBe('?');
  });
});
