import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SelectorDiaComponent } from './selector-dia.component';
import '../tecnico.module';

describe('SelectorDiaComponent', () => {
  let componente: SelectorDiaComponent;
  let cambios: string[];

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 9, 27, 12, 0, 0), toFake: ['Date'] });
    componente = new SelectorDiaComponent();
    cambios = [];
    componente.fechaCambio.subscribe((f) => cambios.push(f));
  });

  afterEach(() => vi.useRealTimers());

  it('empieza en hoy', () => {
    expect(componente.fecha).toBe('2026-10-27');
    expect(componente.esHoy).toBe(true);
  });

  it('"esHoy" es falso en otro día', () => {
    componente.fecha = '2026-10-28';
    expect(componente.esHoy).toBe(false);
  });

  it('día anterior y siguiente', () => {
    componente.moverDias(-1);
    componente.moverDias(1);
    // La fecha de entrada no cambia sola: ambos movimientos parten de hoy.
    expect(cambios).toEqual(['2026-10-26', '2026-10-28']);
  });

  it('mover días cruza el fin de mes y de año', () => {
    componente.fecha = '2026-10-31';
    componente.moverDias(1);
    componente.fecha = '2026-12-31';
    componente.moverDias(1);
    componente.fecha = '2026-03-01';
    componente.moverDias(-1);
    expect(cambios).toEqual(['2026-11-01', '2027-01-01', '2026-02-28']);
  });

  it('volver a hoy emite el día de hoy', () => {
    componente.fecha = '2026-11-05';
    componente.irAHoy();
    expect(cambios).toEqual(['2026-10-27']);
  });

  it('volver a hoy estando en hoy no emite nada', () => {
    componente.irAHoy();
    expect(cambios).toEqual([]);
  });

  it('elegir una fecha en el calendario la emite', () => {
    componente.alElegir('2026-12-24');
    expect(cambios).toEqual(['2026-12-24']);
  });

  it('borrar la fecha del calendario (valor vacío) no emite nada', () => {
    componente.alElegir('');
    expect(cambios).toEqual([]);
  });

  it('elegir el mismo día que ya está no emite nada', () => {
    componente.alElegir('2026-10-27');
    expect(cambios).toEqual([]);
  });
});
