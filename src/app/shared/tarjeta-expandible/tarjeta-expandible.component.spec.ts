import { Component, NgModule } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SharedModule } from '../shared.module';
import { TarjetaExpandibleComponent } from './tarjeta-expandible.component';

@Component({
  standalone: false,
  template: `
    <app-tarjeta-expandible etiqueta="Detalle de prueba" (cambio)="cambios.push($event)">
      <div resumen><p>Resumen</p><a href="#enlace">Enlace</a></div>
      <h2 cabecera>Título</h2>
      <button acciones type="button">Acción</button>
      <p expandido>Contenido</p>
    </app-tarjeta-expandible>
  `,
})
class AnfitrionComponent {
  cambios: boolean[] = [];
}

@NgModule({ imports: [SharedModule], declarations: [AnfitrionComponent] })
class ModuloPruebaModule {}

const esperar = (): Promise<void> => new Promise((resolver) => setTimeout(resolver, 0));

describe('TarjetaExpandibleComponent', () => {
  let fixture: ComponentFixture<AnfitrionComponent>;
  let tarjeta: TarjetaExpandibleComponent;
  let raiz: HTMLElement;
  let animar: ReturnType<typeof vi.fn>;

  const capa = (): HTMLElement | null => document.body.querySelector('.tarjeta-expandible__capa');
  const panel = (): HTMLElement => document.body.querySelector('.tarjeta-expandible__panel')!;
  const compacta = (): HTMLElement => raiz.querySelector('.tarjeta-expandible__compacta')!;
  const botonAbrir = (): HTMLButtonElement => raiz.querySelector('.tarjeta-expandible__abrir')!;
  const tecla = (key: string, extra: KeyboardEventInit = {}): KeyboardEvent => {
    const evento = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra });
    document.dispatchEvent(evento);
    return evento;
  };

  async function abrir(): Promise<void> {
    botonAbrir().click();
    fixture.detectChanges();
    await esperar();
  }

  async function cerrar(): Promise<void> {
    document.body.querySelector<HTMLButtonElement>('.tarjeta-expandible__cerrar')!.click();
    await esperar();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    animar = vi.fn().mockImplementation(() => ({ finished: Promise.resolve(), cancel: vi.fn() }));
    await TestBed.configureTestingModule({ imports: [ModuloPruebaModule] }).compileComponents();
    fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
    raiz = fixture.nativeElement;
    tarjeta = fixture.debugElement.children[0].componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
    delete (Element.prototype as { animate?: unknown }).animate;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('cerrada solo muestra el resumen y un botón que anuncia el diálogo', () => {
    expect(raiz.textContent).toContain('Resumen');
    expect(raiz.textContent).not.toContain('Contenido');
    expect(capa()).toBeNull();
    expect(botonAbrir().getAttribute('aria-haspopup')).toBe('dialog');
    expect(botonAbrir().getAttribute('aria-expanded')).toBe('false');
    expect(botonAbrir().textContent).toContain('Detalle de prueba');
  });

  it('al pulsar la tarjeta abre un diálogo modal en el body con el contenido proyectado', async () => {
    compacta().click();
    fixture.detectChanges();
    await esperar();

    expect(capa()?.parentElement).toBe(document.body);
    expect(panel().getAttribute('role')).toBe('dialog');
    expect(panel().getAttribute('aria-modal')).toBe('true');
    expect(panel().getAttribute('aria-label')).toBe('Detalle de prueba');
    expect(panel().textContent).toContain('Título');
    expect(panel().textContent).toContain('Acción');
    expect(panel().textContent).toContain('Contenido');
    expect(document.body.style.overflow).toBe('hidden');
    expect(compacta().style.visibility).toBe('hidden');
    expect(document.activeElement).toBe(panel());
    expect(fixture.componentInstance.cambios).toEqual([true]);
    expect(tarjeta.abierta).toBe(true);
  });

  it('no se abre al pulsar un enlace del resumen', () => {
    raiz.querySelector<HTMLAnchorElement>('a')!.click();
    fixture.detectChanges();
    expect(capa()).toBeNull();
  });

  it('abrirla dos veces no duplica el diálogo', async () => {
    await abrir();
    tarjeta.abrir();
    fixture.detectChanges();
    expect(document.body.querySelectorAll('.tarjeta-expandible__capa')).toHaveLength(1);
    expect(fixture.componentInstance.cambios).toEqual([true]);
  });

  it('Escape cierra, devuelve el foco al botón y libera el scroll', async () => {
    await abrir();
    tecla('Escape');
    await esperar();
    fixture.detectChanges();

    expect(capa()).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(compacta().style.visibility).toBe('');
    expect(document.activeElement).toBe(botonAbrir());
    expect(fixture.componentInstance.cambios).toEqual([true, false]);
    expect(tarjeta.abierta).toBe(false);
  });

  it('el botón de cerrar y el clic fuera cierran, pero el clic dentro no', async () => {
    await abrir();
    panel().dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(capa()).not.toBeNull();

    await cerrar();
    expect(capa()).toBeNull();

    await abrir();
    document.body.querySelector('.tarjeta-expandible__fondo')!.dispatchEvent(new Event('pointerdown'));
    await esperar();
    fixture.detectChanges();
    expect(capa()).toBeNull();
  });

  it('cerrar sin estar abierta o ya cerrándose no hace nada', async () => {
    tarjeta.cerrar();
    expect(fixture.componentInstance.cambios).toEqual([]);

    await abrir();
    tarjeta.cerrar();
    tarjeta.cerrar();
    await esperar();
    fixture.detectChanges();
    expect(fixture.componentInstance.cambios).toEqual([true, false]);
  });

  it('mantiene el foco dentro del diálogo con Tab y Shift+Tab', async () => {
    await abrir();
    const cerrarBoton = document.body.querySelector<HTMLButtonElement>('.tarjeta-expandible__cerrar')!;
    const accion = panel().querySelector<HTMLButtonElement>('button')!;

    accion.focus();
    expect(tecla('Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(cerrarBoton);

    expect(tecla('Tab', { shiftKey: true }).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(accion);

    panel().focus();
    expect(tecla('Tab', { shiftKey: true }).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(accion);

    cerrarBoton.focus();
    expect(tecla('Tab').defaultPrevented).toBe(false);

    (document.activeElement as HTMLElement).blur();
    botonAbrir().focus();
    expect(tecla('Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(cerrarBoton);
  });

  it('si no hay nada enfocable deja el foco en el panel', async () => {
    await abrir();
    document.body.querySelector<HTMLElement>('.tarjeta-expandible__cerrar')!.style.display = 'none';
    panel().querySelector<HTMLElement>('button')!.style.display = 'none';

    expect(tecla('Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(panel());
  });

  it('ignora otras teclas', async () => {
    await abrir();
    tecla('a');
    expect(capa()).not.toBeNull();
  });

  it('anima el rectángulo del panel (nunca transform) desde la tarjeta y de vuelta con las mismas curvas', async () => {
    (Element.prototype as { animate?: unknown }).animate = animar;
    compacta().getBoundingClientRect = () => new DOMRect(10, 20, 700, 80);
    await abrir();

    const apertura = animar.mock.calls.find(([marcos]) => marcos[0]?.width === '700px');
    expect(apertura).toBeDefined();
    expect(apertura![1]).toMatchObject({ duration: 450, easing: 'cubic-bezier(0.4, 0, 0.1, 1)', fill: 'none' });
    expect(apertura![0][0]).toMatchObject({ left: '10px', top: '20px', width: '700px', height: '80px' });
    expect(apertura![0][1]).toMatchObject({ left: '0px', top: '0px' });
    for (const marco of apertura![0]) expect(marco).not.toHaveProperty('transform');
    expect(animar.mock.calls.some(([marcos, op]) => marcos[0].opacity === 0 && op.duration === 300)).toBe(true);

    animar.mockClear();
    await cerrar();
    const cierre = animar.mock.calls.find(([marcos]) => marcos[1]?.width === '700px');
    expect(cierre![1]).toMatchObject({ duration: 450, fill: 'forwards' });
    expect(animar.mock.calls.some(([, op]) => op.duration === 50)).toBe(true);
    expect(animar.mock.calls.some(([, op]) => op.duration === 200)).toBe(true);
    expect(capa()).toBeNull();
  });

  it('mientras anima suelta max-width y max-height del panel y al abrir devuelve el control al CSS', async () => {
    let terminar!: () => void;
    (Element.prototype as { animate?: unknown }).animate = vi.fn().mockImplementation((marcos: { width?: string }[]) => ({
      finished: marcos[0]?.width ? new Promise<void>((resolver) => (terminar = resolver)) : Promise.resolve(),
      cancel: vi.fn(),
    }));
    botonAbrir().click();
    fixture.detectChanges();

    expect(panel().style.position).toBe('fixed');
    expect(panel().style.maxWidth).toBe('none');
    expect(panel().style.maxHeight).toBe('none');
    expect(panel().style.transition).toBe('none');

    terminar();
    await esperar();
    expect(panel().style.position).toBe('');
    expect(panel().style.maxWidth).toBe('');
    expect(panel().style.width).toBe('');
  });

  it('el destino del cierre se mide al cerrar, no al abrir', async () => {
    (Element.prototype as { animate?: unknown }).animate = animar;
    compacta().getBoundingClientRect = () => new DOMRect(10, 20, 300, 80);
    await abrir();

    compacta().getBoundingClientRect = () => new DOMRect(40, 90, 310, 85);
    animar.mockClear();
    await cerrar();

    const cierre = animar.mock.calls.find(([marcos]) => marcos[1]?.width === '310px');
    expect(cierre![0][1]).toMatchObject({ left: '40px', top: '90px', height: '85px' });
  });

  it('cerrar mientras se abre cancela la animación anterior y no deja que limpie la nueva', async () => {
    const cancelar = vi.fn();
    let terminarApertura!: () => void;
    let llamadas = 0;
    (Element.prototype as { animate?: unknown }).animate = vi.fn().mockImplementation((marcos: { width?: string }[]) => {
      const esPanel = !!marcos[0]?.width;
      const primera = esPanel && ++llamadas === 1;
      return {
        finished: primera ? new Promise<void>((resolver) => (terminarApertura = resolver)) : Promise.resolve(),
        cancel: cancelar,
      };
    });
    botonAbrir().click();
    fixture.detectChanges();

    tarjeta.cerrar();
    expect(cancelar).toHaveBeenCalled();
    expect(panel().style.position).toBe('fixed');

    terminarApertura();
    await esperar();
    fixture.detectChanges();
    expect(capa()).toBeNull();
  });

  it('al bloquear el scroll conserva el hueco de la barra con scrollbar-gutter y lo restaura', async () => {
    vi.stubGlobal('CSS', { supports: () => true });
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 1009, configurable: true });
    vi.stubGlobal('innerWidth', 1024);
    await abrir();

    expect(document.documentElement.style.scrollbarGutter).toBe('stable');
    expect(document.body.style.overflow).toBe('hidden');

    await cerrar();
    expect(document.documentElement.style.scrollbarGutter).toBe('');
    expect(document.body.style.overflow).toBe('');
    delete (document.documentElement as { clientWidth?: number }).clientWidth;
  });

  it('sin scrollbar-gutter compensa el ancho de la barra con un relleno', async () => {
    vi.stubGlobal('CSS', { supports: () => false });
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 1009, configurable: true });
    vi.stubGlobal('innerWidth', 1024);
    await abrir();

    expect(document.body.style.paddingRight).toBe('15px');
    expect(document.documentElement.style.scrollbarGutter).toBeFalsy();

    await cerrar();
    expect(document.body.style.paddingRight).toBe('');
    delete (document.documentElement as { clientWidth?: number }).clientWidth;
  });

  it('sin barra de desplazamiento no añade nada', async () => {
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 1024, configurable: true });
    vi.stubGlobal('innerWidth', 1024);
    await abrir();

    expect(document.body.style.paddingRight).toBe('');
    expect(document.documentElement.style.scrollbarGutter).toBeFalsy();
    delete (document.documentElement as { clientWidth?: number }).clientWidth;
  });

  it('con prefers-reduced-motion no anima', async () => {
    (Element.prototype as { animate?: unknown }).animate = animar;
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    await abrir();
    await cerrar();
    expect(animar).not.toHaveBeenCalled();
    expect(capa()).toBeNull();
  });

  it('si la animación se cancela igualmente termina de cerrar', async () => {
    (Element.prototype as { animate?: unknown }).animate = vi.fn().mockImplementation((marcos: { width?: string }[]) => ({
      finished: marcos[0]?.width ? Promise.reject(new Error('cancelada')) : Promise.resolve(),
      cancel: vi.fn(),
    }));
    await abrir();
    await cerrar();
    expect(capa()).toBeNull();
  });

  it('al destruirse abierta quita el diálogo del body y libera el scroll', async () => {
    await abrir();
    fixture.destroy();

    expect(capa()).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('al destruirse cerrada no toca el body', () => {
    document.body.style.overflow = 'scroll';
    fixture.destroy();
    expect(document.body.style.overflow).toBe('scroll');
    document.body.style.overflow = '';
  });
});
