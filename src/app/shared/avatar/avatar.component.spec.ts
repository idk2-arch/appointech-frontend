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

  describe('no se deforma dentro de un flex', () => {
    const host = (): HTMLElement => raiz();

    it.each([
      ['sm', '2rem'],
      ['md', '2.5rem'],
      ['lg', '5rem'],
    ])('el tamaño %s fija ancho, ancho mínimo y alto en %s', (tamano, lado) => {
      entradas({ fotoUrl: '/api/fotos/abc', nombre: 'Ana', tamano });

      expect(host().style.width).toBe(lado);
      expect(host().style.minWidth).toBe(lado);
      expect(host().style.height).toBe(lado);
    });

    it('no se encoge, es redondo y conserva la proporción 1:1', () => {
      entradas({ fotoUrl: '/api/fotos/abc', nombre: 'Ana' });

      expect(host().style.flexShrink).toBe('0');
      expect(host().style.flexGrow).toBe('0');
      expect(host().style.aspectRatio).toMatch(/^1\s*\/\s*1$/);
      expect(host().style.borderRadius).toBe('50%');
      expect(host().style.display).toBe('inline-block');
    });

    it('la imagen llena el contenedor y se recorta con object-fit: cover', () => {
      entradas({ fotoUrl: '/api/fotos/abc', nombre: 'Ana' });

      expect(Array.from(imagen()!.classList)).toEqual(expect.arrayContaining(['block', 'h-full', 'w-full', 'object-cover', 'rounded-full']));
    });

    it('el círculo de iniciales también llena el contenedor', () => {
      entradas({ fotoUrl: null, nombre: 'Ana' });

      expect(Array.from(iniciales()!.classList)).toEqual(expect.arrayContaining(['h-full', 'w-full', 'rounded-full']));
    });

    it('con un nombre larguísimo el tamaño sigue siendo el mismo', () => {
      entradas({ fotoUrl: null, nombre: 'María de los Ángeles Fernández-Villaseñor y Gutiérrez de la Concha', tamano: 'sm' });

      expect(host().style.width).toBe('2rem');
      expect(iniciales()?.textContent?.trim()).toBe('MD');
    });
  });
});
