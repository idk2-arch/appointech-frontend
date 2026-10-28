import { FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import {
  estaEnColombia,
  LIMITES_COLOMBIA,
  MENSAJE_FUERA_DE_COLOMBIA,
  parCoordenadasValidator,
  validadoresLatitud,
  validadoresLongitud,
} from './coordenadas';

describe('estaEnColombia', () => {
  it('acepta puntos dentro del país', () => {
    expect(estaEnColombia(4.3365, -74.3638)).toBe(true); // Fusagasugá
    expect(estaEnColombia(4.711, -74.0721)).toBe(true); // Bogotá
  });

  it('acepta los extremos del rango', () => {
    expect(estaEnColombia(LIMITES_COLOMBIA.latitudMin, LIMITES_COLOMBIA.longitudMin)).toBe(true);
    expect(estaEnColombia(LIMITES_COLOMBIA.latitudMax, LIMITES_COLOMBIA.longitudMax)).toBe(true);
  });

  it('rechaza puntos fuera del país', () => {
    expect(estaEnColombia(40.4, -3.7)).toBe(false); // Madrid
    expect(estaEnColombia(4.3, -90)).toBe(false);
    expect(estaEnColombia(20, -74)).toBe(false);
    expect(estaEnColombia(-6, -74)).toBe(false);
    expect(estaEnColombia(4.3, -60)).toBe(false);
  });

  it('el mensaje de error está en español', () => {
    expect(MENSAJE_FUERA_DE_COLOMBIA).toBe('La ubicación debe estar en Colombia.');
  });
});

describe('validadores de latitud y longitud', () => {
  const error = (validadores: typeof validadoresLatitud, valor: number): string[] =>
    Object.keys(new FormControl(valor, validadores).errors ?? {});

  it('latitud: marca min y max', () => {
    expect(error(validadoresLatitud, 4.3)).toEqual([]);
    expect(error(validadoresLatitud, -6)).toEqual(['min']);
    expect(error(validadoresLatitud, 15)).toEqual(['max']);
  });

  it('longitud: marca min y max', () => {
    expect(error(validadoresLongitud, -74)).toEqual([]);
    expect(error(validadoresLongitud, -90)).toEqual(['min']);
    expect(error(validadoresLongitud, -60)).toEqual(['max']);
  });
});

describe('parCoordenadasValidator', () => {
  const grupo = (latitud: unknown, longitud: unknown, campos: [string, string] = ['latitud', 'longitud']): FormGroup =>
    new FormGroup(
      { [campos[0]]: new FormControl(latitud), [campos[1]]: new FormControl(longitud) },
      parCoordenadasValidator(...campos)
    );

  it('un par vacío es válido (las coordenadas son opcionales)', () => {
    expect(grupo(null, null).errors).toBeNull();
    expect(grupo('', '').errors).toBeNull();
  });

  it('un par válido dentro de Colombia no tiene error', () => {
    expect(grupo(4.33, -74.36).errors).toBeNull();
  });

  it('una sola coordenada es un par incompleto', () => {
    expect(grupo(4.33, null).errors).toEqual({ coordenadasIncompletas: true });
    expect(grupo(null, -74.36).errors).toEqual({ coordenadasIncompletas: true });
    expect(grupo('', -74.36).errors).toEqual({ coordenadasIncompletas: true });
  });

  it('detecta latitud y longitud invertidas, un error típico al copiarlas', () => {
    expect(grupo(-74.36, 4.33).errors).toEqual({ coordenadasInvertidas: true });
  });

  it('un par fuera de Colombia que no es una inversión no marca este error', () => {
    expect(grupo(40.4, -3.7).errors).toBeNull();
  });

  it('acepta números escritos como texto', () => {
    expect(grupo('4.33', '-74.36').errors).toBeNull();
    expect(grupo('-74.36', '4.33').errors).toEqual({ coordenadasInvertidas: true });
  });

  it('funciona con otros nombres de campo (latitudBase y longitudBase del técnico)', () => {
    expect(grupo(4.33, null, ['latitudBase', 'longitudBase']).errors).toEqual({ coordenadasIncompletas: true });
    expect(grupo(4.33, -74.36, ['latitudBase', 'longitudBase']).errors).toBeNull();
  });

  it('con los nombres por defecto ignora campos que no existen', () => {
    const sinCampos = new FormGroup({}, parCoordenadasValidator());
    expect(sinCampos.errors).toBeNull();
  });
});
