import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pagoDe } from '../../core/models/pago.mock';
import { Pago } from '../../core/models/pago';
import { PagoService } from '../../core/services/pago.service';
import { SharedModule } from '../shared.module';
import { CostoFinalFormComponent } from './costo-final-form.component';

describe('CostoFinalFormComponent', () => {
  let fixture: ComponentFixture<CostoFinalFormComponent>;
  let componente: CostoFinalFormComponent;
  const registrarCostoFinal = vi.fn();

  const raiz = (): HTMLElement => fixture.nativeElement;
  const boton = (): HTMLButtonElement => raiz().querySelector('button[type="submit"]')!;

  beforeEach(async () => {
    registrarCostoFinal.mockReset();
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [{ provide: PagoService, useValue: { registrarCostoFinal } }],
    }).compileComponents();
    fixture = TestBed.createComponent(CostoFinalFormComponent);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('citaId', 7);
    fixture.detectChanges();
  });

  it('asocia la etiqueta al campo', () => {
    const campo = raiz().querySelector<HTMLInputElement>('#costo-final-monto')!;
    expect(raiz().querySelector('label[for="costo-final-monto"]')).not.toBeNull();
    expect(campo).not.toBeNull();
  });

  it('con el campo vacío avisa y no llama al backend', () => {
    boton().click();
    fixture.detectChanges();

    expect(registrarCostoFinal).not.toHaveBeenCalled();
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Escribe el costo final');
    expect(raiz().querySelector('#costo-final-monto')?.getAttribute('aria-invalid')).toBe('true');
  });

  it.each([0, -5])('rechaza %s porque debe ser mayor que cero', (valor) => {
    componente.monto.setValue(valor);
    boton().click();
    fixture.detectChanges();

    expect(registrarCostoFinal).not.toHaveBeenCalled();
    expect(raiz().textContent).toContain('mayor que cero');
  });

  it('muestra el valor en pesos mientras se escribe', () => {
    componente.monto.setValue(120000);
    fixture.detectChanges();
    expect((raiz().textContent ?? '').replace(/\s+/g, ' ')).toContain('Se registrará: $ 120.000');
  });

  it('registra el costo y emite el pago', () => {
    const registrado = vi.fn();
    componente.registrado.subscribe(registrado);
    const pago = pagoDe();
    registrarCostoFinal.mockReturnValue(of(pago));
    componente.monto.setValue(120000);

    boton().click();

    expect(registrarCostoFinal).toHaveBeenCalledWith(7, 120000);
    expect(registrado).toHaveBeenCalledWith(pago);
  });

  it('deshabilita el botón durante la petición y evita un segundo envío', () => {
    const respuesta = new Subject<Pago>();
    registrarCostoFinal.mockReturnValue(respuesta);
    componente.monto.setValue(5000);

    boton().click();
    fixture.detectChanges();
    expect(boton().disabled).toBe(true);
    expect(boton().textContent).toContain('Registrando');

    componente.registrar();
    expect(registrarCostoFinal).toHaveBeenCalledTimes(1);

    respuesta.next(pagoDe());
    respuesta.complete();
    fixture.detectChanges();
    expect(boton().disabled).toBe(false);
  });

  it('muestra tal cual el mensaje de error del backend', () => {
    registrarCostoFinal.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { detail: 'La cita debe estar finalizada.' } }))
    );
    componente.monto.setValue(5000);

    boton().click();
    fixture.detectChanges();

    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('La cita debe estar finalizada.');
    expect(boton().disabled).toBe(false);
  });
});
