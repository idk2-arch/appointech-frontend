import { describe, expect, it } from 'vitest';

import type { MotivoSolicitudEspecial } from '../models/cita';
import { etiquetaMotivoSolicitud, mensajeClienteMotivo } from './motivo-solicitud-especial';

describe('motivo-solicitud-especial', () => {
  it('da una etiqueta legible a cada motivo para el administrador', () => {
    expect(etiquetaMotivoSolicitud('SIN_TECNICOS_ESPECIALIDAD')).toBe('Sin técnicos para la especialidad');
    expect(etiquetaMotivoSolicitud('SIN_HORARIOS')).toBe('Sin horarios disponibles');
    expect(etiquetaMotivoSolicitud('FUERA_DE_COBERTURA')).toBe('Fuera de cobertura');
  });

  it('en las filas antiguas, sin motivo, no hay etiqueta', () => {
    expect(etiquetaMotivoSolicitud(null)).toBeNull();
    expect(etiquetaMotivoSolicitud(undefined)).toBeNull();
    expect(etiquetaMotivoSolicitud('OTRO' as MotivoSolicitudEspecial)).toBeNull();
  });

  it('explica al cliente cada motivo, y usa un texto general si no hay', () => {
    expect(mensajeClienteMotivo('SIN_TECNICOS_ESPECIALIDAD')).toContain('no hay técnicos disponibles');
    expect(mensajeClienteMotivo('FUERA_DE_COBERTURA')).toContain('fuera de nuestra zona');
    expect(mensajeClienteMotivo('SIN_HORARIOS')).toContain('No hay horarios disponibles');
    expect(mensajeClienteMotivo(null)).toContain('no podemos ofrecerte horarios automáticos');
    expect(mensajeClienteMotivo('OTRO' as MotivoSolicitudEspecial)).toContain('no podemos ofrecerte');
  });
});
