import { describe, expect, it } from 'vitest';

import { bytesDeDataUrl, dimensionesReducidas, ErrorImagen, validarTamanioFinal, validarTipoImagen } from './imagen';

describe('dimensionesReducidas', () => {
  it('reduce una imagen horizontal conservando la proporción', () => {
    expect(dimensionesReducidas(2000, 1000, 512)).toEqual({ ancho: 512, alto: 256 });
  });

  it('reduce una imagen vertical por su lado mayor', () => {
    expect(dimensionesReducidas(1000, 4000, 512)).toEqual({ ancho: 128, alto: 512 });
  });

  it('no amplía una imagen que ya es pequeña', () => {
    expect(dimensionesReducidas(300, 200, 512)).toEqual({ ancho: 300, alto: 200 });
  });

  it('nunca devuelve una dimensión menor a 1 px', () => {
    expect(dimensionesReducidas(10000, 1, 512).alto).toBe(1);
  });
});

describe('validarTipoImagen', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('acepta %s', (tipo) => {
    expect(() => validarTipoImagen(tipo)).not.toThrow();
  });

  it.each(['image/gif', 'application/pdf', ''])('rechaza "%s" con un mensaje claro', (tipo) => {
    expect(() => validarTipoImagen(tipo)).toThrow(ErrorImagen);
    expect(() => validarTipoImagen(tipo)).toThrow('JPEG, PNG o WebP');
  });
});

describe('bytesDeDataUrl y validarTamanioFinal', () => {
  it('calcula los bytes reales del base64, con y sin relleno', () => {
    expect(bytesDeDataUrl('data:image/jpeg;base64,QUJD')).toBe(3);
    expect(bytesDeDataUrl('data:image/jpeg;base64,QUI=')).toBe(2);
    expect(bytesDeDataUrl('data:image/jpeg;base64,QQ==')).toBe(1);
  });

  it('acepta hasta 1 MB y rechaza más', () => {
    const justo = 'data:image/jpeg;base64,' + 'A'.repeat(Math.floor((1024 * 1024 * 4) / 3 / 4) * 4);
    expect(() => validarTamanioFinal(justo)).not.toThrow();

    const grande = 'data:image/jpeg;base64,' + 'A'.repeat(1.5 * 1024 * 1024);
    expect(() => validarTamanioFinal(grande)).toThrow('más de 1 MB');
  });
});
