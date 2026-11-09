import { describe, expect, it } from 'vitest';

import { categoriaNotificacion, rutaDeCita } from './notificacion';
import { tiempoRelativo } from './tiempo-relativo';

describe('tiempoRelativo', () => {
  const ahora = new Date(2026, 10, 20, 12, 0, 0);
  const hace = (ms: number): string => {
    const d = new Date(ahora.getTime() - ms);
    const dos = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
  };
  const MIN = 60_000;
  const HORA = 60 * MIN;
  const DIA = 24 * HORA;

  it('menos de un minuto: justo ahora (también si la fecha está un poco en el futuro)', () => {
    expect(tiempoRelativo(hace(20_000), ahora)).toBe('justo ahora');
    expect(tiempoRelativo(hace(-5_000), ahora)).toBe('justo ahora');
  });

  it('minutos y horas', () => {
    expect(tiempoRelativo(hace(5 * MIN), ahora)).toBe('hace 5 min');
    expect(tiempoRelativo(hace(59 * MIN), ahora)).toBe('hace 59 min');
    expect(tiempoRelativo(hace(2 * HORA + 10 * MIN), ahora)).toBe('hace 2 h');
  });

  it('ayer y días', () => {
    expect(tiempoRelativo(hace(DIA + HORA), ahora)).toBe('ayer');
    expect(tiempoRelativo(hace(3 * DIA), ahora)).toBe('hace 3 días');
    expect(tiempoRelativo(hace(6 * DIA + HORA), ahora)).toBe('hace 6 días');
  });

  it('pasada una semana, la fecha corta (con año si es de otro año)', () => {
    expect(tiempoRelativo(hace(15 * DIA), ahora)).toMatch(/\b5\b.*nov/i);
    expect(tiempoRelativo('2025-03-02T10:00:00', ahora)).toContain('2025');
  });

  it('sin fecha o con una ilegible, cadena vacía; sin "ahora" usa la hora actual', () => {
    expect(tiempoRelativo(null, ahora)).toBe('');
    expect(tiempoRelativo('', ahora)).toBe('');
    expect(tiempoRelativo('nada', ahora)).toBe('');
    expect(tiempoRelativo('2000-01-01T00:00:00')).not.toBe('');
  });
});

describe('categoriaNotificacion', () => {
  it('reconoce pagos, calificaciones y citas por el tipo', () => {
    expect(categoriaNotificacion('PAGO_RECIBIDO')).toBe('pago');
    expect(categoriaNotificacion('costo_final_registrado')).toBe('pago');
    expect(categoriaNotificacion('CALIFICACION_NUEVA')).toBe('calificacion');
    expect(categoriaNotificacion('CITA_CANCELADA')).toBe('cita');
    expect(categoriaNotificacion('SOLICITUD_SIN_HORARIOS')).toBe('cita');
    expect(categoriaNotificacion('SOLICITUD_SIN_TECNICO')).toBe('cita');
    expect(categoriaNotificacion('CITA_REPROGRAMADA')).toBe('cita');
  });

  it('lo desconocido o vacío usa el icono general', () => {
    expect(categoriaNotificacion('OTRO')).toBe('general');
    expect(categoriaNotificacion(null)).toBe('general');
    expect(categoriaNotificacion(undefined)).toBe('general');
  });
});

describe('rutaDeCita', () => {
  it('cliente y administrador tienen detalle de cita', () => {
    expect(rutaDeCita('CLIENTE', 5)).toEqual(['/cliente/citas', '5']);
    expect(rutaDeCita('ADMINISTRADOR', 5)).toEqual(['/admin/citas', '5']);
  });

  it('el técnico no tiene detalle, y sin cita no hay ruta', () => {
    expect(rutaDeCita('TECNICO', 5)).toBeNull();
    expect(rutaDeCita(null, 5)).toBeNull();
    expect(rutaDeCita('CLIENTE', null)).toBeNull();
    expect(rutaDeCita('CLIENTE', undefined)).toBeNull();
  });
});
