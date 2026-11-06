import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { esSolicitudYaAsignada, obtenerMensajeError, obtenerMensajeErrorEscritura } from './manejo-errores';

const http = (status: number, error?: unknown): HttpErrorResponse => new HttpErrorResponse({ status, error });

describe('obtenerMensajeError', () => {
  it('un error que no es HTTP usa el mensaje por defecto', () => {
    expect(obtenerMensajeError(new Error('x'), 'Algo salió mal')).toBe('Algo salió mal');
    expect(obtenerMensajeError(null, 'Algo salió mal')).toBe('Algo salió mal');
  });

  it('sin conexión (estado 0) avisa que no hay conexión con el servidor', () => {
    expect(obtenerMensajeError(http(0), 'x')).toContain('No fue posible conectar con el servidor');
  });

  it('403 avisa que no tiene permisos', () => {
    expect(obtenerMensajeError(http(403), 'x')).toBe('No tienes permisos para realizar esta acción.');
  });

  it('usa el campo "error" de los errores de negocio', () => {
    expect(obtenerMensajeError(http(409, { status: 409, error: 'La hora ya está ocupada' }), 'x')).toBe('La hora ya está ocupada');
  });

  it('usa el campo "detail" de los ProblemDetail y le da prioridad', () => {
    expect(obtenerMensajeError(http(400, { detail: 'Dato inválido', error: 'otro' }), 'x')).toBe('Dato inválido');
  });

  it('ignora mensajes vacíos o que no son texto', () => {
    expect(obtenerMensajeError(http(500, { error: '   ' }), 'por defecto')).toBe('por defecto');
    expect(obtenerMensajeError(http(500, { error: 42 }), 'por defecto')).toBe('por defecto');
    expect(obtenerMensajeError(http(500, 'texto plano'), 'por defecto')).toBe('por defecto');
    expect(obtenerMensajeError(http(500), 'por defecto')).toBe('por defecto');
  });
});

describe('obtenerMensajeErrorEscritura', () => {
  it('400 usa el detalle indicado cuando el backend no manda mensaje', () => {
    expect(obtenerMensajeErrorEscritura(http(400), 'guardar', 'Revisa los datos.')).toBe('Revisa los datos.');
  });

  it('404 y 409 tienen textos comunes', () => {
    expect(obtenerMensajeErrorEscritura(http(404), 'guardar', 'x')).toContain('No encontramos este registro');
    expect(obtenerMensajeErrorEscritura(http(409), 'guardar', 'x')).toContain('Ya existe un usuario');
  });

  it('se pueden cambiar los textos por estado', () => {
    expect(obtenerMensajeErrorEscritura(http(409), 'guardar', 'x', { 409: 'La hora ya no está libre.' })).toBe('La hora ya no está libre.');
    expect(obtenerMensajeErrorEscritura(http(401), 'guardar', 'x', { 401: 'Sesión vencida.' })).toBe('Sesión vencida.');
  });

  it('cualquier otro estado dice que no fue posible hacer la acción', () => {
    expect(obtenerMensajeErrorEscritura(http(500), 'guardar los cambios', 'x')).toBe('No fue posible guardar los cambios. Intenta de nuevo.');
  });

  it('el mensaje del backend siempre tiene prioridad', () => {
    expect(obtenerMensajeErrorEscritura(http(400, { error: 'El correo ya existe' }), 'guardar', 'Revisa los datos.')).toBe('El correo ya existe');
  });

  it('un error que no es HTTP cae en el mensaje genérico', () => {
    expect(obtenerMensajeErrorEscritura(new Error('x'), 'crear', 'y')).toBe('No fue posible crear. Intenta de nuevo.');
  });
});

describe('esSolicitudYaAsignada', () => {
  const conflicto = (error: unknown): HttpErrorResponse => new HttpErrorResponse({ status: 409, error });

  it('reconoce el 409 de una solicitud que ya no está pendiente, con el campo "error" o "detail"', () => {
    expect(esSolicitudYaAsignada(conflicto({ timestamp: 'x', status: 409, error: 'La solicitud ya fue asignada.' }))).toBe(true);
    expect(esSolicitudYaAsignada(conflicto({ detail: 'La solicitud ya está asignada a otro técnico.' }))).toBe(true);
    expect(esSolicitudYaAsignada(conflicto({ error: 'La solicitud no está pendiente.' }))).toBe(true);
  });

  it('un 409 del técnico o del horario no lo es', () => {
    expect(esSolicitudYaAsignada(conflicto({ error: 'El técnico ya tiene una cita en ese horario.' }))).toBe(false);
    expect(esSolicitudYaAsignada(conflicto({ error: 'El técnico está inactivo.' }))).toBe(false);
  });

  it('otros estados, errores sin texto y errores que no son HTTP tampoco', () => {
    expect(esSolicitudYaAsignada(new HttpErrorResponse({ status: 404, error: { error: 'La solicitud ya fue asignada.' } }))).toBe(false);
    expect(esSolicitudYaAsignada(conflicto(null))).toBe(false);
    expect(esSolicitudYaAsignada(conflicto({ error: 42 }))).toBe(false);
    expect(esSolicitudYaAsignada(new Error('x'))).toBe(false);
  });
});

describe('mensajes de los endpoints de asignación manual (formato con el campo "error")', () => {
  const formato = (status: number, error: string): HttpErrorResponse => new HttpErrorResponse({ status, error: { timestamp: '2026-11-04T10:00:00', status, error } });

  it.each([
    [400, 'La fecha de fin debe ser posterior a la de inicio.'],
    [404, 'La solicitud no existe.'],
    [409, 'El técnico tiene un bloqueo en ese horario.'],
  ])('un %s muestra tal cual el mensaje legible del servidor', (estado, mensaje) => {
    expect(obtenerMensajeErrorEscritura(formato(estado, mensaje), 'asignar el técnico', 'texto por defecto')).toBe(mensaje);
  });
});
