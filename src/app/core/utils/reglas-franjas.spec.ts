import { FormBuilder } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { aHoraInput, cambiaDuracionOJornada, jornadaValidator, minutosDeHora } from './reglas-franjas';

const grupo = (inicio: string, fin: string, duracion: number | string | null) =>
  new FormBuilder().group({ horaInicioJornada: [inicio], horaFinJornada: [fin], duracionBloqueMinutos: [duracion] });

describe('reglas-franjas', () => {
  it('convierte las horas del servidor a las de un campo time', () => {
    expect(aHoraInput('08:00:00')).toBe('08:00');
    expect(aHoraInput('18:30')).toBe('18:30');
    expect(aHoraInput('')).toBe('');
    expect(aHoraInput(null)).toBe('');
    expect(aHoraInput('8am')).toBe('');
  });

  it('calcula los minutos desde la medianoche y rechaza lo que no es una hora', () => {
    expect(minutosDeHora('00:00')).toBe(0);
    expect(minutosDeHora('08:30:00')).toBe(510);
    expect(minutosDeHora('23:59')).toBe(1439);
    expect(minutosDeHora('24:00')).toBeNull();
    expect(minutosDeHora('10:60')).toBeNull();
    expect(minutosDeHora('abc')).toBeNull();
    expect(minutosDeHora(undefined)).toBeNull();
  });

  describe('jornadaValidator', () => {
    it('acepta una jornada con al menos un bloque completo', () => {
      expect(jornadaValidator(grupo('08:00', '18:00', 120))).toBeNull();
      expect(jornadaValidator(grupo('08:00', '10:00', 120))).toBeNull();
    });

    it('exige que el inicio sea anterior al fin', () => {
      expect(jornadaValidator(grupo('18:00', '08:00', 120))).toEqual({ inicioNoAnterior: true });
      expect(jornadaValidator(grupo('08:00', '08:00', 120))).toEqual({ inicioNoAnterior: true });
    });

    it('exige que quepa un bloque completo', () => {
      expect(jornadaValidator(grupo('08:00', '09:00', 120))).toEqual({ sinBloqueCompleto: true });
    });

    it('se calla mientras falten datos: de eso se ocupa cada campo', () => {
      expect(jornadaValidator(grupo('', '18:00', 120))).toBeNull();
      expect(jornadaValidator(grupo('08:00', 'xx', 120))).toBeNull();
      expect(jornadaValidator(grupo('08:00', '09:00', null))).toBeNull();
      expect(jornadaValidator(grupo('08:00', '09:00', 'abc'))).toBeNull();
      expect(jornadaValidator(grupo('08:00', '09:00', 0))).toBeNull();
    });
  });

  describe('cambiaDuracionOJornada', () => {
    const base = { duracionBloqueMinutos: 120, horaInicioJornada: '08:00:00', horaFinJornada: '18:00:00' };

    it('no detecta cambio si solo cambia el formato de la hora', () => {
      expect(cambiaDuracionOJornada(base, { ...base, horaInicioJornada: '08:00', horaFinJornada: '18:00' })).toBe(false);
    });

    it('detecta cambios de duración, de inicio y de fin', () => {
      expect(cambiaDuracionOJornada(base, { ...base, duracionBloqueMinutos: 90 })).toBe(true);
      expect(cambiaDuracionOJornada(base, { ...base, horaInicioJornada: '07:00' })).toBe(true);
      expect(cambiaDuracionOJornada(base, { ...base, horaFinJornada: '19:00' })).toBe(true);
    });
  });
});
