import { describe, expect, it } from 'vitest';

import { desenvolverRespuesta } from './respuesta';

describe('desenvolverRespuesta', () => {
  it('si viene envuelta en ApiResponse devuelve los datos', () => {
    expect(desenvolverRespuesta<unknown>({ exito: true, datos: { id: 1 }, mensaje: 'ok', timestamp: '2026-10-28T10:00:00' })).toEqual({ id: 1 });
  });

  it('si viene directa la devuelve tal cual', () => {
    const directa = { id: 2, nombre: 'Ana' };
    expect(desenvolverRespuesta<unknown>(directa)).toBe(directa);
  });

  it('un objeto con solo "datos" (sin "exito") no cuenta como envuelto', () => {
    const parcial = { datos: [1, 2] };
    expect(desenvolverRespuesta<unknown>(parcial)).toBe(parcial);
  });

  it('un arreglo se devuelve tal cual', () => {
    const lista = [{ exito: true, datos: 1 }];
    expect(desenvolverRespuesta<unknown>(lista)).toBe(lista);
  });

  it('valores nulos o primitivos se devuelven tal cual', () => {
    expect(desenvolverRespuesta<unknown>(null)).toBeNull();
    expect(desenvolverRespuesta<unknown>('texto')).toBe('texto');
    expect(desenvolverRespuesta<unknown>(0)).toBe(0);
  });
});
