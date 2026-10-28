import { describe, expect, it } from 'vitest';

import { EstadoCita } from '../models/cita';
import { accionesTecnico, clientePuedeModificar } from './acciones-cita';

describe('accionesTecnico', () => {
  it('CONFIRMADA: "Voy en camino" y cancelar, sin diagnóstico', () => {
    const a = accionesTecnico('CONFIRMADA');
    expect(a.transicion).toMatchObject({ destino: 'EN_CAMINO', etiqueta: 'Voy en camino', requiereConfirmacion: false });
    expect(a.registrarDiagnostico).toBe(false);
    expect(a.cancelar).toBe(true);
  });

  it('EN_CAMINO: "Iniciar servicio" y cancelar', () => {
    const a = accionesTecnico('EN_CAMINO');
    expect(a.transicion).toMatchObject({ destino: 'EN_PROCESO', etiqueta: 'Iniciar servicio' });
    expect(a.registrarDiagnostico).toBe(false);
    expect(a.cancelar).toBe(true);
  });

  it('EN_PROCESO: diagnóstico, "Finalizar servicio" con confirmación y cancelar', () => {
    const a = accionesTecnico('EN_PROCESO');
    expect(a.transicion).toMatchObject({ destino: 'FINALIZADA', etiqueta: 'Finalizar servicio', requiereConfirmacion: true });
    expect(a.registrarDiagnostico).toBe(true);
    expect(a.cancelar).toBe(true);
  });

  it.each<EstadoCita>(['PENDIENTE', 'FINALIZADA', 'CANCELADA'])('%s: no ofrece ninguna acción', (estado) => {
    expect(accionesTecnico(estado)).toEqual({ transicion: null, registrarDiagnostico: false, cancelar: false });
  });
});

describe('clientePuedeModificar', () => {
  it.each<[EstadoCita, boolean]>([
    ['PENDIENTE', true],
    ['CONFIRMADA', true],
    ['EN_CAMINO', false],
    ['EN_PROCESO', false],
    ['FINALIZADA', false],
    ['CANCELADA', false],
  ])('%s -> %s', (estado, esperado) => {
    expect(clientePuedeModificar(estado)).toBe(esperado);
  });
});
