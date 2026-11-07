import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertasAdmin, AlertasAdminService } from '../../../core/services/alertas-admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConteoNotificacionesService } from '../../../core/services/conteo-notificaciones.service';
import { AvisosAlertasService } from '../../../shared/toast/avisos-alertas.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { AdminShellComponent } from './admin-shell.component';

describe('AdminShellComponent', () => {
  const total = signal<number | null>(null);
  const obtener = vi.fn();
  const anunciar = vi.fn();
  const navigate = vi.fn();
  const cerrarSesion = vi.fn();
  const noLeidas = signal<number | null>(null);
  const iniciarConteo = vi.fn();
  const detenerConteo = vi.fn();
  let toast: ToastService;

  function crear(): AdminShellComponent {
    toast = TestBed.inject(ToastService);
    return new AdminShellComponent(
      { cerrarSesion } as unknown as AuthService,
      { navigate } as unknown as Router,
      { obtener, total } as unknown as AlertasAdminService,
      { anunciar } as unknown as AvisosAlertasService,
      toast,
      { noLeidas, iniciar: iniciarConteo, detener: detenerConteo } as unknown as ConteoNotificacionesService
    );
  }

  beforeEach(() => {
    total.set(null);
    noLeidas.set(null);
    iniciarConteo.mockReset();
    detenerConteo.mockReset();
    for (const mock of [obtener, anunciar, navigate, cerrarSesion]) mock.mockReset();
    navigate.mockResolvedValue(true);
  });

  const alertas = (n: number): AlertasAdmin => ({ total: n, alertas: [] });
  const itemAlertas = (shell: AdminShellComponent) => shell.menuItems().find((i) => i.value === 'alertas')!;

  it('el menú tiene "Alertas" junto a las solicitudes por coordinar, con el total como insignia', () => {
    const shell = crear();
    expect(shell.menuItems().map((i) => i.value).slice(3, 6)).toEqual(['citas', 'solicitudes-manuales', 'alertas']);
    expect(itemAlertas(shell)).toMatchObject({ label: 'Alertas', routerLink: '/admin/alertas', icon: 'bell', badge: null });

    total.set(4);
    expect(itemAlertas(shell).badge).toBe(4);
  });

  it('"Dashboard" ya no está deshabilitado y lleva al panel de métricas', () => {
    const dashboard = crear().menuItems().find((i) => i.value === 'dashboard')!;
    expect(dashboard).toMatchObject({ label: 'Dashboard', icon: 'chart', routerLink: '/admin/dashboard' });
    expect(dashboard.disabled).toBeFalsy();
  });

  it('"Historial financiero" ya no está deshabilitado y lleva a los pagos', () => {
    const historial = crear().menuItems().find((i) => i.value === 'historial')!;
    expect(historial.routerLink).toBe('/admin/pagos');
    expect(historial.disabled).toBeFalsy();
  });

  it('el menú conserva su referencia mientras el total no cambia', () => {
    const shell = crear();
    expect(shell.menuItems()).toBe(shell.menuItems());
  });

  it('al entrar carga las alertas y avisa con el total', () => {
    obtener.mockReturnValue(of(alertas(3)));
    crear().ngOnInit();

    expect(obtener).toHaveBeenCalledOnce();
    expect(anunciar).toHaveBeenCalledWith(3);
  });

  it('si falla la carga muestra un toast de error con el mensaje del servidor', () => {
    obtener.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500, error: { detail: 'Sin conexión a la base.' } })));
    crear().ngOnInit();

    expect(anunciar).not.toHaveBeenCalled();
    expect(toast.visibles().map((a) => [a.tipo, a.titulo, a.descripcion])).toEqual([
      ['error', 'No se pudieron cargar las alertas', 'Sin conexión a la base.'],
    ]);
  });

  it('al destruirse cancela la consulta pendiente', () => {
    const respuesta = new Subject<AlertasAdmin>();
    obtener.mockReturnValue(respuesta);
    const shell = crear();
    shell.ngOnInit();
    shell.ngOnDestroy();
    expect(respuesta.observed).toBe(false);
  });

  it('destruirlo sin haber cargado no falla', () => {
    expect(() => crear().ngOnDestroy()).not.toThrow();
  });

  describe('navegación', () => {
    it('buscar una cita abre su detalle y cierra el menú; ignora lo que no es un número entero positivo', () => {
      const shell = crear();
      shell.abrirSidebar();
      expect(shell.sidebarAbierto).toBe(true);

      shell.buscarCita(' 42 ');
      expect(navigate).toHaveBeenCalledWith(['/admin/citas', 42]);
      expect(shell.sidebarAbierto).toBe(false);

      navigate.mockClear();
      for (const invalido of ['', 'abc', '-3', '0', '1.5']) shell.buscarCita(invalido);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('cerrar sesión limpia la sesión y vuelve al login', () => {
      crear().cerrarSesion();
      expect(cerrarSesion).toHaveBeenCalledOnce();
      expect(navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('notificaciones', () => {
    it('el menú trae Notificaciones con el contador de no leídas', () => {
      noLeidas.set(4);
      const item = crear().menuItems().find((i) => i.value === 'notificaciones')!;
      expect(item).toMatchObject({ routerLink: '/admin/notificaciones', icon: 'bell', badge: 4 });
    });

    it('inicia el conteo al crearse y lo detiene al destruirse', () => {
      obtener.mockReturnValue(of(alertas(0)));
      const shell = crear();
      shell.ngOnInit();
      expect(iniciarConteo).toHaveBeenCalledTimes(1);
      shell.ngOnDestroy();
      expect(detenerConteo).toHaveBeenCalledTimes(1);
    });
  });
});
