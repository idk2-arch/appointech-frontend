import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RetornoPagoService } from './retorno-pago.service';

describe('RetornoPagoService', () => {
  let servicio: RetornoPagoService;

  beforeEach(() => {
    sessionStorage.clear();
    servicio = TestBed.inject(RetornoPagoService);
  });

  afterEach(() => vi.restoreAllMocks());

  it('guarda, lee y olvida la cita del pago', () => {
    expect(servicio.leer()).toBeNull();

    servicio.guardar(7);
    expect(servicio.leer()).toBe(7);

    servicio.olvidar();
    expect(servicio.leer()).toBeNull();
  });

  it('ignora un valor guardado que no es una cita válida', () => {
    sessionStorage.setItem('appointech_pago_cita', 'abc');
    expect(servicio.leer()).toBeNull();
  });

  it('no falla cuando el almacenamiento no está disponible', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    expect(() => servicio.guardar(7)).not.toThrow();
    expect(servicio.leer()).toBeNull();
    expect(() => servicio.olvidar()).not.toThrow();
  });
});
