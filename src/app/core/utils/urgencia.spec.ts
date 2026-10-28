import { describe, expect, it } from 'vitest';

import { claseUrgenciaSugerida, equipoDeCita, etiquetaUrgencia, etiquetaUrgenciaSugerida } from './urgencia';

describe('urgencia', () => {
  it('etiqueta la urgencia de la cita', () => {
    expect(etiquetaUrgencia('NORMAL')).toBe('Normal');
    expect(etiquetaUrgencia('URGENTE')).toBe('Urgente');
  });

  it('etiqueta la urgencia sugerida por la IA', () => {
    expect(etiquetaUrgenciaSugerida('BAJA')).toBe('Baja');
    expect(etiquetaUrgenciaSugerida('MEDIA')).toBe('Media');
    expect(etiquetaUrgenciaSugerida('ALTA')).toBe('Alta');
  });

  it('usa verde, ámbar y rojo para baja, media y alta', () => {
    expect(claseUrgenciaSugerida('BAJA')).toContain('emerald');
    expect(claseUrgenciaSugerida('MEDIA')).toContain('amber');
    expect(claseUrgenciaSugerida('ALTA')).toContain('rose');
  });

  it('un valor desconocido no rompe: queda como estaba o en ámbar', () => {
    expect(etiquetaUrgencia('OTRA' as never)).toBe('OTRA');
    expect(etiquetaUrgenciaSugerida('OTRA' as never)).toBe('OTRA');
    expect(claseUrgenciaSugerida('OTRA' as never)).toContain('amber');
  });

  it('arma "Marca Modelo" con lo que haya', () => {
    expect(equipoDeCita('Samsung', 'WW90')).toBe('Samsung WW90');
    expect(equipoDeCita('  Samsung ', null)).toBe('Samsung');
    expect(equipoDeCita(undefined, 'WW90')).toBe('WW90');
  });

  it('sin marca ni modelo devuelve null', () => {
    expect(equipoDeCita(null, undefined)).toBeNull();
    expect(equipoDeCita('  ', '')).toBeNull();
  });
});
