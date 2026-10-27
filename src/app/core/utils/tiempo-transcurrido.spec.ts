import { describe, expect, it } from 'vitest';

import { esperaMasDeHoras, tiempoTranscurrido } from './tiempo-transcurrido';

const AHORA = new Date(2026, 9, 27, 12, 0, 0);

describe('tiempoTranscurrido', () => {
  it.each([
    ['2026-10-27T12:00:00', 'Hace un momento'],
    ['2026-10-27T11:59:30', 'Hace un momento'],
    ['2026-10-27T11:55:00', 'Hace 5 min'],
    ['2026-10-27T11:01:00', 'Hace 59 min'],
    ['2026-10-27T11:00:00', 'Hace 1 h'],
    ['2026-10-27T09:00:00', 'Hace 3 h'],
    ['2026-10-26T12:00:00', 'Hace 1 día'],
    ['2026-10-25T12:00:00', 'Hace 2 días'],
    ['2026-10-28T12:00:00', 'Hace un momento'],
  ])('%s → %s', (desde, esperado) => {
    expect(tiempoTranscurrido(desde, AHORA)).toBe(esperado);
  });
});

describe('esperaMasDeHoras', () => {
  it('es falso con exactamente 24 horas y verdadero con un minuto más', () => {
    expect(esperaMasDeHoras('2026-10-26T12:00:00', AHORA, 24)).toBe(false);
    expect(esperaMasDeHoras('2026-10-26T11:59:00', AHORA, 24)).toBe(true);
  });

  it('es falso para una solicitud reciente', () => {
    expect(esperaMasDeHoras('2026-10-27T08:00:00', AHORA, 24)).toBe(false);
  });
});
