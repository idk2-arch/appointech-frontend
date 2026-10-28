import { FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import {
  MAX_DIAGNOSTICO,
  MAX_MOTIVO,
  MAX_RECOMENDACIONES,
  validadorFechaHoraFutura,
  validadoresDiagnostico,
  validadoresMotivo,
  validadoresRecomendaciones,
} from './validadores-cita';

describe('validadoresMotivo', () => {
  it('obligatorio: rechaza vacío y solo espacios', () => {
    expect(new FormControl('', validadoresMotivo(true)).hasError('required')).toBe(true);
    expect(new FormControl('   ', validadoresMotivo(true)).hasError('required')).toBe(true);
    expect(new FormControl('Cliente ausente', validadoresMotivo(true)).valid).toBe(true);
  });

  it('opcional: acepta vacío', () => {
    expect(new FormControl('', validadoresMotivo(false)).valid).toBe(true);
  });

  it('admite hasta 500 caracteres y rechaza más', () => {
    expect(new FormControl('a'.repeat(MAX_MOTIVO), validadoresMotivo(true)).valid).toBe(true);
    expect(new FormControl('a'.repeat(MAX_MOTIVO + 1), validadoresMotivo(false)).hasError('maxlength')).toBe(true);
  });
});

describe('validadores del diagnóstico', () => {
  it('el diagnóstico es obligatorio y llega a 2000 caracteres', () => {
    expect(new FormControl('', validadoresDiagnostico).hasError('required')).toBe(true);
    expect(new FormControl('  ', validadoresDiagnostico).hasError('required')).toBe(true);
    expect(new FormControl('a'.repeat(MAX_DIAGNOSTICO), validadoresDiagnostico).valid).toBe(true);
    expect(new FormControl('a'.repeat(MAX_DIAGNOSTICO + 1), validadoresDiagnostico).hasError('maxlength')).toBe(true);
  });

  it('las recomendaciones son opcionales y llegan a 1000 caracteres', () => {
    expect(new FormControl('', validadoresRecomendaciones).valid).toBe(true);
    expect(new FormControl('a'.repeat(MAX_RECOMENDACIONES), validadoresRecomendaciones).valid).toBe(true);
    expect(new FormControl('a'.repeat(MAX_RECOMENDACIONES + 1), validadoresRecomendaciones).hasError('maxlength')).toBe(true);
  });
});

describe('validadorFechaHoraFutura', () => {
  const ahora = () => new Date(2026, 9, 27, 12, 0, 0);
  const grupo = (fecha: string, hora: string) =>
    new FormGroup({ fecha: new FormControl(fecha), hora: new FormControl(hora) }, validadorFechaHoraFutura(ahora));

  it('rechaza una hora anterior a la actual', () => {
    expect(grupo('2026-10-27', '09:00').hasError('enElPasado')).toBe(true);
    expect(grupo('2026-10-26', '18:00').hasError('enElPasado')).toBe(true);
  });

  it('rechaza exactamente la hora actual', () => {
    expect(grupo('2026-10-27', '12:00').hasError('enElPasado')).toBe(true);
  });

  it('acepta una hora futura', () => {
    expect(grupo('2026-10-27', '12:01').valid).toBe(true);
    expect(grupo('2026-11-04', '14:00').valid).toBe(true);
  });

  it('no opina mientras falte la fecha o la hora', () => {
    expect(grupo('', '09:00').valid).toBe(true);
    expect(grupo('2026-10-27', '').valid).toBe(true);
  });
});
