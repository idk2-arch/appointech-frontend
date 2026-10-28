import { describe, expect, it } from 'vitest';

import { etiquetaRol, nombreCompleto } from './nombre-persona';

describe('nombreCompleto', () => {
  it('une nombre y apellido sin espacios sobrantes', () => {
    expect(nombreCompleto('  Ana ', ' Pérez  ')).toBe('Ana Pérez');
  });

  it('con solo uno de los dos devuelve ese', () => {
    expect(nombreCompleto('Ana', null)).toBe('Ana');
    expect(nombreCompleto(undefined, 'Pérez')).toBe('Pérez');
  });

  it('sin ninguno devuelve cadena vacía', () => {
    expect(nombreCompleto('', '  ')).toBe('');
    expect(nombreCompleto(null, undefined)).toBe('');
  });
});

describe('etiquetaRol', () => {
  it('traduce los roles conocidos', () => {
    expect(etiquetaRol('ADMINISTRADOR')).toBe('Administrador');
    expect(etiquetaRol('CLIENTE')).toBe('Cliente');
    expect(etiquetaRol('TECNICO')).toBe('Técnico');
  });

  it('deja un rol desconocido tal cual y devuelve vacío si no hay', () => {
    expect(etiquetaRol('SUPERVISOR')).toBe('SUPERVISOR');
    expect(etiquetaRol(null)).toBe('');
    expect(etiquetaRol(undefined)).toBe('');
  });
});
