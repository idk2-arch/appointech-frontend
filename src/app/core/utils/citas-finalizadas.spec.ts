import { describe, expect, it } from 'vitest';

import { citaFinalizadaDe } from '../models/pago.mock';
import { contarSinCostoFinal, ordenarMasRecientesPrimero } from './citas-finalizadas';

describe('citas finalizadas', () => {
  it('ordena de la más reciente a la más antigua sin tocar la lista original', () => {
    const vieja = citaFinalizadaDe({ id: 1, fechaHoraFin: '2026-11-01T10:00:00' });
    const nueva = citaFinalizadaDe({ id: 2, fechaHoraFin: '2026-11-04T10:00:00' });
    const media = citaFinalizadaDe({ id: 3, fechaHoraFin: '2026-11-02T10:00:00' });
    const original = [vieja, nueva, media];

    expect(ordenarMasRecientesPrimero(original).map((c) => c.id)).toEqual([2, 3, 1]);
    expect(original.map((c) => c.id)).toEqual([1, 2, 3]);
  });

  it('cuenta las citas sin costo final', () => {
    const citas = [
      citaFinalizadaDe({ estadoPago: 'SIN_COSTO_FINAL' }),
      citaFinalizadaDe({ estadoPago: 'PAGADO' }),
      citaFinalizadaDe({ estadoPago: 'SIN_COSTO_FINAL' }),
    ];
    expect(contarSinCostoFinal(citas)).toBe(2);
    expect(contarSinCostoFinal([])).toBe(0);
  });
});
