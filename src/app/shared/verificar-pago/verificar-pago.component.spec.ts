import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Pago } from '../../core/models/pago';
import { pagoDe } from '../../core/models/pago.mock';
import { PagoService } from '../../core/services/pago.service';
import { SharedModule } from '../shared.module';
import { VerificarPagoComponent } from './verificar-pago.component';

describe('VerificarPagoComponent', () => {
  let fixture: ComponentFixture<VerificarPagoComponent>;
  let componente: VerificarPagoComponent;
  const sincronizar = vi.fn();

  const boton = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');

  function crear(): void {
    fixture = TestBed.createComponent(VerificarPagoComponent);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('citaId', 7);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    sincronizar.mockReset();
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [{ provide: PagoService, useValue: { sincronizar } }],
    }).compileComponents();
  });

  it('sincroniza sin mandar la referencia y emite el pago actualizado', () => {
    crear();
    const actualizado = vi.fn();
    componente.actualizado.subscribe(actualizado);
    const pago = pagoDe({ estado: 'PAGADO' });
    sincronizar.mockReturnValue(of(pago));

    boton().click();

    expect(sincronizar).toHaveBeenCalledWith(7);
    expect(actualizado).toHaveBeenCalledWith(pago);
  });

  it('deshabilita el botón mientras verifica y evita el doble clic', () => {
    crear();
    const respuesta = new Subject<Pago>();
    sincronizar.mockReturnValue(respuesta);

    boton().click();
    fixture.detectChanges();
    expect(boton().disabled).toBe(true);
    expect(boton().textContent).toContain('Verificando');

    componente.verificar();
    expect(sincronizar).toHaveBeenCalledTimes(1);

    respuesta.next(pagoDe());
    respuesta.complete();
    fixture.detectChanges();
    expect(boton().disabled).toBe(false);
  });

  it('muestra el mensaje del backend si falla', () => {
    crear();
    sincronizar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'El pago no es en línea o no tiene referencia.' } }))
    );

    boton().click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('El pago no es en línea o no tiene referencia.');
  });
});
