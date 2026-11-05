import { describe, expect, it } from 'vitest';

import { EstadoPago, MetodoPago } from '../models/pago';
import { claseInsigniaEstadoPago, etiquetaEstadoPago, etiquetaMetodoPago, simboloEstadoPago } from './estado-pago';

describe('estado-pago', () => {
  it('etiqueta cada estado en español', () => {
    expect(etiquetaEstadoPago('PENDIENTE')).toBe('Pendiente');
    expect(etiquetaEstadoPago('PAGADO')).toBe('Pagado');
    expect(etiquetaEstadoPago('FALLIDO')).toBe('Fallido');
  });

  it('da a cada estado un símbolo distinto, para no depender solo del color', () => {
    const simbolos = (['PENDIENTE', 'PAGADO', 'FALLIDO'] as EstadoPago[]).map(simboloEstadoPago);
    expect(new Set(simbolos).size).toBe(3);
  });

  it('presenta "sin costo final" con texto y símbolo propios', () => {
    expect(etiquetaEstadoPago('SIN_COSTO_FINAL')).toBe('Sin costo final');
    expect(simboloEstadoPago('SIN_COSTO_FINAL')).toBe('!');
    expect(claseInsigniaEstadoPago('SIN_COSTO_FINAL')).toContain('orange');
  });

  it('da a cada estado su color', () => {
    expect(claseInsigniaEstadoPago('PAGADO')).toContain('emerald');
    expect(claseInsigniaEstadoPago('FALLIDO')).toContain('rose');
    expect(claseInsigniaEstadoPago('PENDIENTE')).toContain('amber');
  });

  it('ante un estado desconocido devuelve el texto original y el estilo de pendiente', () => {
    const desconocido = 'OTRO' as EstadoPago;
    expect(etiquetaEstadoPago(desconocido)).toBe('OTRO');
    expect(simboloEstadoPago(desconocido)).toBe('');
    expect(claseInsigniaEstadoPago(desconocido)).toBe(claseInsigniaEstadoPago('PENDIENTE'));
  });

  it('etiqueta los métodos de pago', () => {
    expect(etiquetaMetodoPago('EFECTIVO')).toBe('Efectivo');
    expect(etiquetaMetodoPago('EN_LINEA')).toBe('En línea');
    expect(etiquetaMetodoPago('OTRO' as MetodoPago)).toBe('OTRO');
  });
});
