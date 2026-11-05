import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NavegadorService } from './navegador.service';

describe('NavegadorService', () => {
  const assign = vi.fn();
  const print = vi.fn();
  let servicio: NavegadorService;

  beforeEach(() => {
    assign.mockClear();
    print.mockClear();
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { location: { assign }, defaultView: { print } } }],
    });
    servicio = TestBed.inject(NavegadorService);
  });

  it('redirige a una dirección https', () => {
    expect(servicio.redirigir('https://pasarela.test/pagar?x=1')).toBe(true);
    expect(assign).toHaveBeenCalledWith('https://pasarela.test/pagar?x=1');
  });

  it('redirige a una dirección http', () => {
    expect(servicio.redirigir('http://pasarela.test/pagar')).toBe(true);
    expect(assign).toHaveBeenCalledOnce();
  });

  it('no redirige a esquemas distintos de http(s)', () => {
    expect(servicio.redirigir('javascript:alert(1)')).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });

  it('no redirige si la dirección no es válida', () => {
    expect(servicio.redirigir('no es una url')).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });

  it('imprime la página', () => {
    servicio.imprimir();
    expect(print).toHaveBeenCalledOnce();
  });
});

describe('NavegadorService sin ventana', () => {
  it('no falla al imprimir', () => {
    TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: { defaultView: null } }] });
    expect(() => TestBed.inject(NavegadorService).imprimir()).not.toThrow();
  });
});
