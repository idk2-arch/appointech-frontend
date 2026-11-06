import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { aPaginaServidor, construirParametros } from './total-count';

const respuesta = (body: unknown, encabezado?: string): HttpResponse<number[]> =>
  new HttpResponse({ body: body as number[], headers: new HttpHeaders(encabezado === undefined ? {} : { 'X-Total-Count': encabezado }) });

describe('total-count', () => {
  it('lee el total del encabezado X-Total-Count', () => {
    expect(aPaginaServidor(respuesta([1, 2], '25'))).toEqual({ filas: [1, 2], total: 25 });
  });

  it('sin encabezado, o con uno que no es un número, el total es lo recibido', () => {
    expect(aPaginaServidor(respuesta([1, 2, 3]))).toEqual({ filas: [1, 2, 3], total: 3 });
    expect(aPaginaServidor(respuesta([1], 'mucho'))).toEqual({ filas: [1], total: 1 });
  });

  it('un cuerpo que no es un arreglo queda vacío', () => {
    expect(aPaginaServidor(respuesta(null, '4'))).toEqual({ filas: [], total: 4 });
    expect(aPaginaServidor(respuesta({}))).toEqual({ filas: [], total: 0 });
  });

  it('construye los parámetros sin los vacíos y conserva el cero', () => {
    const params = construirParametros({ estado: 'PENDIENTE', motivo: '', clienteId: null, tecnicoId: undefined, page: 0, size: 10 });
    expect(params.keys().sort()).toEqual(['estado', 'page', 'size']);
    expect(params.get('page')).toBe('0');
  });
});
