import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../core/services/auth.service';
import { ConteoNotificacionesService } from '../../../core/services/conteo-notificaciones.service';
import { ClienteModule } from '../cliente.module';
import { ClienteShellComponent } from './cliente-shell.component';

// El fondo animado usa WebGL, que no existe en las pruebas: se reemplaza por una versión vacía.
vi.mock('ogl', () => {
  class Renderer {
    gl = {
      canvas: document.createElement('canvas'),
      clearColor(): void {},
      getExtension: () => null,
      drawingBufferWidth: 1,
      drawingBufferHeight: 1,
    };
    setSize(): void {}
    render(): void {}
  }
  class Program {
    uniforms: unknown;
    constructor(_gl: unknown, opciones: { uniforms: unknown }) {
      this.uniforms = opciones.uniforms;
    }
  }
  class Mesh {}
  class Triangle {}
  return { Renderer, Program, Mesh, Triangle };
});

@Component({ template: '', standalone: false })
class PaginaFalsaComponent {}

class ObservadorFalso {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe('ClienteShellComponent', () => {
  let fixture: ComponentFixture<ClienteShellComponent>;
  let authService: { cerrarSesion: ReturnType<typeof vi.fn> };
  let router: Router;
  const conteo = { noLeidas: signal<number | null>(3), iniciar: vi.fn(), detener: vi.fn() };

  beforeEach(async () => {
    vi.stubGlobal('ResizeObserver', ObservadorFalso);
    vi.stubGlobal('IntersectionObserver', ObservadorFalso);
    authService = { cerrarSesion: vi.fn() };
    conteo.iniciar.mockReset();
    conteo.detener.mockReset();

    await TestBed.configureTestingModule({
      declarations: [PaginaFalsaComponent],
      imports: [ClienteModule, RouterModule.forRoot([{ path: 'login', component: PaginaFalsaComponent }])],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConteoNotificacionesService, useValue: conteo },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ClienteShellComponent);
    fixture.detectChanges();
  });

  afterEach(() => vi.unstubAllGlobals());

  const raiz = (): HTMLElement => fixture.nativeElement;

  it('muestra el encabezado y los cinco items del menú', () => {
    const texto = raiz().textContent ?? '';
    expect(texto).toContain('Cliente');
    for (const etiqueta of ['Solicitar servicio', 'Mis citas', 'Historial', 'Notificaciones', 'Mi perfil']) {
      expect(texto).toContain(etiqueta);
    }
  });

  it('"Solicitar servicio" es un enlace activo hacia el flujo de pedir servicio', () => {
    const enlace = raiz().querySelector<HTMLAnchorElement>('a.sidebar-menu__row');
    expect(enlace?.textContent).toContain('Solicitar servicio');
    expect(enlace?.getAttribute('href')).toBe('/cliente/solicitar');
  });

  it('ningún item queda como "Próximamente": Notificaciones ya es un enlace con el contador de no leídas', () => {
    expect(raiz().querySelectorAll('button.sidebar-menu__row')).toHaveLength(0);
    const enlace = Array.from(raiz().querySelectorAll<HTMLAnchorElement>('a.sidebar-menu__row')).find((a) => a.textContent?.includes('Notificaciones'))!;
    expect(enlace.getAttribute('href')).toBe('/cliente/notificaciones');
    expect(enlace.querySelector('.sidebar-menu__badge')?.textContent).toContain('3');
    expect(raiz().textContent).not.toContain('Próximamente');
  });

  it('inicia el conteo de notificaciones al abrirse y lo detiene al destruirse', () => {
    expect(conteo.iniciar).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(conteo.detener).toHaveBeenCalledTimes(1);
  });


  it('"Cerrar sesión" llama al servicio de autenticación y lleva al login', () => {
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const boton = Array.from(raiz().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Cerrar sesión')
    );

    boton?.click();

    expect(authService.cerrarSesion).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });
});
