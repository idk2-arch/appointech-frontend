import { describe, expect, it } from 'vitest';

import type { EstadoCita } from '../models/cita';
import { claseBarraEstado, claseInsigniaEstado, etiquetaEstadoCita } from './estado-cita';

const ESTADOS: EstadoCita[] = ['PENDIENTE', 'CONFIRMADA', 'EN_CAMINO', 'EN_PROCESO', 'FINALIZADA', 'CANCELADA'];

describe('estado-cita', () => {
  it('escribe cada estado en español', () => {
    expect(ESTADOS.map(etiquetaEstadoCita)).toEqual(['Pendiente', 'Confirmada', 'En camino', 'En proceso', 'Finalizada', 'Cancelada']);
    expect(etiquetaEstadoCita('OTRO' as EstadoCita)).toBe('OTRO');
  });

  it('cada estado tiene su insignia y un estado desconocido usa la de pendiente', () => {
    expect(claseInsigniaEstado('CANCELADA')).toContain('rose');
    expect(claseInsigniaEstado('OTRO' as EstadoCita)).toBe(claseInsigniaEstado('PENDIENTE'));
  });

  it('cada estado tiene una barra de un color distinto, del mismo tono que su insignia', () => {
    const barras = ESTADOS.map(claseBarraEstado);
    expect(new Set(barras).size).toBe(6);
    expect(claseBarraEstado('CONFIRMADA')).toContain('emerald');
    expect(claseBarraEstado('EN_CAMINO')).toContain('sky');
    expect(claseBarraEstado('EN_PROCESO')).toContain('amber');
    expect(claseBarraEstado('FINALIZADA')).toContain('violet');
    expect(claseBarraEstado('CANCELADA')).toContain('rose');
  });

  it('un estado desconocido usa la barra de pendiente', () => {
    expect(claseBarraEstado('OTRO' as EstadoCita)).toBe(claseBarraEstado('PENDIENTE'));
  });
});
