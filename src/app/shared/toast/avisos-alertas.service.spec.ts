import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AvisosAlertasService } from './avisos-alertas.service';
import { ToastService } from './toast.service';

describe('AvisosAlertasService', () => {
  let avisos: AvisosAlertasService;
  let toast: ToastService;

  beforeEach(() => {
    sessionStorage.clear();
    avisos = TestBed.inject(AvisosAlertasService);
    toast = TestBed.inject(ToastService);
  });

  it('con alertas muestra una advertencia con el total', () => {
    avisos.anunciar(3);

    const [aviso] = toast.visibles();
    expect([aviso.tipo, aviso.titulo]).toEqual(['advertencia', '3 solicitudes sin técnico']);
  });

  it('usa el singular con una sola alerta', () => {
    avisos.anunciar(1);
    expect(toast.visibles()[0].titulo).toBe('1 solicitud sin técnico');
  });

  it('sin alertas no avisa de nada', () => {
    avisos.anunciar(0);
    expect(toast.visibles()).toHaveLength(0);
  });

  it('avisa una sola vez por sesión, aunque cambie el total', () => {
    avisos.anunciar(2);
    toast.cerrar(toast.visibles()[0].id);

    avisos.anunciar(2);
    avisos.anunciar(5);
    expect(toast.visibles()).toHaveLength(0);
  });

  it('un cero previo no gasta el aviso', () => {
    avisos.anunciar(0);
    avisos.anunciar(2);
    expect(toast.visibles()).toHaveLength(1);
  });

  it('sin sessionStorage igualmente avisa', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    avisos.anunciar(2);
    expect(toast.visibles()).toHaveLength(1);
    vi.restoreAllMocks();
  });
});
