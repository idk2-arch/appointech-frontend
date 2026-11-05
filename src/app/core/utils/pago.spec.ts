import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { pagoDe } from '../models/pago.mock';
import {
  efectivoPorConfirmar,
  enLineaEnProceso,
  esPagoEnLineaEnProceso,
  esPagoEnLineaNoDisponible,
  puedeElegirMetodo,
  tieneCostoFinal,
} from './pago';

const error = (status: number, cuerpo: unknown = null): HttpErrorResponse =>
  new HttpErrorResponse({ status, error: cuerpo });

describe('tieneCostoFinal', () => {
  it('exige un monto final mayor que cero', () => {
    expect(tieneCostoFinal(pagoDe())).toBe(true);
    expect(tieneCostoFinal(pagoDe({ montoFinal: null }))).toBe(false);
    expect(tieneCostoFinal(pagoDe({ montoFinal: 0 }))).toBe(false);
    expect(tieneCostoFinal(null)).toBe(false);
  });
});

describe('puedeElegirMetodo', () => {
  it('permite elegir con costo final y sin método', () => {
    expect(puedeElegirMetodo(pagoDe())).toBe(true);
  });

  it('permite reintentar o cambiar de método cuando el pago falló', () => {
    expect(puedeElegirMetodo(pagoDe({ metodo: 'EN_LINEA', estado: 'FALLIDO' }))).toBe(true);
  });

  it('no permite elegir sin costo final, ya pagado, ni con un método vigente', () => {
    expect(puedeElegirMetodo(null)).toBe(false);
    expect(puedeElegirMetodo(pagoDe({ montoFinal: null }))).toBe(false);
    expect(puedeElegirMetodo(pagoDe({ metodo: 'EFECTIVO', estado: 'PAGADO' }))).toBe(false);
    expect(puedeElegirMetodo(pagoDe({ metodo: 'EFECTIVO' }))).toBe(false);
  });
});

describe('efectivo y en línea pendientes', () => {
  it('reconoce el efectivo por confirmar', () => {
    expect(efectivoPorConfirmar(pagoDe({ metodo: 'EFECTIVO' }))).toBe(true);
    expect(efectivoPorConfirmar(pagoDe({ metodo: 'EFECTIVO', estado: 'PAGADO' }))).toBe(false);
    expect(efectivoPorConfirmar(pagoDe({ metodo: 'EN_LINEA' }))).toBe(false);
    expect(efectivoPorConfirmar(null)).toBe(false);
  });

  it('reconoce el pago en línea en proceso', () => {
    expect(enLineaEnProceso(pagoDe({ metodo: 'EN_LINEA' }))).toBe(true);
    expect(enLineaEnProceso(pagoDe({ metodo: 'EN_LINEA', estado: 'FALLIDO' }))).toBe(false);
    expect(enLineaEnProceso(pagoDe({ metodo: 'EFECTIVO' }))).toBe(false);
    expect(enLineaEnProceso(null)).toBe(false);
  });
});

describe('errores del pago en línea', () => {
  it('503 es pago en línea no disponible', () => {
    expect(esPagoEnLineaNoDisponible(error(503))).toBe(true);
    expect(esPagoEnLineaNoDisponible(error(409))).toBe(false);
    expect(esPagoEnLineaNoDisponible(new Error('x'))).toBe(false);
  });

  it('409 con mensaje de pago en proceso, en ProblemDetail o en el formato de negocio', () => {
    expect(esPagoEnLineaEnProceso(error(409, { detail: 'Ya hay un pago en línea en proceso.' }))).toBe(true);
    expect(esPagoEnLineaEnProceso(error(409, { error: 'Pago EN PROCESO' }))).toBe(true);
  });

  it('otros 409, otros estados o cuerpos sin mensaje no cuentan', () => {
    expect(esPagoEnLineaEnProceso(error(409, { detail: 'La cita no está finalizada.' }))).toBe(false);
    expect(esPagoEnLineaEnProceso(error(409, 'texto'))).toBe(false);
    expect(esPagoEnLineaEnProceso(error(409))).toBe(false);
    expect(esPagoEnLineaEnProceso(error(400, { detail: 'en proceso' }))).toBe(false);
    expect(esPagoEnLineaEnProceso('no es un error HTTP')).toBe(false);
  });
});
