import { Component, NgModule } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SharedModule } from '../shared.module';

@Component({
  selector: 'app-anfitrion-al-entrar',
  standalone: false,
  template: `<div appAlEntrar (alEntrar)="avisos = avisos + 1">contenido</div>`,
})
class AnfitrionComponent {
  avisos = 0;
}

@NgModule({ imports: [SharedModule], declarations: [AnfitrionComponent] })
class AnfitrionModule {}

describe('AlEntrarDirective', () => {
  let alInterseccion: (entradas: { isIntersecting: boolean }[]) => void;
  let opciones: IntersectionObserverInit | undefined;
  const desconectado = vi.fn();

  beforeEach(() => {
    desconectado.mockReset();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: typeof alInterseccion, o?: IntersectionObserverInit) {
          alInterseccion = cb;
          opciones = o;
        }
        observe = vi.fn();
        disconnect = desconectado;
      }
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  const crear = async () => {
    await TestBed.configureTestingModule({ imports: [AnfitrionModule] }).compileComponents();
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
    return fixture;
  };

  it('no avisa mientras el elemento está lejos de la pantalla', async () => {
    const fixture = await crear();
    alInterseccion([{ isIntersecting: false }]);
    expect(fixture.componentInstance.avisos).toBe(0);
  });

  it('avisa una sola vez al acercarse (con un margen) y deja de observar', async () => {
    const fixture = await crear();
    expect(opciones?.rootMargin).toBe('200px 0px');

    alInterseccion([{ isIntersecting: true }]);
    alInterseccion([{ isIntersecting: true }]);

    expect(fixture.componentInstance.avisos).toBe(1);
    expect(desconectado).toHaveBeenCalled();
  });

  it('sin IntersectionObserver avisa enseguida (fuera de la detección de cambios en curso), una vez', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    await TestBed.configureTestingModule({ imports: [AnfitrionModule] }).compileComponents();
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.avisos).toBe(0);

    await Promise.resolve();

    expect(fixture.componentInstance.avisos).toBe(1);
  });

  it('al destruirse desconecta el observador', async () => {
    const fixture = await crear();
    fixture.destroy();
    expect(desconectado).toHaveBeenCalled();
  });
});
