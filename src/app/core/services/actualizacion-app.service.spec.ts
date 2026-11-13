import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService } from '../../shared/toast/toast.service';
import { ActualizacionAppService } from './actualizacion-app.service';
import { NavegadorService } from './navegador.service';

describe('ActualizacionAppService', () => {
  const eventos = new Subject<VersionEvent>();
  const activateUpdate = vi.fn();
  const recargar = vi.fn();
  const sw = { isEnabled: true, versionUpdates: eventos.asObservable(), activateUpdate };
  let toast: ToastService;

  const crear = (habilitado = true): ActualizacionAppService => {
    sw.isEnabled = habilitado;
    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: sw },
        { provide: NavegadorService, useValue: { recargar } },
      ],
    });
    toast = TestBed.inject(ToastService);
    const servicio = TestBed.inject(ActualizacionAppService);
    servicio.vigilar();
    return servicio;
  };

  const versionLista = (): VersionEvent => ({
    type: 'VERSION_READY',
    currentVersion: { hash: 'a' },
    latestVersion: { hash: 'b' },
  });

  beforeEach(() => {
    activateUpdate.mockReset().mockResolvedValue(true);
    recargar.mockReset();
  });

  it('avisa con un aviso persistente cuando hay una versión lista', () => {
    crear();
    eventos.next(versionLista());

    const [aviso] = toast.visibles();
    expect(aviso.titulo).toBe('Hay una nueva versión disponible');
    expect(aviso.duracion).toBe(0);
    expect(aviso.accion?.etiqueta).toBe('Actualizar');
  });

  it('ignora los eventos que no son de versión lista', () => {
    crear();
    eventos.next({ type: 'VERSION_DETECTED', version: { hash: 'b' } });
    eventos.next({ type: 'NO_NEW_VERSION_DETECTED', version: { hash: 'a' } });

    expect(toast.visibles()).toHaveLength(0);
  });

  it('al pulsar Actualizar activa la versión y recarga la página', async () => {
    crear();
    eventos.next(versionLista());
    toast.visibles()[0].accion?.accion();
    await vi.waitFor(() => expect(recargar).toHaveBeenCalledOnce());

    expect(activateUpdate).toHaveBeenCalledOnce();
  });

  it('recarga aunque falle la activación', async () => {
    activateUpdate.mockRejectedValue(new Error('fallo'));
    crear();
    eventos.next(versionLista());
    toast.visibles()[0].accion?.accion();
    await vi.waitFor(() => expect(recargar).toHaveBeenCalledOnce());
  });

  it('no escucha nada si el service worker no está habilitado', () => {
    crear(false);
    eventos.next(versionLista());

    expect(toast.visibles()).toHaveLength(0);
  });
});
