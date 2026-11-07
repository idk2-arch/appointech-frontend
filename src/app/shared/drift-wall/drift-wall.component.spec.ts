import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SharedModule } from '../shared.module';
import { DriftWallComponent } from './drift-wall.component';

const ITEMS = Array.from({ length: 6 }, (_, i) => ({ title: `Foto ${i + 1}`, image: `negocio/foto-${i + 1}.jpg` }));

describe('DriftWallComponent', () => {
  let fixture: ComponentFixture<DriftWallComponent>;
  let alInterseccion: (entradas: { isIntersecting: boolean }[]) => void;
  let alCambiarTamano: () => void;
  let desconexiones: string[];
  let cuadros: Map<number, FrameRequestCallback>;
  let siguienteId: number;
  let reducido: boolean;

  const refrescar = (): void => {
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };
  /** El bucle del muro (y solo ese): Angular también usa requestAnimationFrame para sus propios cuadros. */
  const bucleActivo = (): boolean => (fixture.componentInstance as unknown as { raf: number }).raf !== 0;
  const verse = (visible: boolean): void => alInterseccion([{ isIntersecting: visible }]);
  const ocultarPagina = (oculta: boolean): void => {
    Object.defineProperty(document, 'hidden', { value: oculta, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  };
  const correrCuadro = (): void => {
    const pendientes = [...cuadros.entries()];
    cuadros.clear();
    for (const [, cb] of pendientes) cb(performance.now());
  };

  beforeEach(async () => {
    desconexiones = [];
    cuadros = new Map();
    siguienteId = 0;
    reducido = false;
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cuadros.set(++siguienteId, cb);
      return siguienteId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => cuadros.delete(id));
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: reducido && consulta.includes('reduced-motion'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          alCambiarTamano = cb;
        }
        observe = vi.fn();
        disconnect = () => desconexiones.push('resize');
      }
    );
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: typeof alInterseccion) {
          alInterseccion = cb;
        }
        observe = vi.fn();
        disconnect = () => desconexiones.push('interseccion');
      }
    );
    await TestBed.configureTestingModule({ imports: [SharedModule] }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  const crear = (): void => {
    fixture = TestBed.createComponent(DriftWallComponent);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.detectChanges();
  };

  it('mientras no se ve (oculto por CSS o fuera de pantalla) no arma las columnas, no carga imágenes ni corre ningún cuadro', () => {
    crear();
    expect(fixture.componentInstance.columnData).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(bucleActivo()).toBe(false);

    alCambiarTamano();
    expect(fixture.componentInstance.columnData).toHaveLength(0);
  });

  it('al verse por primera vez arma las columnas y empieza a moverse; las imágenes son de baja prioridad y perezosas', () => {
    crear();
    verse(true);
    refrescar();

    expect(fixture.componentInstance.columnData.length).toBeGreaterThan(0);
    expect(bucleActivo()).toBe(true);
    const imagen = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(imagen.getAttribute('loading')).toBe('lazy');
    expect(imagen.getAttribute('fetchpriority')).toBe('low');
  });

  it('al salir de pantalla se detiene, y al volver continúa sin volver a armar las columnas', () => {
    crear();
    verse(true);
    const columnas = fixture.componentInstance.columnData;

    verse(false);
    expect(bucleActivo()).toBe(false);

    verse(true);
    expect(bucleActivo()).toBe(true);
    expect(fixture.componentInstance.columnData).toBe(columnas);
  });

  it('con la pestaña oculta se detiene y al volver a la pestaña se reanuda', () => {
    crear();
    verse(true);
    expect(bucleActivo()).toBe(true);

    ocultarPagina(true);
    expect(bucleActivo()).toBe(false);

    ocultarPagina(false);
    expect(bucleActivo()).toBe(true);
  });

  it('con la pestaña oculta al verse no arranca el bucle', () => {
    ocultarPagina(true);
    crear();
    verse(true);
    expect(bucleActivo()).toBe(false);
  });

  it('cada cuadro mueve las columnas y vuelve a pedir el siguiente', () => {
    crear();
    verse(true);
    refrescar();
    correrCuadro();
    expect(bucleActivo()).toBe(true);
    const pista = fixture.nativeElement.querySelector('.drift-wall__track') as HTMLElement;
    expect(pista.style.transform).toContain('translate3d');
  });

  it('un cambio de tamaño con el muro visible reconstruye las columnas', () => {
    crear();
    verse(true);
    const antes = fixture.componentInstance.columnData;
    alCambiarTamano();
    expect(fixture.componentInstance.columnData).not.toBe(antes);
  });

  it('sin IntersectionObserver trabaja como antes: arranca de inmediato', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    crear();
    expect(fixture.componentInstance.columnData.length).toBeGreaterThan(0);
    expect(bucleActivo()).toBe(true);
  });

  it('con movimiento reducido arma el muro quieto (clase propia desde el primer cuadro)', () => {
    reducido = true;
    crear();
    expect(fixture.componentInstance.reduced).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('.drift-wall--reduced')).not.toBeNull();
  });

  it('al destruirse cancela el cuadro pendiente, desconecta los observadores y quita sus eventos', () => {
    crear();
    verse(true);
    const quitarDocumento = vi.spyOn(document, 'removeEventListener');
    expect(bucleActivo()).toBe(true);

    fixture.destroy();

    expect(bucleActivo()).toBe(false);
    expect(desconexiones.sort()).toEqual(['interseccion', 'resize']);
    expect(quitarDocumento).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    ocultarPagina(false);
    expect(bucleActivo()).toBe(false);
  });
});
