import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../core/services/auth.service';
import { ConteoNotificacionesService } from '../../../core/services/conteo-notificaciones.service';
import { TecnicoShellComponent } from './tecnico-shell.component';

describe('TecnicoShellComponent', () => {
  const noLeidas = signal<number | null>(null);
  const conteo = { noLeidas, iniciar: vi.fn(), detener: vi.fn() };
  const cerrarSesion = vi.fn();
  const navigate = vi.fn().mockResolvedValue(true);

  const crear = (): TecnicoShellComponent =>
    new TecnicoShellComponent(
      { cerrarSesion } as unknown as AuthService,
      { navigate } as unknown as Router,
      conteo as unknown as ConteoNotificacionesService
    );

  it('el menú trae Notificaciones con el contador de no leídas', () => {
    noLeidas.set(2);
    const item = crear().menuItems().find((i) => i.value === 'notificaciones')!;
    expect(item).toMatchObject({ label: 'Notificaciones', icon: 'bell', routerLink: '/tecnico/notificaciones', badge: 2 });
    noLeidas.set(null);
    expect(crear().menuItems().find((i) => i.value === 'notificaciones')!.badge).toBeNull();
  });

  it('inicia el conteo al crearse y lo detiene al destruirse', () => {
    const shell = crear();
    shell.ngOnInit();
    expect(conteo.iniciar).toHaveBeenCalledTimes(1);
    shell.ngOnDestroy();
    expect(conteo.detener).toHaveBeenCalledTimes(1);
  });

  it('abre y cierra el menú lateral y cierra sesión', () => {
    const shell = crear();
    shell.abrirSidebar();
    expect(shell.sidebarAbierto).toBe(true);
    shell.cerrarSidebar();
    expect(shell.sidebarAbierto).toBe(false);
    shell.cerrarSesion();
    expect(cerrarSesion).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
