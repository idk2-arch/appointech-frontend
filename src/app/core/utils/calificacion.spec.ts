import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import {
  agregarSugerencia,
  ayudaDePuntuacion,
  esPlazoVencido,
  esYaCalificada,
  fraseDePuntuacion,
  plazoCalificacionVencido,
  quitarSugerencia,
  sugerenciasDePuntuacion,
} from './calificacion';

const conflicto = (error: unknown) => new HttpErrorResponse({ status: 409, error });

describe('plazoCalificacionVencido', () => {
  const ahora = new Date(2026, 10, 30, 12, 0, 0);

  it('dentro de 30 días no está vencido', () => {
    expect(plazoCalificacionVencido('2026-11-01T12:00:00', ahora)).toBe(false);
    expect(plazoCalificacionVencido('2026-10-31T12:00:00', ahora)).toBe(false);
  });

  it('pasados 30 días sí está vencido', () => {
    expect(plazoCalificacionVencido('2026-10-30T11:59:00', ahora)).toBe(true);
    expect(plazoCalificacionVencido('2026-01-01T10:00:00', ahora)).toBe(true);
  });

  it('sin fecha o con una fecha inválida no lo da por vencido (decide el backend)', () => {
    expect(plazoCalificacionVencido(null, ahora)).toBe(false);
    expect(plazoCalificacionVencido('', ahora)).toBe(false);
    expect(plazoCalificacionVencido('no es fecha', ahora)).toBe(false);
  });

  it('usa la fecha de hoy si no se indica otra', () => {
    expect(plazoCalificacionVencido('2000-01-01T00:00:00')).toBe(true);
  });
});

describe('errores 409 de calificar', () => {
  it('reconoce "ya calificada" por el mensaje del backend', () => {
    expect(esYaCalificada(conflicto({ detail: 'La cita ya fue calificada' }))).toBe(true);
    expect(esYaCalificada(conflicto({ error: 'Esta cita ya está calificada' }))).toBe(true);
    expect(esYaCalificada(conflicto({ detail: 'El plazo venció' }))).toBe(false);
  });

  it('reconoce el plazo vencido por el mensaje del backend', () => {
    expect(esPlazoVencido(conflicto({ detail: 'El plazo para calificar venció' }))).toBe(true);
    expect(esPlazoVencido(conflicto({ error: 'Pasaron más de 30 días' }))).toBe(false);
    expect(esPlazoVencido(conflicto({ detail: 'La cita no está finalizada' }))).toBe(false);
  });

  it('ignora otros estados, cuerpos sin texto y errores que no son HTTP', () => {
    expect(esYaCalificada(new HttpErrorResponse({ status: 500, error: { detail: 'ya calificada' } }))).toBe(false);
    expect(esPlazoVencido(conflicto(null))).toBe(false);
    expect(esPlazoVencido(conflicto({ detail: 5 }))).toBe(false);
    expect(esYaCalificada(new Error('x'))).toBe(false);
  });
});

describe('frases y sugerencias', () => {
  it('cada puntuación tiene su frase y su ayuda; sin puntuación, frase vacía', () => {
    expect(fraseDePuntuacion(5)).toBe('¡Excelente servicio!');
    expect(fraseDePuntuacion(0)).toBe('');
    expect(ayudaDePuntuacion(3)).toContain('mejor');
    expect(ayudaDePuntuacion(0)).toContain('Elige una puntuación');
  });

  it('las sugerencias dependen de la puntuación', () => {
    expect(sugerenciasDePuntuacion(0)).toEqual([]);
    expect(sugerenciasDePuntuacion(2)).toContain('Llegó tarde');
    expect(sugerenciasDePuntuacion(4)).toContain('Buen precio');
  });

  it('agregar une con coma o con espacio tras un punto, sin duplicar ni pasar de 500', () => {
    expect(agregarSugerencia('', 'Puntual')).toBe('Puntual');
    expect(agregarSugerencia('Puntual', 'Amable')).toBe('Puntual, Amable');
    expect(agregarSugerencia('Todo bien.', 'Amable')).toBe('Todo bien. Amable');
    expect(agregarSugerencia('Puntual', 'Puntual')).toBe('Puntual');
    expect(agregarSugerencia('a'.repeat(499), 'Amable')).toBe('a'.repeat(499));
  });

  it('quitar saca la sugerencia y su separador; si no está, no cambia nada', () => {
    expect(quitarSugerencia('Puntual, Amable', 'Puntual')).toBe('Amable');
    expect(quitarSugerencia('Puntual, Amable, Buen precio', 'Amable')).toBe('Puntual, Buen precio');
    expect(quitarSugerencia('Amable', 'Amable')).toBe('');
    expect(quitarSugerencia('Puntual', 'Amable')).toBe('Puntual');
  });
});

describe('Separadores al quitar sugerencias', () => {
  it.each([
    ['Texto, \tPuntual;  resto', 'Texto, resto'],
    ['Texto ; \nPuntual, resto', 'Texto , resto'],
    ['Texto  Puntual resto', 'Texto, resto'],
    ['Texto,; Puntual', 'Texto,'],
    ['Puntual ; resto', '; resto'],
    ['Sin sugerencia', 'Sin sugerencia'],
    ['', ''],
  ])('conserva el significado de los separadores del caso %#', (comentario, esperado) => {
    expect(quitarSugerencia(comentario, 'Puntual')).toBe(esperado);
  });

  it('procesa espacios largos seguidos de un caracter que impide el sufijo', () => {
    const prefijo = ' '.repeat(100_000) + 'x';
    expect(quitarSugerencia(prefijo + 'Puntual', 'Puntual')).toBe(prefijo);
    expect(quitarSugerencia('Texto;' + ' '.repeat(100_000) + 'Puntual', 'Puntual')).toBe('Texto');
  });
});
