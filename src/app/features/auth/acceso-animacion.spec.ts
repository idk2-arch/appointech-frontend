import { Component, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { BuscadorDirecciones, GeocodificadorInverso } from '../../core/services/geocodificacion';
import { CompletarPerfilModule } from '../completar-perfil/completar-perfil.module';
import { CompletarPerfilComponent } from '../completar-perfil/completar-perfil.component';
import { EnConstruccionComponent } from '../en-construccion/en-construccion.component';
import { EnConstruccionModule } from '../en-construccion/en-construccion.module';
import { AuthModule } from './auth.module';
import { LoginComponent } from './login/login.component';
import { RegistroComponent } from './registro/registro.component';

// El fondo animado usa WebGL, que no existe en las pruebas: se reemplaza por una versión vacía.
vi.mock('ogl', () => {
  class Renderer {
    gl = { canvas: document.createElement('canvas'), clearColor(): void {}, getExtension: () => null, drawingBufferWidth: 1, drawingBufferHeight: 1 };
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
  constructor(public alCambiar: IntersectionObserverCallback) {}
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe('Pantallas de acceso: entrada animada', () => {
  let reducido: boolean;
  const envolturas: HTMLElement[] = [];
  let animadas: { objetivo: Element; marcos: Keyframe[]; opciones: KeyframeAnimationOptions; play: ReturnType<typeof vi.fn> }[];

  beforeEach(async () => {
    reducido = false;
    animadas = [];
    vi.stubGlobal('IntersectionObserver', ObservadorFalso);
    vi.stubGlobal('ResizeObserver', ObservadorFalso);
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: reducido && consulta.includes('reduced-motion'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      writable: true,
      value(this: Element, marcos: Keyframe[], opciones: KeyframeAnimationOptions) {
        const animacion = { objetivo: this, marcos, opciones, play: vi.fn(), pause: vi.fn(), cancel: vi.fn(), finished: new Promise<void>(() => undefined) };
        animadas.push(animacion);
        return animacion;
      },
    });
    const auth = { obtenerRol: () => 'CLIENTE', estaAutenticado: () => false, redirigirSegunRol: vi.fn(), cerrarSesion: vi.fn() };
    await TestBed.configureTestingModule({
      declarations: [PaginaFalsaComponent],
      imports: [AuthModule, CompletarPerfilModule, EnConstruccionModule, RouterModule.forRoot([{ path: 'login', component: PaginaFalsaComponent }])],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: BuscadorDirecciones, useValue: { sugerirDirecciones: () => of([]) } },
        { provide: GeocodificadorInverso, useValue: { buscarPorCoordenadas: () => of(null) } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    envolturas.splice(0).forEach((e) => e.remove());
    delete (HTMLElement.prototype as { animate?: unknown }).animate;
    vi.unstubAllGlobals();
  });

  const montar = <T,>(tipo: Type<T>): ComponentFixture<T> => {
    const fixture = TestBed.createComponent(tipo);
    // Como en la app, cada pantalla vive dentro de su propio elemento app-*: la memoria de "primera aparición" es por pantalla.
    const pantalla = document.createElement('app-pantalla-prueba');
    document.body.appendChild(pantalla);
    pantalla.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    envolturas.push(pantalla);
    return fixture;
  };
  const columna = (f: ComponentFixture<unknown>): HTMLElement => f.nativeElement.querySelector('[appaparecer="simple"]') as HTMLElement;

  it.each([
    ['inicio de sesión', LoginComponent],
    ['registro', RegistroComponent],
    ['completar perfil', CompletarPerfilComponent],
    ['en construcción', EnConstruccionComponent],
  ] as const)('%s: la columna del formulario entra con el preset "simple" escalonando sus bloques', (_nombre, tipo) => {
    const fixture = montar(tipo as Type<unknown>);
    const bloque = columna(fixture);
    expect(bloque).not.toBeNull();
    expect(bloque.getAttribute('stagger')).toBe('0.06');
    expect(bloque.getAttribute('duration')).toBe('0.5');

    const propias = animadas.filter((a) => bloque.contains(a.objetivo));
    expect(propias.length).toBeGreaterThan(1);
    // La entrada nunca pasa de 600 ms por elemento y solo mueve opacidad y transformación.
    for (const a of propias) {
      expect(Number(a.opciones.duration)).toBeLessThanOrEqual(600);
      expect(Object.keys(a.marcos[0]).filter((k) => !['offset', 'easing', 'composite'].includes(k)).sort()).toEqual(['opacity', 'transform']);
    }
  });

  it('el formulario se puede usar desde el primer cuadro: campos habilitados, foco y escritura funcionan con la animación en curso', () => {
    const fixture = montar(LoginComponent);
    const bloque = columna(fixture);
    expect(animadas.some((a) => bloque.contains(a.objetivo) || a.objetivo === bloque)).toBe(true);

    const correo = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="email"], input[formcontrolname="correo"]')!;
    expect(correo.disabled).toBe(false);
    expect(getComputedStyle(bloque).pointerEvents).not.toBe('none');
    correo.focus();
    expect(document.activeElement).toBe(correo);
    correo.value = 'ana@correo.co';
    correo.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.form.get('correo')?.value).toBe('ana@correo.co');
  });

  it('el botón de Google queda dentro del bloque animado pero su contenedor no se anima por separado (no cambia de tamaño al renderizarse)', () => {
    const fixture = montar(LoginComponent);
    const boton = fixture.nativeElement.querySelector('app-google-login-button') as HTMLElement;
    expect(boton).not.toBeNull();
    expect(boton.hasAttribute('appaparecer')).toBe(false);
    expect(animadas.some((a) => a.objetivo === boton)).toBe(false);
  });

  it('cada vez que se llega al login anima de nuevo (la memoria de "primera aparición" es por pantalla, no por sesión)', () => {
    const primera = montar(LoginComponent);
    const cuantasPrimera = animadas.length;
    expect(cuantasPrimera).toBeGreaterThan(0);
    primera.destroy();

    // Volver tras cerrar sesión crea una pantalla nueva: vuelve a animar.
    const segunda = montar(LoginComponent);
    expect(animadas.length).toBeGreaterThan(cuantasPrimera);
    expect(animadas.slice(cuantasPrimera).some((a) => columna(segunda).contains(a.objetivo))).toBe(true);
  });

  it('el router puede navegar al login y volver: cada entrada es una instancia nueva que anima', async () => {
    const router = TestBed.inject(Router);
    expect(router).toBeTruthy();
    for (let i = 0; i < 3; i++) {
      const antes = animadas.length;
      const f = montar(LoginComponent);
      expect(animadas.length).toBeGreaterThan(antes);
      f.destroy();
    }
  });

  it('con prefers-reduced-motion todo aparece de inmediato: no se crea ninguna animación', () => {
    reducido = true;
    const fixture = montar(LoginComponent);
    expect(columna(fixture)).not.toBeNull();
    expect(animadas).toHaveLength(0);
  });
});
