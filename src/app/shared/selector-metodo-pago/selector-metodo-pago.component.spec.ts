import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Pago } from '../../core/models/pago';
import { pagoDe } from '../../core/models/pago.mock';
import { NavegadorService } from '../../core/services/navegador.service';
import { PagoService } from '../../core/services/pago.service';
import { RetornoPagoService } from '../../core/services/retorno-pago.service';
import { SharedModule } from '../shared.module';
import { SelectorMetodoPagoComponent } from './selector-metodo-pago.component';

const falla = (status: number, detail: string): HttpErrorResponse =>
  new HttpErrorResponse({ status, error: { detail } });

describe('SelectorMetodoPagoComponent', () => {
  let fixture: ComponentFixture<SelectorMetodoPagoComponent>;
  let componente: SelectorMetodoPagoComponent;
  const elegirMetodo = vi.fn();
  const sincronizar = vi.fn();
  const redirigir = vi.fn();
  const guardar = vi.fn();

  const raiz = (): HTMLElement => fixture.nativeElement;
  const botones = (): HTMLButtonElement[] => Array.from(raiz().querySelectorAll('fieldset button'));
  const efectivo = (): HTMLButtonElement => botones()[0];
  const enLinea = (): HTMLButtonElement => botones()[1];

  beforeEach(async () => {
    for (const mock of [elegirMetodo, sincronizar, redirigir, guardar]) mock.mockReset();
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [
        { provide: PagoService, useValue: { elegirMetodo, sincronizar } },
        { provide: NavegadorService, useValue: { redirigir } },
        { provide: RetornoPagoService, useValue: { guardar } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SelectorMetodoPagoComponent);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('pago', pagoDe({ referencia: 'tx-9' }));
    fixture.detectChanges();
  });

  it('agrupa las opciones con una leyenda', () => {
    expect(raiz().querySelector('fieldset legend')?.textContent).toContain('¿Cómo quieres pagar?');
    expect(efectivo().textContent).toContain('efectivo');
    expect(enLinea().textContent).toContain('en línea');
  });

  it('efectivo: registra el método y emite el pago actualizado sin redirigir', () => {
    const actualizado = vi.fn();
    componente.actualizado.subscribe(actualizado);
    const pago = pagoDe({ metodo: 'EFECTIVO' });
    elegirMetodo.mockReturnValue(of(pago));

    efectivo().click();

    expect(elegirMetodo).toHaveBeenCalledWith(7, 'EFECTIVO');
    expect(actualizado).toHaveBeenCalledWith(pago);
    expect(redirigir).not.toHaveBeenCalled();
  });

  it('en línea: guarda la cita y redirige a la urlPago recibida', () => {
    elegirMetodo.mockReturnValue(of(pagoDe({ metodo: 'EN_LINEA', urlPago: 'https://pasarela.test/p/1' })));
    redirigir.mockReturnValue(true);

    enLinea().click();
    fixture.detectChanges();

    expect(guardar).toHaveBeenCalledWith(7);
    expect(redirigir).toHaveBeenCalledWith('https://pasarela.test/p/1');
    // Tras redirigir los botones siguen deshabilitados para evitar un segundo clic.
    expect(enLinea().disabled).toBe(true);
  });

  it('en línea: si la urlPago no es válida lo avisa y vuelve a habilitar los botones', () => {
    elegirMetodo.mockReturnValue(of(pagoDe({ metodo: 'EN_LINEA', urlPago: 'javascript:x' })));
    redirigir.mockReturnValue(false);

    enLinea().click();
    fixture.detectChanges();

    expect(raiz().textContent).toContain('La dirección de pago recibida no es válida');
    expect(enLinea().disabled).toBe(false);
  });

  it('en línea sin urlPago emite el pago en vez de redirigir', () => {
    const actualizado = vi.fn();
    componente.actualizado.subscribe(actualizado);
    elegirMetodo.mockReturnValue(of(pagoDe({ metodo: 'EN_LINEA' })));

    enLinea().click();

    expect(redirigir).not.toHaveBeenCalled();
    expect(actualizado).toHaveBeenCalledOnce();
  });

  it('deshabilita ambos botones durante la petición y no envía dos veces', () => {
    const respuesta = new Subject<Pago>();
    elegirMetodo.mockReturnValue(respuesta);

    efectivo().click();
    fixture.detectChanges();
    expect(efectivo().disabled).toBe(true);
    expect(enLinea().disabled).toBe(true);
    expect(enLinea().textContent).toContain('Procesando');

    componente.elegir('EFECTIVO');
    expect(elegirMetodo).toHaveBeenCalledTimes(1);

    respuesta.complete();
    fixture.detectChanges();
    expect(efectivo().disabled).toBe(false);
  });

  it('503: muestra el mensaje, desactiva el pago en línea y deja elegir efectivo', () => {
    elegirMetodo.mockReturnValue(throwError(() => falla(503, 'El pago en línea no está disponible.')));

    enLinea().click();
    fixture.detectChanges();

    expect(raiz().querySelector('[role="status"]')?.textContent).toContain('El pago en línea no está disponible.');
    expect(raiz().textContent).toContain('Por ahora puedes pagar en efectivo');
    expect(enLinea().disabled).toBe(true);
    expect(efectivo().disabled).toBe(false);
  });

  it('409 por pago en proceso: muestra el mensaje y un botón para verificar el resultado', () => {
    elegirMetodo.mockReturnValue(throwError(() => falla(409, 'Ya hay un pago en línea en proceso.')));
    const actualizado = vi.fn();
    componente.actualizado.subscribe(actualizado);

    enLinea().click();
    fixture.detectChanges();

    expect(raiz().textContent).toContain('Ya hay un pago en línea en proceso.');
    const verificar = Array.from(raiz().querySelectorAll('app-verificar-pago button')).find((b) =>
      b.textContent?.includes('Verificar')
    ) as HTMLButtonElement;
    expect(verificar).toBeDefined();

    const pagado = pagoDe({ estado: 'PAGADO' });
    sincronizar.mockReturnValue(of(pagado));
    verificar.click();
    expect(sincronizar).toHaveBeenCalledWith(7);
    expect(actualizado).toHaveBeenCalledWith(pagado);
  });

  it('otro 409 muestra el mensaje sin ofrecer la verificación', () => {
    elegirMetodo.mockReturnValue(throwError(() => falla(409, 'La cita no está finalizada.')));

    efectivo().click();
    fixture.detectChanges();

    expect(raiz().textContent).toContain('La cita no está finalizada.');
    expect(raiz().querySelector('app-verificar-pago')).toBeNull();
  });
});
