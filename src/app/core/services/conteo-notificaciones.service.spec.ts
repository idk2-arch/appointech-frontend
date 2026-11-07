import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService } from '../../shared/toast/toast.service';
import { ConteoNotificacionesService, INTERVALO_CONTEO_MS } from './conteo-notificaciones.service';
import { NotificacionService } from './notificacion.service';

describe('ConteoNotificacionesService', () => {
  const contar = vi.fn();
  const info = vi.fn();
  let servicio: ConteoNotificacionesService;

  const ocultar = (oculto: boolean): void => {
    Object.defineProperty(document, 'hidden', { value: oculto, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    contar.mockReset().mockReturnValue(of(0));
    info.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: NotificacionService, useValue: { contarNoLeidas: contar } },
        { provide: ToastService, useValue: { info } },
      ],
    });
    servicio = TestBed.inject(ConteoNotificacionesService);
  });

  afterEach(() => {
    servicio.detener();
    vi.useRealTimers();
  });

  it('empieza sin conteo y no lo muestra como 0', () => {
    expect(servicio.noLeidas()).toBeNull();
  });

  it('al iniciar consulta de inmediato, guarda el total y no avisa en la primera carga', () => {
    contar.mockReturnValue(of(5));
    servicio.iniciar();
    expect(contar).toHaveBeenCalledTimes(1);
    expect(servicio.noLeidas()).toBe(5);
    expect(info).not.toHaveBeenCalled();
  });

  it('consulta cada 30 segundos', () => {
    servicio.iniciar();
    vi.advanceTimersByTime(INTERVALO_CONTEO_MS - 1);
    expect(contar).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(contar).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(INTERVALO_CONTEO_MS * 2);
    expect(contar).toHaveBeenCalledTimes(4);
  });

  it('iniciar dos veces no duplica el ciclo', () => {
    servicio.iniciar();
    servicio.iniciar();
    vi.advanceTimersByTime(INTERVALO_CONTEO_MS);
    expect(contar).toHaveBeenCalledTimes(2);
  });

  it('avisa con un toast cuando el conteo sube, en singular y en plural', () => {
    contar.mockReturnValue(of(2));
    servicio.iniciar();
    contar.mockReturnValue(of(3));
    vi.advanceTimersByTime(INTERVALO_CONTEO_MS);
    expect(info).toHaveBeenLastCalledWith('Tienes una notificación nueva');

    contar.mockReturnValue(of(6));
    vi.advanceTimersByTime(INTERVALO_CONTEO_MS);
    expect(info).toHaveBeenLastCalledWith('Tienes 3 notificaciones nuevas');
    expect(info).toHaveBeenCalledTimes(2);
  });

  it('si el conteo baja o se mantiene no avisa', () => {
    contar.mockReturnValue(of(4));
    servicio.iniciar();
    contar.mockReturnValue(of(4));
    vi.advanceTimersByTime(INTERVALO_CONTEO_MS);
    contar.mockReturnValue(of(1));
    vi.advanceTimersByTime(INTERVALO_CONTEO_MS);
    expect(info).not.toHaveBeenCalled();
    expect(servicio.noLeidas()).toBe(1);
  });

  it('un fallo de red conserva el último conteo y el ciclo sigue', () => {
    contar.mockReturnValue(of(2));
    servicio.iniciar();
    contar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    vi.advanceTimersByTime(INTERVALO_CONTEO_MS);
    expect(servicio.noLeidas()).toBe(2);

    contar.mockReturnValue(of(3));
    vi.advanceTimersByTime(INTERVALO_CONTEO_MS);
    expect(servicio.noLeidas()).toBe(3);
  });

  describe('pestaña oculta', () => {
    it('pausa al ocultarse y al volver refresca de inmediato y reanuda', () => {
      servicio.iniciar();
      ocultar(true);
      vi.advanceTimersByTime(INTERVALO_CONTEO_MS * 3);
      expect(contar).toHaveBeenCalledTimes(1);

      ocultar(false);
      expect(contar).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(INTERVALO_CONTEO_MS);
      expect(contar).toHaveBeenCalledTimes(3);
    });

    it('volver a ser visible sin haber estado pausada no duplica el ciclo', () => {
      servicio.iniciar();
      ocultar(false);
      vi.advanceTimersByTime(INTERVALO_CONTEO_MS);
      expect(contar).toHaveBeenCalledTimes(2);
    });

    it('si arranca con la pestaña oculta espera a que sea visible', () => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      servicio.iniciar();
      expect(contar).not.toHaveBeenCalled();
      ocultar(false);
      expect(contar).toHaveBeenCalledTimes(1);
    });
  });

  describe('detener', () => {
    it('para el ciclo, olvida el conteo y deja de escuchar la visibilidad', () => {
      contar.mockReturnValue(of(5));
      servicio.iniciar();
      servicio.detener();

      expect(servicio.noLeidas()).toBeNull();
      vi.advanceTimersByTime(INTERVALO_CONTEO_MS * 2);
      ocultar(false);
      expect(contar).toHaveBeenCalledTimes(1);
    });

    it('cancela una consulta en vuelo', () => {
      const respuesta = new Subject<number>();
      contar.mockReturnValue(respuesta);
      servicio.iniciar();
      servicio.detener();
      expect(respuesta.observed).toBe(false);
    });

    it('la siguiente sesión empieza sin avisar de lo que ya había', () => {
      contar.mockReturnValue(of(2));
      servicio.iniciar();
      servicio.detener();
      contar.mockReturnValue(of(7));
      servicio.iniciar();
      expect(info).not.toHaveBeenCalled();
      expect(servicio.noLeidas()).toBe(7);
    });
  });

  it('refrescar consulta ya y reemplaza una consulta pendiente', () => {
    const lenta = new Subject<number>();
    contar.mockReturnValueOnce(lenta);
    servicio.refrescar();
    contar.mockReturnValue(of(9));
    servicio.refrescar();
    expect(lenta.observed).toBe(false);
    expect(servicio.noLeidas()).toBe(9);
  });
});
