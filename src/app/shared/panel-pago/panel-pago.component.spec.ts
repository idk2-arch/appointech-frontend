import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Pago } from '../../core/models/pago';
import { comprobanteDe, pagoDe } from '../../core/models/pago.mock';
import { PagoService } from '../../core/services/pago.service';
import { SharedModule } from '../shared.module';
import { PanelPagoComponent, RolPanelPago } from './panel-pago.component';

const falla = (status: number, detail: string): HttpErrorResponse =>
  new HttpErrorResponse({ status, error: { detail } });

describe('PanelPagoComponent', () => {
  let fixture: ComponentFixture<PanelPagoComponent>;
  let componente: PanelPagoComponent;
  const servicio = {
    obtener: vi.fn(),
    registrarCostoFinal: vi.fn(),
    elegirMetodo: vi.fn(),
    confirmarEfectivo: vi.fn(),
    sincronizar: vi.fn(),
    obtenerComprobante: vi.fn(),
  };

  const raiz = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => (raiz().textContent ?? '').replace(/\s+/g, ' ');
  const boton = (nombre: string): HTMLButtonElement | undefined =>
    Array.from(raiz().querySelectorAll('button')).find((b) => b.textContent?.includes(nombre));

  function crear(rol: RolPanelPago, respuesta: unknown): void {
    servicio.obtener.mockReturnValue(respuesta);
    fixture = TestBed.createComponent(PanelPagoComponent);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('citaId', 7);
    fixture.componentRef.setInput('rol', rol);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    for (const mock of Object.values(servicio)) mock.mockReset();
    servicio.obtenerComprobante.mockReturnValue(of(comprobanteDe()));
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [{ provide: PagoService, useValue: servicio }],
    }).compileComponents();
  });

  describe('carga', () => {
    it('muestra un estado de carga', () => {
      crear('CLIENTE', new Subject<Pago>());
      expect(raiz().textContent).toContain('Cargando el pago');
    });

    it('muestra el error del backend y permite reintentar', () => {
      crear('CLIENTE', throwError(() => falla(403, 'x')));
      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('No tienes permisos');

      servicio.obtener.mockReturnValue(of(pagoDe()));
      boton('Reintentar')!.click();
      fixture.detectChanges();
      expect(texto()).toContain('Costo final');
    });

    it('un 404 no es un error: el cliente ve el mensaje del backend', () => {
      crear('CLIENTE', throwError(() => falla(404, 'Aún no hay un pago para esta cita.')));
      expect(texto()).toContain('Aún no hay un pago para esta cita.');
      expect(raiz().querySelector('[role="alert"]')).toBeNull();
    });
  });

  describe('técnico', () => {
    it('sin costo final ve el formulario y, al registrarlo, ve el monto', () => {
      crear('TECNICO', of(pagoDe({ montoFinal: null })));
      expect(raiz().querySelector('app-costo-final-form')).not.toBeNull();

      servicio.registrarCostoFinal.mockReturnValue(of(pagoDe({ montoFinal: 120000 })));
      const campo = raiz().querySelector<HTMLInputElement>('#costo-final-monto')!;
      campo.value = '120000';
      campo.dispatchEvent(new Event('input'));
      raiz().querySelector<HTMLButtonElement>('app-costo-final-form button[type="submit"]')!.click();
      fixture.detectChanges();

      expect(servicio.registrarCostoFinal).toHaveBeenCalledWith(7, 120000);

      expect(raiz().querySelector('app-costo-final-form')).toBeNull();
      expect(texto()).toContain('$ 120.000');
      expect(raiz().querySelector('[role="status"]')?.textContent).toContain('El costo final fue registrado.');
      expect(texto()).toContain('El cliente aún no ha elegido cómo pagar');
    });

    it('con un 404 también puede registrar el costo final', () => {
      crear('TECNICO', throwError(() => falla(404, 'Sin pago')));
      expect(raiz().querySelector('app-costo-final-form')).not.toBeNull();
    });

    it('no ve el formulario si el backend le niega el acceso', () => {
      crear('TECNICO', throwError(() => falla(403, 'x')));
      expect(raiz().querySelector('app-costo-final-form')).toBeNull();
    });

    it('con efectivo pendiente confirma solo después de aceptar el aviso', () => {
      crear('TECNICO', of(pagoDe({ metodo: 'EFECTIVO' })));
      servicio.confirmarEfectivo.mockReturnValue(of(pagoDe({ metodo: 'EFECTIVO', estado: 'PAGADO' })));

      boton('Confirmar pago en efectivo')!.click();
      fixture.detectChanges();
      expect(servicio.confirmarEfectivo).not.toHaveBeenCalled();
      expect(raiz().querySelector('[role="dialog"]')).not.toBeNull();
      expect(texto()).toContain('recibiste $ 120.000 en efectivo');

      raiz().querySelector<HTMLButtonElement>('[role="dialog"] button[type="submit"]')!.click();
      fixture.detectChanges();

      expect(servicio.confirmarEfectivo).toHaveBeenCalledWith(7);
      expect(raiz().querySelector('[role="dialog"]')).toBeNull();
      expect(texto()).toContain('El pago en efectivo fue confirmado.');
      expect(texto()).toContain('Pagado');
      expect(raiz().querySelector('app-comprobante')).not.toBeNull();
    });

    it('puede cancelar la confirmación sin enviar nada', () => {
      crear('TECNICO', of(pagoDe({ metodo: 'EFECTIVO' })));
      boton('Confirmar pago en efectivo')!.click();
      fixture.detectChanges();

      boton('Cancelar')!.click();
      fixture.detectChanges();

      expect(raiz().querySelector('[role="dialog"]')).toBeNull();
      expect(servicio.confirmarEfectivo).not.toHaveBeenCalled();
    });

    it('muestra el error de la confirmación dentro del diálogo y bloquea el doble envío', () => {
      crear('TECNICO', of(pagoDe({ metodo: 'EFECTIVO' })));
      const respuesta = new Subject<Pago>();
      servicio.confirmarEfectivo.mockReturnValue(respuesta);
      boton('Confirmar pago en efectivo')!.click();
      fixture.detectChanges();

      raiz().querySelector<HTMLButtonElement>('[role="dialog"] button[type="submit"]')!.click();
      fixture.detectChanges();
      componente.confirmarEfectivo();
      componente.cerrarConfirmacionEfectivo();
      expect(servicio.confirmarEfectivo).toHaveBeenCalledTimes(1);
      expect(raiz().querySelector('[role="dialog"]')).not.toBeNull();

      respuesta.error(falla(409, 'El pago ya fue confirmado.'));
      fixture.detectChanges();
      expect(raiz().querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain('El pago ya fue confirmado.');
    });

    it('no ofrece confirmar si el método es en línea', () => {
      crear('TECNICO', of(pagoDe({ metodo: 'EN_LINEA' })));
      expect(boton('Confirmar pago en efectivo')).toBeUndefined();
    });
  });

  describe('cliente', () => {
    it('sin costo final espera al técnico', () => {
      crear('CLIENTE', of(pagoDe({ montoFinal: null })));
      expect(texto()).toContain('El técnico aún no registra el costo final');
      expect(raiz().querySelector('app-selector-metodo-pago')).toBeNull();
    });

    it('con costo final muestra el selector de método', () => {
      crear('CLIENTE', of(pagoDe()));
      expect(raiz().querySelector('app-selector-metodo-pago')).not.toBeNull();
      expect(raiz().querySelector('app-advertencia-diferencia')).toBeNull();
    });

    it('con diferencia significativa la advertencia aparece antes del selector', () => {
      crear('CLIENTE', of(pagoDe({ diferenciaSignificativa: true, porcentajeDiferencia: 20 })));

      const advertencia = raiz().querySelector('app-advertencia-diferencia')!;
      const selector = raiz().querySelector('app-selector-metodo-pago')!;
      expect(advertencia).not.toBeNull();
      expect(advertencia.compareDocumentPosition(selector) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('con la advertencia los costos se muestran una sola vez', () => {
      crear('CLIENTE', of(pagoDe({ diferenciaSignificativa: true, porcentajeDiferencia: 20, metodo: 'EFECTIVO' })));

      expect(texto().match(/Costo estimado/g)).toHaveLength(1);
      expect(texto().match(/costo final/gi)).toHaveLength(2); // la etiqueta y el título de la advertencia
      expect(raiz().querySelectorAll('dt')).toHaveLength(4);
      expect(texto()).toContain('Método de pago');
    });

    it('sin advertencia los costos se muestran en el resumen del panel', () => {
      crear('CLIENTE', of(pagoDe()));
      expect(texto().match(/Costo estimado/g)).toHaveLength(1);
      expect(texto().match(/Costo final/g)).toHaveLength(1);
    });

    it('el técnico y el administrador no ven la advertencia de diferencia', () => {
      crear('TECNICO', of(pagoDe({ diferenciaSignificativa: true })));
      expect(raiz().querySelector('app-advertencia-diferencia')).toBeNull();
    });

    it('con efectivo elegido explica que paga al técnico y el estado queda pendiente', () => {
      crear('CLIENTE', of(pagoDe({ metodo: 'EFECTIVO' })));
      expect(texto()).toContain('le pagarás directamente al técnico');
      expect(texto()).toContain('Pendiente');
      expect(raiz().querySelector('app-selector-metodo-pago')).toBeNull();
    });

    it('al elegir efectivo en el selector el panel pasa a ese estado', () => {
      crear('CLIENTE', of(pagoDe()));
      servicio.elegirMetodo.mockReturnValue(of(pagoDe({ metodo: 'EFECTIVO' })));

      boton('Pagar en efectivo')!.click();
      fixture.detectChanges();

      expect(texto()).toContain('le pagarás directamente al técnico');
    });

    it('con el pago en línea en proceso permite verificar el resultado', () => {
      crear('CLIENTE', of(pagoDe({ metodo: 'EN_LINEA', referencia: 'tx-1' })));
      servicio.sincronizar.mockReturnValue(of(pagoDe({ metodo: 'EN_LINEA', estado: 'PAGADO', referencia: 'tx-1' })));

      expect(texto()).toContain('Tu pago en línea está en proceso');
      boton('Verificar resultado del pago')!.click();
      fixture.detectChanges();

      expect(servicio.sincronizar).toHaveBeenCalledWith(7);
      expect(texto()).toContain('Pagado');
      expect(raiz().querySelector('app-comprobante')).not.toBeNull();
    });

    it('con el pago fallido permite reintentar o cambiar de método', () => {
      crear('CLIENTE', of(pagoDe({ metodo: 'EN_LINEA', estado: 'FALLIDO' })));

      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('El pago no se completó');
      expect(boton('Pagar en línea')).toBeDefined();
      expect(boton('Pagar en efectivo')).toBeDefined();
    });

    it('un pago fallido se explica distinto al técnico y no le ofrece pagar', () => {
      crear('TECNICO', of(pagoDe({ metodo: 'EN_LINEA', estado: 'FALLIDO' })));

      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('del cliente no se completó');
      expect(boton('Pagar en línea')).toBeUndefined();
    });

    it('con el pago pagado muestra el comprobante', () => {
      crear('CLIENTE', of(pagoDe({ metodo: 'EFECTIVO', estado: 'PAGADO' })));

      expect(raiz().querySelector('app-comprobante')).not.toBeNull();
      expect(servicio.obtenerComprobante).toHaveBeenCalledWith(7);
      expect(raiz().querySelector('app-selector-metodo-pago')).toBeNull();
    });
  });

  describe('administrador', () => {
    it('solo consulta: ve el comprobante pero ningún botón de acción', () => {
      crear('ADMIN', of(pagoDe({ metodo: 'EFECTIVO', estado: 'PAGADO' })));

      expect(raiz().querySelector('app-comprobante')).not.toBeNull();
      expect(boton('Confirmar pago en efectivo')).toBeUndefined();
      expect(raiz().querySelector('app-selector-metodo-pago')).toBeNull();
    });

    it('sin costo final no puede registrarlo', () => {
      crear('ADMIN', of(pagoDe({ montoFinal: null })));
      expect(raiz().querySelector('app-costo-final-form')).toBeNull();
    });
  });
});
