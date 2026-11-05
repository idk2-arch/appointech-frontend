import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Pago } from '../../core/models/pago';
import { pagoDe } from '../../core/models/pago.mock';
import { PagoService } from '../../core/services/pago.service';
import { SharedModule } from '../shared.module';
import { EstadoPagoCitaComponent } from './estado-pago-cita.component';

describe('EstadoPagoCitaComponent', () => {
  let fixture: ComponentFixture<EstadoPagoCitaComponent>;
  const obtener = vi.fn();
  const texto = (): string => (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ');

  async function crear(respuesta: unknown, activo = true): Promise<void> {
    obtener.mockReset().mockReturnValue(respuesta);
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [{ provide: PagoService, useValue: { obtener } }],
    }).compileComponents();
    fixture = TestBed.createComponent(EstadoPagoCitaComponent);
    fixture.componentRef.setInput('citaId', 7);
    fixture.componentRef.setInput('activo', activo);
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('muestra el estado y el monto del pago y queda "pagado"', async () => {
    await crear(of(pagoDe({ estado: 'PAGADO' })));
    expect(obtener).toHaveBeenCalledWith(7);
    expect(texto()).toContain('Pagado');
    expect(texto()).toContain('$ 120.000');
    expect(fixture.componentInstance.modo).toBe('pagado');
  });

  it('un pago pendiente o fallido con costo final queda "por pagar"', async () => {
    await crear(of(pagoDe({ estado: 'PENDIENTE' })));
    expect(fixture.componentInstance.modo).toBe('por-pagar');

    TestBed.resetTestingModule();
    await crear(of(pagoDe({ estado: 'FALLIDO' })));
    expect(fixture.componentInstance.modo).toBe('por-pagar');
    expect(texto()).toContain('Fallido');
  });

  it('mientras consulta está "cargando" y muestra un esqueleto accesible', async () => {
    await crear(new Subject<Pago>());
    expect(fixture.componentInstance.modo).toBe('cargando');
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('Consultando el pago');
    expect(fixture.nativeElement.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('sin costo final lo dice en vez de mostrar un monto', async () => {
    await crear(of(pagoDe({ montoFinal: null })));
    expect(fixture.componentInstance.modo).toBe('sin-costo');
    expect(texto()).toContain('El técnico aún no registra el costo final.');
    expect(fixture.nativeElement.querySelector('app-insignia-pago')).toBeNull();
  });

  it('un 404 significa que todavía no hay pago', async () => {
    await crear(throwError(() => new HttpErrorResponse({ status: 404 })));
    expect(fixture.componentInstance.modo).toBe('sin-costo');
    expect(texto()).toContain('El técnico aún no registra el costo final.');
  });

  it('otro error muestra el mensaje del backend y no habilita ninguna acción de pago', async () => {
    await crear(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'Pago bloqueado.' } })));
    expect(fixture.componentInstance.modo).toBe('error');
    expect(texto()).toContain('Pago bloqueado.');
  });

  it('inactivo no consulta nada hasta que se activa, y cada activación vuelve a consultar', async () => {
    await crear(of(pagoDe({ estado: 'PENDIENTE' })), false);
    expect(obtener).not.toHaveBeenCalled();
    expect(fixture.componentInstance.modo).toBe('inactivo');

    fixture.componentRef.setInput('activo', true);
    fixture.detectChanges();
    expect(obtener).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('activo', false);
    fixture.detectChanges();
    expect(obtener).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('activo', true);
    fixture.detectChanges();
    expect(obtener).toHaveBeenCalledTimes(2);
  });

  it('avisa cada pago que llega', async () => {
    const pago = pagoDe({ estado: 'PAGADO' });
    obtener.mockReset().mockReturnValue(of(pago));
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [{ provide: PagoService, useValue: { obtener } }],
    }).compileComponents();
    fixture = TestBed.createComponent(EstadoPagoCitaComponent);
    const cargado = vi.fn();
    fixture.componentInstance.cargado.subscribe(cargado);
    fixture.componentRef.setInput('citaId', 7);
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();

    expect(cargado).toHaveBeenCalledWith(pago);
  });

  it('al destruirse cancela la consulta pendiente', async () => {
    const respuesta = new Subject<Pago>();
    await crear(respuesta);
    fixture.destroy();
    expect(respuesta.observed).toBe(false);
  });
});
