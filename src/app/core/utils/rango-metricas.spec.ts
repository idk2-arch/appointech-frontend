import { describe, expect, it } from 'vitest';

import { diasDelRango, MAX_DIAS_RANGO, rangoDePreset, validarRango } from './rango-metricas';

const HOY = new Date(2026, 10, 6); // 6 de noviembre de 2026

describe('rangoDePreset', () => {
  it('"Últimos 30 días" no envía fechas: es lo que el servidor usa por defecto', () => {
    expect(rangoDePreset('ultimos30', HOY)).toEqual({});
  });

  it('"Este mes" va del primer día del mes a hoy', () => {
    expect(rangoDePreset('esteMes', HOY)).toEqual({ desde: '2026-11-01', hasta: '2026-11-06' });
    expect(rangoDePreset('esteMes', new Date(2026, 10, 1))).toEqual({ desde: '2026-11-01', hasta: '2026-11-01' });
  });

  it('"Últimos 90 días" son 90 días contando hoy, también cuando cruza de año', () => {
    expect(rangoDePreset('ultimos90', HOY)).toEqual({ desde: '2026-08-09', hasta: '2026-11-06' });
    const cruce = rangoDePreset('ultimos90', new Date(2026, 1, 15));
    expect(cruce).toEqual({ desde: '2025-11-18', hasta: '2026-02-15' });
    expect(diasDelRango(cruce.desde!, cruce.hasta!)).toBe(90);
  });

  it('"Este año" va del 1 de enero a hoy', () => {
    expect(rangoDePreset('esteAnio', HOY)).toEqual({ desde: '2026-01-01', hasta: '2026-11-06' });
  });

  it('el personalizado no trae fechas propias', () => {
    expect(rangoDePreset('personalizado', HOY)).toEqual({});
  });

  it('ningún rango rápido supera el máximo, ni el último día de un año bisiesto', () => {
    const fin = rangoDePreset('esteAnio', new Date(2028, 11, 31));
    expect(diasDelRango(fin.desde!, fin.hasta!)).toBe(366);
    expect(validarRango(fin.desde!, fin.hasta!)).toBeNull();
  });
});

describe('diasDelRango', () => {
  it('cuenta el día inicial y el final', () => {
    expect(diasDelRango('2026-11-06', '2026-11-06')).toBe(1);
    expect(diasDelRango('2026-10-08', '2026-11-06')).toBe(30);
  });

  it('no se confunde con el cambio de hora ni con los años bisiestos', () => {
    expect(diasDelRango('2026-03-01', '2026-04-01')).toBe(32);
    expect(diasDelRango('2028-02-28', '2028-03-01')).toBe(3);
  });

  it('es negativo o cero si el orden está al revés y null si la fecha no existe', () => {
    expect(diasDelRango('2026-11-10', '2026-11-01')).toBe(-8);
    expect(diasDelRango('2026-02-30', '2026-03-01')).toBeNull();
    expect(diasDelRango('06/11/2026', '2026-11-07')).toBeNull();
    expect(diasDelRango('2026-11-06', '')).toBeNull();
  });
});

describe('validarRango', () => {
  it('acepta un rango normal y el mismo día', () => {
    expect(validarRango('2026-10-01', '2026-10-31')).toBeNull();
    expect(validarRango('2026-11-06', '2026-11-06')).toBeNull();
  });

  it('pide las dos fechas', () => {
    expect(validarRango('', '2026-11-06')).toBe('Elige la fecha inicial y la final.');
    expect(validarRango('2026-11-06', '')).toBe('Elige la fecha inicial y la final.');
  });

  it('rechaza un desde posterior al hasta', () => {
    expect(validarRango('2026-11-07', '2026-11-06')).toBe('La fecha inicial no puede ser posterior a la fecha final.');
  });

  it('el límite es 366 días: 366 pasa y 367 no', () => {
    expect(validarRango('2025-11-06', '2026-11-06')).toBeNull(); // 366 días contando ambos extremos
    expect(diasDelRango('2025-11-06', '2026-11-06')).toBe(MAX_DIAS_RANGO);
    expect(validarRango('2025-11-05', '2026-11-06')).toBe('El rango no puede superar 366 días.');
  });

  it('rechaza fechas con formato inválido o que no existen', () => {
    expect(validarRango('2026-13-01', '2026-11-06')).toBe('Revisa las fechas: el formato no es válido.');
    expect(validarRango('hoy', '2026-11-06')).toBe('Revisa las fechas: el formato no es válido.');
  });
});
