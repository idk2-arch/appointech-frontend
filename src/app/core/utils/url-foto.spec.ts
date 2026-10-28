import { describe, expect, it } from 'vitest';

import { resolverUrlFoto } from './url-foto';

describe('resolverUrlFoto', () => {
  it('completa la ruta relativa con el origen de la API sin repetir /api', () => {
    expect(resolverUrlFoto('/api/fotos/abc')).toBe('http://localhost:8080/api/fotos/abc');
  });

  it('acepta rutas sin barra inicial', () => {
    expect(resolverUrlFoto('api/fotos/abc')).toBe('http://localhost:8080/api/fotos/abc');
  });

  it('deja intactas las URLs absolutas y las data URL', () => {
    expect(resolverUrlFoto('https://cdn.ejemplo.com/f.jpg')).toBe('https://cdn.ejemplo.com/f.jpg');
    expect(resolverUrlFoto('data:image/jpeg;base64,AAAA')).toBe('data:image/jpeg;base64,AAAA');
  });

  it('devuelve null cuando no hay foto', () => {
    expect(resolverUrlFoto(null)).toBeNull();
    expect(resolverUrlFoto(undefined)).toBeNull();
    expect(resolverUrlFoto('')).toBeNull();
  });
});
