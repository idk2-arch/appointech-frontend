import { describe, expect, it } from 'vitest';

import { armarSolicitudIA } from './solicitud-ia';

describe('armarSolicitudIA', () => {
  it('quita los espacios sobrantes de la descripción y de la especialidad', () => {
    expect(armarSolicitudIA('  No enfría ', ' Neveras ')).toEqual({
      descripcionProblema: 'No enfría',
      especialidad: 'Neveras',
    });
  });

  it('sin especialidad (vacía, nula o indefinida) no incluye la clave', () => {
    expect(armarSolicitudIA('x', '  ')).toEqual({ descripcionProblema: 'x' });
    expect(armarSolicitudIA('x', null)).toEqual({ descripcionProblema: 'x' });
    expect(armarSolicitudIA('x', undefined)).toEqual({ descripcionProblema: 'x' });
  });

  it('una descripción nula queda vacía', () => {
    expect(armarSolicitudIA(null, 'Neveras').descripcionProblema).toBe('');
  });
});
