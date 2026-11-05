import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { comprobanteDe, pagoDe } from '../../core/models/pago.mock';
import { PagoService } from '../../core/services/pago.service';
import { ComprobanteComponent } from '../comprobante/comprobante.component';
import { CostoFinalFormComponent } from '../costo-final-form/costo-final-form.component';
import { PanelPagoComponent } from '../panel-pago/panel-pago.component';
import { SelectorMetodoPagoComponent } from '../selector-metodo-pago/selector-metodo-pago.component';
import { SharedModule } from '../shared.module';
import { VerificarPagoComponent } from '../verificar-pago/verificar-pago.component';
import { ToastService } from './toast.service';

const falla = (status: number, detail: string): HttpErrorResponse => new HttpErrorResponse({ status, error: { detail } });

/** Qué avisos emergentes dejan las acciones de pago (el mensaje en pantalla se prueba en cada componente). */
describe('avisos emergentes de las acciones de pago', () => {
  const pagoService = {
    obtener: vi.fn(),
    elegirMetodo: vi.fn(),
    sincronizar: vi.fn(),
    obtenerComprobante: vi.fn(),
    registrarCostoFinal: vi.fn(),
    confirmarEfectivo: vi.fn(),
  };
  let toast: ToastService;

  const avisos = (): [string, string, string][] => toast.visibles().map((a) => [a.tipo, a.titulo, a.descripcion]);

  beforeEach(async () => {
    sessionStorage.clear();
    Object.values(pagoService).forEach((mock) => mock.mockReset());
    await TestBed.configureTestingModule({
      imports: [SharedModule, RouterModule.forRoot([])],
      providers: [{ provide: PagoService, useValue: pagoService }],
    }).compileComponents();
    toast = TestBed.inject(ToastService);
  });

  describe('verificar el pago', () => {
    function crear(): VerificarPagoComponent {
      const fixture = TestBed.createComponent(VerificarPagoComponent);
      fixture.componentRef.setInput('citaId', 7);
      fixture.detectChanges();
      return fixture.componentInstance;
    }

    it('pagado: éxito "Pago recibido", y no se repite si se vuelve a verificar con el mismo resultado', () => {
      pagoService.sincronizar.mockReturnValue(of(pagoDe({ estado: 'PAGADO' })));
      const verificar = crear();

      verificar.verificar();
      expect(avisos().map(([tipo, titulo]) => [tipo, titulo])).toEqual([['exito', 'Pago recibido']]);

      toast.cerrar(toast.visibles()[0].id);
      verificar.verificar();
      expect(avisos()).toEqual([]);
    });

    it('fallido: error; pendiente: información', () => {
      pagoService.sincronizar.mockReturnValueOnce(of(pagoDe({ estado: 'FALLIDO' }))).mockReturnValueOnce(of(pagoDe({ estado: 'PENDIENTE' })));
      const verificar = crear();
      verificar.verificar();
      verificar.verificar();

      expect(avisos().map(([tipo]) => tipo)).toEqual(['error', 'info']);
    });

    it('si falla, error con el mismo mensaje que muestra la pantalla', () => {
      pagoService.sincronizar.mockReturnValue(throwError(() => falla(409, 'El pago no es en línea o no tiene referencia.')));
      crear().verificar();

      expect(avisos()).toEqual([['error', 'No se pudo verificar el pago', 'El pago no es en línea o no tiene referencia.']]);
    });
  });

  it('elegir el método: un 503 deja un aviso de error con el mensaje del backend', () => {
    pagoService.elegirMetodo.mockReturnValue(throwError(() => falla(503, 'El pago en línea no está disponible.')));
    const fixture = TestBed.createComponent(SelectorMetodoPagoComponent);
    fixture.componentRef.setInput('pago', pagoDe());
    fixture.detectChanges();

    fixture.componentInstance.elegir('EN_LINEA');

    expect(avisos()).toEqual([['error', 'No se pudo registrar el método de pago', 'El pago en línea no está disponible.']]);
  });

  describe('comprobante', () => {
    it('si no carga, error con el mensaje de la pantalla', () => {
      pagoService.obtenerComprobante.mockReturnValue(throwError(() => falla(404, 'Aún no hay comprobante.')));
      const fixture = TestBed.createComponent(ComprobanteComponent);
      fixture.componentRef.setInput('citaId', 7);
      fixture.detectChanges();

      expect(avisos()).toEqual([['error', 'No se pudo cargar el comprobante', 'Aún no hay comprobante.']]);
    });

    it('si carga bien no avisa de nada', () => {
      pagoService.obtenerComprobante.mockReturnValue(of(comprobanteDe()));
      const fixture = TestBed.createComponent(ComprobanteComponent);
      fixture.componentRef.setInput('citaId', 7);
      fixture.detectChanges();

      expect(avisos()).toEqual([]);
    });
  });

  describe('costo final', () => {
    function crear(): CostoFinalFormComponent {
      const fixture = TestBed.createComponent(CostoFinalFormComponent);
      fixture.componentRef.setInput('citaId', 7);
      fixture.detectChanges();
      fixture.componentInstance.monto.setValue(150000);
      return fixture.componentInstance;
    }

    it('registrado: éxito; con diferencia significativa, además una advertencia con el porcentaje', () => {
      pagoService.registrarCostoFinal.mockReturnValue(of(pagoDe({ montoFinal: 150000, diferenciaSignificativa: true, porcentajeDiferencia: 50 })));
      crear().registrar();

      expect(avisos().map(([tipo, titulo]) => [tipo, titulo])).toEqual([
        ['exito', 'Costo final registrado'],
        ['advertencia', 'El costo final difiere del estimado'],
      ]);
      expect(avisos()[1][2]).toContain('50 %');
    });

    it('registrado sin diferencia significativa: solo el éxito', () => {
      pagoService.registrarCostoFinal.mockReturnValue(of(pagoDe({ montoFinal: 150000 })));
      crear().registrar();
      expect(avisos().map(([tipo]) => tipo)).toEqual(['exito']);
    });

    it('si falla: error con el mensaje del backend', () => {
      pagoService.registrarCostoFinal.mockReturnValue(throwError(() => falla(422, 'La cita no está finalizada.')));
      crear().registrar();

      expect(avisos()).toEqual([['error', 'No se pudo registrar el costo final', 'La cita no está finalizada.']]);
    });
  });

  describe('efectivo confirmado por el técnico', () => {
    function crear(): PanelPagoComponent {
      pagoService.obtener.mockReturnValue(of(pagoDe({ metodo: 'EFECTIVO' })));
      const fixture = TestBed.createComponent(PanelPagoComponent);
      fixture.componentRef.setInput('citaId', 7);
      fixture.componentRef.setInput('rol', 'TECNICO');
      fixture.detectChanges();
      return fixture.componentInstance;
    }

    it('éxito con la acción para ver el comprobante', () => {
      pagoService.confirmarEfectivo.mockReturnValue(of(pagoDe({ metodo: 'EFECTIVO', estado: 'PAGADO' })));
      crear().confirmarEfectivo();

      expect(avisos().map(([tipo, titulo]) => [tipo, titulo])).toEqual([['exito', 'Pago en efectivo confirmado']]);
      expect(toast.visibles()[0].accion?.etiqueta).toBe('Ver comprobante');
    });

    it('si falla, error con el mensaje de la pantalla', () => {
      pagoService.confirmarEfectivo.mockReturnValue(throwError(() => falla(409, 'El pago ya estaba confirmado.')));
      crear().confirmarEfectivo();

      expect(avisos()).toEqual([['error', 'No se pudo confirmar el pago en efectivo', 'El pago ya estaba confirmado.']]);
    });
  });

  it('cargar un panel con un pago ya pagado no dispara ningún aviso', () => {
    pagoService.obtener.mockReturnValue(of(pagoDe({ metodo: 'EFECTIVO', estado: 'PAGADO' })));
    pagoService.obtenerComprobante.mockReturnValue(of(comprobanteDe()));
    const fixture = TestBed.createComponent(PanelPagoComponent);
    fixture.componentRef.setInput('citaId', 7);
    fixture.componentRef.setInput('rol', 'CLIENTE');
    fixture.detectChanges();

    expect(avisos()).toEqual([]);
  });
});
