import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pagoDe } from '../../core/models/pago.mock';
import { AvisosPagoService } from './avisos-pago.service';
import { ToastService } from './toast.service';

describe('AvisosPagoService', () => {
  let avisos: AvisosPagoService;
  let toast: ToastService;
  const navigate = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    navigate.mockReset().mockResolvedValue(true);
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { navigate } }] });
    avisos = TestBed.inject(AvisosPagoService);
    toast = TestBed.inject(ToastService);
  });

  const visible = (): { tipo: string; titulo: string; etiqueta?: string } => {
    const [aviso] = toast.visibles();
    return { tipo: aviso.tipo, titulo: aviso.titulo, etiqueta: aviso.accion?.etiqueta };
  };

  describe('resultado del pago en línea', () => {
    it('pagado: éxito con la acción para ver el comprobante, que navega a la cita', async () => {
      avisos.anunciarResultado(pagoDe({ estado: 'PAGADO' }));

      expect(visible()).toEqual({ tipo: 'exito', titulo: 'Pago recibido', etiqueta: 'Ver comprobante' });
      toast.visibles()[0].accion!.accion();
      expect(navigate).toHaveBeenCalledWith(['/cliente/citas', 7]);
    });

    it('al llegar al comprobante lo deja a la vista', async () => {
      const comprobante = document.createElement('app-comprobante');
      comprobante.scrollIntoView = vi.fn();
      document.body.appendChild(comprobante);

      avisos.anunciarResultado(pagoDe({ estado: 'PAGADO' }));
      toast.visibles()[0].accion!.accion();
      await Promise.resolve();
      await Promise.resolve();

      expect(comprobante.scrollIntoView).toHaveBeenCalled();
      comprobante.remove();
    });

    it('fallido: error; pendiente: información', () => {
      avisos.anunciarResultado(pagoDe({ citaId: 1, estado: 'FALLIDO' }));
      avisos.anunciarResultado(pagoDe({ citaId: 2, estado: 'PENDIENTE' }));

      expect(toast.visibles().map((a) => [a.tipo, a.titulo])).toEqual([
        ['error', 'El pago no se completó'],
        ['info', 'Pago en proceso'],
      ]);
    });

    it('no repite el aviso del mismo estado al volver a la pantalla', () => {
      const pagado = pagoDe({ estado: 'PAGADO' });
      avisos.anunciarResultado(pagado);
      toast.cerrar(toast.visibles()[0].id);

      avisos.anunciarResultado(pagado);
      expect(toast.visibles()).toHaveLength(0);
    });

    it('avisa de nuevo cuando el estado cambia (pendiente → pagado)', () => {
      avisos.anunciarResultado(pagoDe({ estado: 'PENDIENTE' }));
      toast.cerrar(toast.visibles()[0].id);

      avisos.anunciarResultado(pagoDe({ estado: 'PAGADO' }));
      expect(visible().titulo).toBe('Pago recibido');
    });

    it('reiniciar() permite anunciar otra vez el resultado de un nuevo intento', () => {
      avisos.anunciarResultado(pagoDe({ estado: 'FALLIDO' }));
      toast.cerrar(toast.visibles()[0].id);
      avisos.reiniciar(7);

      avisos.anunciarResultado(pagoDe({ estado: 'FALLIDO' }));
      expect(visible().titulo).toBe('El pago no se completó');
    });

    it('sin sessionStorage igualmente avisa', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('bloqueado');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('bloqueado');
      });

      avisos.anunciarResultado(pagoDe({ estado: 'PAGADO' }));
      expect(visible().titulo).toBe('Pago recibido');
      vi.restoreAllMocks();
    });

    it('un valor guardado que no es un objeto se ignora', () => {
      sessionStorage.setItem('appointech_avisos_pago', 'null');
      avisos.anunciarResultado(pagoDe({ estado: 'PAGADO' }));
      expect(visible().titulo).toBe('Pago recibido');
    });
  });

  it('si la navegación falla no deja una promesa rechazada sin manejar', async () => {
    navigate.mockRejectedValue(new Error('navegación cancelada'));
    avisos.anunciarResultado(pagoDe({ estado: 'PAGADO' }));

    toast.visibles()[0].accion!.accion();
    await Promise.resolve();
    await Promise.resolve();

    expect(navigate).toHaveBeenCalledOnce();
  });

  it('efectivo confirmado: éxito con acción hacia el cobro del técnico', () => {
    avisos.anunciarEfectivoConfirmado(9);

    expect(visible()).toEqual({ tipo: 'exito', titulo: 'Pago en efectivo confirmado', etiqueta: 'Ver comprobante' });
    toast.visibles()[0].accion!.accion();
    expect(navigate).toHaveBeenCalledWith(['/tecnico/citas', 9, 'pago']);
  });

  it('costo final: éxito con el monto, y una advertencia aparte si la diferencia es significativa', () => {
    avisos.anunciarCostoFinal(pagoDe({ montoFinal: 150000 }));
    expect(toast.visibles().map((a) => a.tipo)).toEqual(['exito']);
    expect(toast.visibles()[0].descripcion.replace(/\s/g, ' ')).toContain('$ 150.000');

    avisos.anunciarCostoFinal(pagoDe({ citaId: 8, montoFinal: 200000, diferenciaSignificativa: true, porcentajeDiferencia: 25.5 }));
    const advertencia = toast.visibles().find((a) => a.tipo === 'advertencia')!;
    expect(advertencia.descripcion).toContain('25,5 %');
  });

  it('cita confirmada: éxito', () => {
    avisos.anunciarCitaConfirmada();
    expect(visible()).toEqual({ tipo: 'exito', titulo: 'Cita confirmada', etiqueta: undefined });
  });

  it('error de una acción: error con el mensaje recibido', () => {
    avisos.error('No se pudo verificar el pago', 'La pasarela no responde.');
    const [aviso] = toast.visibles();
    expect([aviso.tipo, aviso.titulo, aviso.descripcion]).toEqual(['error', 'No se pudo verificar el pago', 'La pasarela no responde.']);
  });
});
