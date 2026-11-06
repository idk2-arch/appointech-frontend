import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SharedModule } from '../shared.module';
import { PaginacionComponent } from './paginacion.component';

describe('PaginacionComponent', () => {
  let fixture: ComponentFixture<PaginacionComponent>;

  const texto = (): string => (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ').trim();
  const boton = (nombre: string): HTMLButtonElement =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.includes(nombre))!;

  function mostrar(entradas: Record<string, unknown>): void {
    for (const [clave, valor] of Object.entries(entradas)) fixture.componentRef.setInput(clave, valor);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SharedModule] }).compileComponents();
    fixture = TestBed.createComponent(PaginacionComponent);
  });

  it('indica el rango que se ve y el total, con el sustantivo en plural', () => {
    mostrar({ pagina: 1, tamano: 10, total: 23, cantidad: 10, singular: 'solicitud', plural: 'solicitudes' });
    expect(texto()).toContain('Mostrando 11–20 de 23 solicitudes');
  });

  it('la última página muestra solo lo que trae', () => {
    mostrar({ pagina: 2, tamano: 10, total: 23, cantidad: 3 });
    expect(texto()).toContain('Mostrando 21–23 de 23');
  });

  it('usa el singular con un solo resultado', () => {
    mostrar({ pagina: 0, total: 1, cantidad: 1, singular: 'pago', plural: 'pagos' });
    expect(texto()).toContain('Mostrando 1–1 de 1 pago');
  });

  it('en la primera página deshabilita Anterior y en la última, Siguiente', () => {
    mostrar({ pagina: 0, tamano: 10, total: 23, cantidad: 10 });
    expect(boton('Anterior').disabled).toBe(true);
    expect(boton('Siguiente').disabled).toBe(false);

    mostrar({ pagina: 2, tamano: 10, total: 23, cantidad: 3 });
    expect(boton('Anterior').disabled).toBe(false);
    expect(boton('Siguiente').disabled).toBe(true);
  });

  it('con todo en una página ambos botones quedan deshabilitados', () => {
    mostrar({ pagina: 0, tamano: 10, total: 10, cantidad: 10 });
    expect(boton('Anterior').disabled).toBe(true);
    expect(boton('Siguiente').disabled).toBe(true);
  });

  it('emite la página a la que se pidió ir', () => {
    mostrar({ pagina: 1, tamano: 10, total: 30, cantidad: 10 });
    const cambios: number[] = [];
    fixture.componentInstance.cambio.subscribe((p) => cambios.push(p));

    boton('Anterior').click();
    boton('Siguiente').click();
    expect(cambios).toEqual([0, 2]);
  });

  it('sin resultados no dibuja nada', () => {
    mostrar({ total: 0, cantidad: 0 });
    expect(texto()).toBe('');
  });
});
