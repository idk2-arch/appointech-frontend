import { ChangeDetectorRef, ElementRef, NgZone, QueryList } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SidebarMenuComponent } from './sidebar-menu.component';
import '../shared.module';

describe('SidebarMenuComponent: píldora que sigue a la fila activa', () => {
  let componente: SidebarMenuComponent;
  let alCambiarTamano: () => void;
  let observar: ReturnType<typeof vi.fn>;
  let desconectar: ReturnType<typeof vi.fn>;

  /** Filas con la posición y altura que tendrían en pantalla. */
  const filas = [
    { offsetTop: 0, offsetHeight: 36 },
    { offsetTop: 38, offsetHeight: 36 },
    { offsetTop: 76, offsetHeight: 40 },
  ];

  function montar(conLista = true): void {
    const internos = componente as unknown as { listRef?: ElementRef<HTMLElement>; rowRefs?: QueryList<ElementRef<HTMLElement>> };
    internos.listRef = conLista ? new ElementRef(document.createElement('ul')) : undefined;
    internos.rowRefs = { get: (i: number) => (filas[i] ? new ElementRef(filas[i] as unknown as HTMLElement) : undefined) } as unknown as QueryList<ElementRef<HTMLElement>>;
  }

  beforeEach(() => {
    observar = vi.fn();
    desconectar = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          alCambiarTamano = callback;
        }
        observe = observar;
        disconnect = desconectar;
      }
    );
    componente = new SidebarMenuComponent(
      { markForCheck: vi.fn() } as unknown as ChangeDetectorRef,
      { runOutsideAngular: (fn: () => void) => fn() } as unknown as NgZone
    );
    montar();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('al iniciar, sin ninguna fila activa, la píldora no se ve', () => {
    componente.ngAfterViewInit();
    expect(componente.pillVisible).toBe(false);
  });

  it('observa el tamaño de la lista', () => {
    componente.ngAfterViewInit();
    expect(observar).toHaveBeenCalledTimes(1);
  });

  it('sin lista no observa nada', () => {
    montar(false);
    componente.ngAfterViewInit();
    expect(observar).not.toHaveBeenCalled();
  });

  it('pasar el cursor sobre una fila lleva la píldora a esa fila', () => {
    componente.onRowEnter(2);

    expect(componente.hoveredIndex).toBe(2);
    expect(componente.pillTop).toBe(76);
    expect(componente.pillHeight).toBe(40);
    expect(componente.pillVisible).toBe(true);
  });

  it('al salir el cursor vuelve a la fila activa; sin activa, se oculta', () => {
    componente.activeIndex = 1;
    componente.onRowEnter(2);

    componente.onRowLeave();
    expect(componente.hoveredIndex).toBeNull();
    expect(componente.pillTop).toBe(38);

    componente.activeIndex = -1;
    componente.onRowLeave();
    expect(componente.pillVisible).toBe(false);
  });

  it('una fila que se vuelve activa mueve la píldora (después del ciclo actual)', async () => {
    componente.onActiveChange(1, true);
    expect(componente.activeIndex).toBe(1);

    await Promise.resolve();

    expect(componente.pillTop).toBe(38);
    expect(componente.pillVisible).toBe(true);
  });

  it('una fila que deja de estar activa no cambia nada', async () => {
    componente.activeIndex = 2;
    componente.onActiveChange(0, false);
    await Promise.resolve();
    expect(componente.activeIndex).toBe(2);
  });

  it('un índice sin fila oculta la píldora', () => {
    componente.onRowEnter(9);
    expect(componente.pillVisible).toBe(false);
  });

  it('sin lista, no se mueve nada', () => {
    montar(false);
    componente.onRowEnter(1);
    expect(componente.pillVisible).toBe(false);
  });

  it('el primer aviso de cambio de tamaño se ignora y los siguientes recolocan la píldora', () => {
    componente.activeIndex = 1;
    componente.ngAfterViewInit();
    expect(componente.pillTop).toBe(38);

    filas[1] = { offsetTop: 50, offsetHeight: 36 };
    alCambiarTamano();
    expect(componente.pillTop).toBe(38);

    alCambiarTamano();
    expect(componente.pillTop).toBe(50);
    filas[1] = { offsetTop: 38, offsetHeight: 36 };
  });

  it('si cambian los items (después del primero) recoloca la píldora', async () => {
    componente.activeIndex = 0;
    filas[0] = { offsetTop: 4, offsetHeight: 36 };

    componente.ngOnChanges({ items: { previousValue: [], currentValue: [{}], firstChange: false, isFirstChange: () => false } });
    await Promise.resolve();

    expect(componente.pillTop).toBe(4);
    filas[0] = { offsetTop: 0, offsetHeight: 36 };
  });

  it('el primer valor de los items o cualquier otra entrada no hace nada', async () => {
    componente.activeIndex = 0;
    componente.ngOnChanges({ items: { previousValue: undefined, currentValue: [], firstChange: true, isFirstChange: () => true } });
    componente.ngOnChanges({});
    await Promise.resolve();
    expect(componente.pillVisible).toBe(false);
  });

  it('al destruirse deja de observar', () => {
    componente.ngAfterViewInit();
    componente.ngOnDestroy();
    expect(desconectar).toHaveBeenCalledTimes(1);
  });

  it('destruirlo sin haber arrancado no falla', () => {
    expect(() => componente.ngOnDestroy()).not.toThrow();
  });
});
