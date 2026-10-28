import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Perfil } from '../../core/models/perfil';
import { AuthService } from '../../core/services/auth.service';
import { FotoPerfilService } from '../../core/services/foto-perfil.service';
import { PerfilService } from '../../core/services/perfil.service';
import { SesionService } from '../../core/services/sesion.service';
import { SharedModule } from '../shared.module';
import { MiPerfilComponent } from './mi-perfil.component';

const BASE: Perfil = {
  nombre: 'Ana',
  apellido: 'Pérez',
  correo: 'ana@correo.co',
  telefono: '3001234567',
  tipoDocumento: 'CC',
  numeroDocumento: '123456',
  direccion: 'Calle 6 # 12-34',
};

const PERFILES: Record<string, Perfil> = {
  CLIENTE: BASE,
  TECNICO: { ...BASE, nombre: 'Luis', apellido: 'Gómez', radioCoberturaKm: 15, especialidades: [{ id: 1, nombre: 'Lavadoras' }] },
  ADMINISTRADOR: { ...BASE, nombre: 'Sara', apellido: 'Ruiz', direccion: null },
};

describe('MiPerfilComponent', () => {
  let fixture: ComponentFixture<MiPerfilComponent>;
  let componente: MiPerfilComponent;
  let fotos: { subirPropia: ReturnType<typeof vi.fn>; quitarPropia: ReturnType<typeof vi.fn> };
  let perfiles: { obtener: ReturnType<typeof vi.fn>; actualizar: ReturnType<typeof vi.fn> };
  let sesion: SesionService;

  const raiz = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => raiz().textContent?.replace(/\s+/g, ' ') ?? '';
  const boton = (etiqueta: string): HTMLButtonElement =>
    Array.from(raiz().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === etiqueta)!;

  /** Los cambios hechos directo en el componente (no por un evento) hay que marcarlos a mano. */
  const refrescar = (): void => {
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };

  async function crear(rol: string, perfil: Perfil = PERFILES[rol]): Promise<void> {
    localStorage.clear();
    fotos = {
      subirPropia: vi.fn().mockReturnValue(of({ fotoUrl: '/api/fotos/nueva' })),
      quitarPropia: vi.fn().mockReturnValue(of(undefined)),
    };
    perfiles = { obtener: vi.fn().mockReturnValue(of(perfil)), actualizar: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [
        { provide: FotoPerfilService, useValue: fotos },
        { provide: PerfilService, useValue: perfiles },
        { provide: AuthService, useValue: { obtenerRol: () => rol } },
      ],
    }).compileComponents();
    sesion = TestBed.inject(SesionService);
    fixture = TestBed.createComponent(MiPerfilComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => localStorage.clear());

  describe.each(['CLIENTE', 'TECNICO', 'ADMINISTRADOR'])('pantalla de perfil del rol %s', (rol) => {
    beforeEach(() => crear(rol));

    it('muestra la foto arriba y los datos de la persona', () => {
      expect(raiz().querySelector('app-carga-foto')).not.toBeNull();
      expect(raiz().querySelector('app-perfil-datos')).not.toBeNull();
      expect(texto()).toContain(`${PERFILES[rol].nombre} ${PERFILES[rol].apellido}`);
      expect(texto()).toContain('ana@correo.co');
      expect(texto()).toContain('Para cambiar estos datos contacta al administrador.');
    });

    it('muestra lo que corresponde a su rol', () => {
      expect(texto().includes('Especialidades')).toBe(rol === 'TECNICO');
      expect(texto().includes('Dirección')).toBe(rol !== 'ADMINISTRADOR');
    });

    it('pone el nombre en la sesión para el menú', () => {
      expect(sesion.nombreActual).toBe(`${PERFILES[rol].nombre} ${PERFILES[rol].apellido}`);
    });

    it('permite editar y guardar, avisa y actualiza el nombre del menú sin recargar', () => {
      perfiles.actualizar.mockReturnValue(of({ ...PERFILES[rol], nombre: 'Nuevo' }));
      boton('Editar').click();
      fixture.detectChanges();
      const nombre = raiz().querySelector<HTMLInputElement>('#perfil-nombre')!;
      nombre.value = 'Nuevo';
      nombre.dispatchEvent(new Event('input'));

      raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(perfiles.actualizar).toHaveBeenCalledTimes(1);
      expect(perfiles.actualizar.mock.calls[0][0]).toMatchObject({ nombre: 'Nuevo', apellido: PERFILES[rol].apellido });
      expect(raiz().querySelector('[role="status"]')?.textContent).toContain('Tus datos fueron actualizados.');
      expect(sesion.nombreActual).toBe(`Nuevo ${PERFILES[rol].apellido}`);
      expect(raiz().querySelector('form')).toBeNull();
      expect(texto()).toContain(`Nuevo ${PERFILES[rol].apellido}`);
    });
  });

  describe('carga del perfil', () => {
    it('mientras carga muestra el estado de carga', async () => {
      const respuesta = new Subject<Perfil>();
      await crear('CLIENTE');
      perfiles.obtener.mockReturnValue(respuesta);

      componente.cargarPerfil();
      refrescar();

      expect(raiz().querySelector('[role="status"]')?.textContent).toContain('Cargando tus datos');
      expect(raiz().querySelector('app-perfil-datos')).toBeNull();

      respuesta.next(BASE);
      respuesta.complete();
      refrescar();
      expect(raiz().querySelector('app-perfil-datos')).not.toBeNull();
    });

    it('si falla muestra el mensaje y permite reintentar; la foto sigue disponible', async () => {
      await crear('CLIENTE');
      perfiles.obtener.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500, error: { status: 500, error: 'Servicio no disponible' } }))
      );
      componente.cargarPerfil();
      fixture.detectChanges();

      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Servicio no disponible');
      expect(raiz().querySelector('app-carga-foto')).not.toBeNull();

      perfiles.obtener.mockReturnValue(of(BASE));
      boton('Reintentar').click();
      fixture.detectChanges();
      expect(raiz().querySelector('app-perfil-datos')).not.toBeNull();
    });

    it('sin mensaje del servidor usa uno claro en español', async () => {
      await crear('CLIENTE');
      perfiles.obtener.mockReturnValue(throwError(() => new Error('x')));
      componente.cargarPerfil();
      fixture.detectChanges();
      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('No fue posible cargar tu perfil.');
    });

    it('si el perfil trae la foto, la sesión la toma', async () => {
      await crear('CLIENTE', { ...BASE, fotoUrl: '/api/fotos/perfil' });
      expect(sesion.fotoUrl).toBe('/api/fotos/perfil');
    });

    it('si el perfil no trae el campo de la foto, no la toca', async () => {
      localStorage.setItem('appointech_foto_url', '/api/fotos/guardada');
      await crear('CLIENTE');
      localStorage.setItem('appointech_foto_url', '/api/fotos/guardada');
      sesion.establecerFoto('/api/fotos/guardada');
      componente.cargarPerfil();
      expect(sesion.fotoUrl).toBe('/api/fotos/guardada');
    });

    it('el rol del perfil manda sobre el del token', async () => {
      await crear('CLIENTE', { ...BASE, rol: 'TECNICO', radioCoberturaKm: 10, especialidades: [] });
      expect(componente.rol).toBe('TECNICO');
      expect(texto()).toContain('Radio de cobertura');
    });
  });

  describe('guardar datos con errores', () => {
    beforeEach(async () => {
      await crear('CLIENTE');
      boton('Editar').click();
      fixture.detectChanges();
    });

    const guardarConError = (status: number, cuerpo: unknown): void => {
      perfiles.actualizar.mockReturnValue(throwError(() => new HttpErrorResponse({ status, error: cuerpo })));
      raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    };

    it('400: muestra el mensaje del backend, sigue en edición y conserva el nombre de la sesión', () => {
      guardarConError(400, { status: 400, error: 'El teléfono no es válido' });

      expect(raiz().querySelector('form [role="alert"]')?.textContent).toContain('El teléfono no es válido');
      expect(raiz().querySelector('form')).not.toBeNull();
      expect(sesion.nombreActual).toBe('Ana Pérez');
      expect(raiz().querySelector('[role="status"]')).toBeNull();
    });

    it('400 sin mensaje: texto claro en español', () => {
      guardarConError(400, null);
      expect(raiz().querySelector('form [role="alert"]')?.textContent).toContain('Revisa los datos e intenta de nuevo.');
    });

    it('401: avisa que la sesión expiró', () => {
      guardarConError(401, null);
      expect(raiz().querySelector('form [role="alert"]')?.textContent).toContain('Tu sesión expiró. Inicia sesión de nuevo.');
    });

    it('error de red', () => {
      guardarConError(0, null);
      expect(raiz().querySelector('form [role="alert"]')?.textContent).toContain('No fue posible conectar con el servidor');
    });

    it('un error desconocido: texto genérico', () => {
      guardarConError(500, null);
      expect(raiz().querySelector('form [role="alert"]')?.textContent).toContain('No fue posible guardar tus datos.');
    });

    it('al reintentar con éxito, el error desaparece', () => {
      guardarConError(400, { status: 400, error: 'Dato inválido' });

      perfiles.actualizar.mockReturnValue(of(BASE));
      raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(raiz().querySelector('form')).toBeNull();
      expect(raiz().querySelector('[role="status"]')?.textContent).toContain('Tus datos fueron actualizados.');
    });

    it('mientras guarda no permite enviar de nuevo', () => {
      perfiles.actualizar.mockReturnValue(new Subject<Perfil>());
      raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(componente.guardandoDatos).toBe(true);
      expect(boton('Guardando…').disabled).toBe(true);
    });

    it('si el servidor no devuelve el perfil completo, conserva lo que ya tenía', () => {
      perfiles.actualizar.mockReturnValue(of(null));
      const nombre = raiz().querySelector<HTMLInputElement>('#perfil-nombre')!;
      nombre.value = 'Ana María';
      nombre.dispatchEvent(new Event('input'));

      raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(componente.perfil).toMatchObject({ nombre: 'Ana María', apellido: 'Pérez', correo: 'ana@correo.co' });
      expect(sesion.nombreActual).toBe('Ana María Pérez');
    });
  });

  describe('foto', () => {
    beforeEach(() => crear('CLIENTE'));

    it('al guardar envía la foto, actualiza la sesión y avisa', () => {
      componente.guardar('data:image/jpeg;base64,QUJD');
      fixture.detectChanges();

      expect(fotos.subirPropia).toHaveBeenCalledWith('data:image/jpeg;base64,QUJD');
      expect(sesion.fotoUrl).toBe('/api/fotos/nueva');
      expect(raiz().querySelector('[role="status"]')?.textContent).toContain('actualizada');
      expect(componente.enviando).toBe(false);
    });

    it('al quitar borra la foto de la sesión', () => {
      sesion.establecerFoto('/api/fotos/vieja');

      componente.quitar();
      fixture.detectChanges();

      expect(fotos.quitarPropia).toHaveBeenCalledTimes(1);
      expect(sesion.fotoUrl).toBeNull();
      expect(raiz().querySelector('[role="status"]')?.textContent).toContain('eliminada');
    });

    it('si el servidor rechaza la foto muestra su mensaje y conserva la foto actual', () => {
      sesion.establecerFoto('/api/fotos/vieja');
      fotos.subirPropia.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 400, error: { status: 400, error: 'Imagen inválida' } }))
      );

      componente.guardar('data:image/jpeg;base64,QUJD');
      fixture.detectChanges();

      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Imagen inválida');
      expect(sesion.fotoUrl).toBe('/api/fotos/vieja');
      expect(componente.enviando).toBe(false);
    });

    it('si falla al quitar, muestra el mensaje', () => {
      fotos.quitarPropia.mockReturnValue(throwError(() => new Error('x')));
      componente.quitar();
      expect(componente.errorMensaje).toBe('No fue posible quitar la foto.');
    });
  });

  it('al destruirse cancela las peticiones en curso', async () => {
    await crear('CLIENTE');
    const pendiente = new Subject<Perfil>();
    perfiles.actualizar.mockReturnValue(pendiente);
    componente.guardarDatos({ nombre: 'Ana', apellido: 'Pérez' });
    expect(pendiente.observed).toBe(true);

    fixture.destroy();

    expect(pendiente.observed).toBe(false);
  });
});
