import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SharedModule } from '../shared.module';
import { AvatarComponent } from './avatar.component';

describe('AvatarComponent', () => {
  let fixture: ComponentFixture<AvatarComponent>;

  const raiz = (): HTMLElement => fixture.nativeElement;
  const imagen = (): HTMLImageElement | null => raiz().querySelector('img');
  const iniciales = (): HTMLElement | null => raiz().querySelector('[role="img"]');

  function entradas(valores: Record<string, unknown>): void {
    for (const [clave, valor] of Object.entries(valores)) fixture.componentRef.setInput(clave, valor);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SharedModule] }).compileComponents();
    fixture = TestBed.createComponent(AvatarComponent);
  });

  it('con foto muestra la imagen con la URL completa del servidor y un alt con el nombre', () => {
    entradas({ fotoUrl: '/api/fotos/abc', nombre: 'Ana Pérez' });

    expect(imagen()?.getAttribute('src')).toBe('http://localhost:8080/api/fotos/abc');
    expect(imagen()?.alt).toBe('Foto de Ana Pérez');
    expect(iniciales()).toBeNull();
  });

  it('sin foto muestra las iniciales con un nombre accesible', () => {
    entradas({ fotoUrl: null, nombre: 'Ana Pérez' });

    expect(imagen()).toBeNull();
    expect(iniciales()?.textContent?.trim()).toBe('AP');
    expect(iniciales()?.getAttribute('aria-label')).toBe('Foto de Ana Pérez');
  });

  it('sin foto ni nombre muestra un signo de interrogación y un alt genérico', () => {
    entradas({ fotoUrl: undefined, nombre: '' });

    expect(iniciales()?.textContent?.trim()).toBe('?');
    expect(iniciales()?.getAttribute('aria-label')).toBe('Foto de perfil');
  });

  it('si la imagen falla al cargar vuelve a las iniciales', () => {
    entradas({ fotoUrl: '/api/fotos/rota', nombre: 'Luis Gómez' });

    imagen()!.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(imagen()).toBeNull();
    expect(iniciales()?.textContent?.trim()).toBe('LG');
  });

  it('una foto nueva vuelve a intentar cargar después de un fallo', () => {
    entradas({ fotoUrl: '/api/fotos/rota', nombre: 'Luis Gómez' });
    imagen()!.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    entradas({ fotoUrl: '/api/fotos/nueva' });

    expect(imagen()?.getAttribute('src')).toBe('http://localhost:8080/api/fotos/nueva');
  });

  it.each([
    ['sm', 'h-8'],
    ['md', 'h-10'],
    ['lg', 'h-20'],
  ])('el tamaño %s usa la clase %s', (tamano, clase) => {
    entradas({ fotoUrl: null, nombre: 'Ana', tamano });
    expect(iniciales()?.classList).toContain(clase);
  });
});
