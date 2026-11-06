import { describe, expect, it } from 'vitest';

import { aFechaHoraInput, aFechaHoraLocal, aFechaIso, aLocalDateTime, parsearFechaLocal } from './fecha-local';

describe('fecha-local', () => {
  it('parsea un LocalDateTime sin cambiar de zona', () => {
    const fecha = parsearFechaLocal('2026-10-13T08:30:15');
    expect([fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), fecha.getHours(), fecha.getMinutes(), fecha.getSeconds()]).toEqual([2026, 9, 13, 8, 30, 15]);
    expect(parsearFechaLocal('2026-10-13').getHours()).toBe(0);
  });

  it('da la fecha de calendario local y une fecha y hora', () => {
    expect(aFechaIso(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(aFechaHoraLocal('2026-10-13', '08:00')).toBe('2026-10-13T08:00:00');
  });

  it('da el valor de un datetime-local con ceros a la izquierda', () => {
    expect(aFechaHoraInput(new Date(2026, 0, 5, 7, 4))).toBe('2026-01-05T07:04');
  });

  it('completa con segundos lo que escribió la persona', () => {
    expect(aLocalDateTime('2026-11-04T10:00')).toBe('2026-11-04T10:00:00');
    expect(aLocalDateTime('2026-11-04T10:00:30')).toBe('2026-11-04T10:00:00');
  });
});
