import { Component, NgModule, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SharedModule } from '../shared.module';
import { SpotlightDirective } from './spotlight.directive';
import { SpotlightService } from './spotlight.service';

@Component({
  standalone: false,
  template: `
    <div
      appSpotlight
      [intensity]="intensidad()"
      [ambient]="ambiente"
      [shape]="forma"
      [proximity]="proximidad"
      [grain]="grano"
      [smoothing]="suavizado"
      [flare]="destello"
    >
      <button type="button">Acción</button>
    </div>
  `,
})
class AnfitrionComponent {
  intensidad = signal(0.15);
  ambiente = false;
  forma: 'circle' | 'beam' = 'circle';
  proximidad = 80;
  grano = 0;
  suavizado = 0.3;
  destello = true;
}

@NgModule({ imports: [SharedModule], declarations: [AnfitrionComponent] })
class ModuloPruebaModule {}

describe('SpotlightDirective', () => {
  let fixture: ComponentFixture<AnfitrionComponent>;
  let directiva: SpotlightDirective;
  let servicio: SpotlightService;
  let host: HTMLElement;
  let tiempo: number;

  const hijo = (clase: string): HTMLElement => host.querySelector<HTMLElement>(`.spotlight-card__${clase}`)!;
  const opacidad = (clase: string): number => Number(hijo(clase).style.opacity);
  const puntero = (x: number, y: number, activo = true): void => {
    servicio.puntero.x = x;
    servicio.puntero.y = y;
    servicio.puntero.activo = activo;
  };
  /** Avanza `n` cuadros de 16 ms y devuelve lo último que respondió la directiva. */
  const correr = (n: number): boolean => {
    let sigue = true;
    for (let i = 0; i < n; i++) {
      tiempo += 16;
      sigue = directiva.avanzar(tiempo, servicio.puntero);
    }
    return sigue;
  };

  async function crear(ajustes: Partial<Omit<AnfitrionComponent, 'intensidad'>> = {}): Promise<void> {
    await TestBed.configureTestingModule({ imports: [ModuloPruebaModule] }).compileComponents();
    fixture = TestBed.createComponent(AnfitrionComponent);
    Object.assign(fixture.componentInstance, ajustes);
    fixture.detectChanges();
    host = fixture.debugElement.query(By.directive(SpotlightDirective)).nativeElement;
    directiva = fixture.debugElement.query(By.directive(SpotlightDirective)).injector.get(SpotlightDirective);
    servicio = TestBed.inject(SpotlightService);
    // Tarjeta de 200 × 100 en la esquina de la ventana.
    host.getBoundingClientRect = () => new DOMRect(0, 0, 200, 100);
  }

  beforeEach(() => {
    tiempo = 1_000_000;
    vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('añade los cuatro elementos del original sin tocar el contenido', async () => {
    await crear();
    const clases = Array.from(host.children).map((el) => el.className);

    expect(host.classList.contains('spotlight-card')).toBe(true);
    expect(clases).toEqual([
      'spotlight-card__light',
      'spotlight-card__grain',
      expect.any(String),
      'spotlight-card__border',
      'spotlight-card__edge',
    ]);
    expect(host.querySelector('button')?.textContent).toBe('Acción');
    expect(hijo('light').getAttribute('aria-hidden')).toBe('true');
    expect(hijo('grain').style.backgroundImage).toContain('data:image/svg+xml');
    expect(host.style.getPropertyValue('--spotlight-card-border')).toContain('255');
  });

  it('se registra en el servicio y se da de baja al destruirse, quitando sus elementos', async () => {
    await crear();
    const baja = vi.spyOn(servicio, 'desregistrar');
    fixture.destroy();

    expect(baja).toHaveBeenCalledWith(directiva);
    expect(host.querySelector('.spotlight-card__light')).toBeNull();
    expect(host.querySelector('.spotlight-card__edge')).toBeNull();
  });

  it('sin navegador no crea nada', async () => {
    vi.spyOn(SpotlightService.prototype, 'hayNavegador', 'get').mockReturnValue(false);
    await crear();
    expect(host.children).toHaveLength(1);
  });

  it('la luz aparece cuando el puntero está sobre la tarjeta y se apaga al irse', async () => {
    await crear();
    puntero(100, 50);
    correr(5);
    expect(opacidad('light')).toBeGreaterThan(0);
    correr(60);
    expect(opacidad('light')).toBeCloseTo(0.15, 1);
    expect(opacidad('edge')).toBeCloseTo(0.6, 1);

    puntero(0, 0, false);
    expect(correr(200)).toBe(false);
    expect(opacidad('light')).toBe(0);
  });

  it('la luz alcanza la tarjeta desde fuera según la proximidad', async () => {
    await crear();
    puntero(240, 50); // a 40 px del borde derecho: (1 - 40/80)² = 0.25
    correr(200);
    expect(opacidad('light')).toBeCloseTo(0.15 * 0.25, 2);

    puntero(300, 50); // fuera del alcance
    correr(200);
    expect(opacidad('light')).toBe(0);
  });

  it('con proximidad 0 solo se enciende con el puntero encima', async () => {
    await crear({ proximidad: 0 });
    puntero(240, 50);
    correr(100);
    expect(opacidad('light')).toBe(0);
    puntero(100, 50);
    correr(100);
    expect(opacidad('light')).toBeGreaterThan(0.1);
  });

  it('con smoothing 0 la luz pega al puntero', async () => {
    await crear({ suavizado: 0 });
    puntero(100, 50);
    correr(100);
    puntero(150, 20);
    correr(1);
    expect(opacidad('light')).toBeCloseTo(0.15, 1);
  });

  it('el haz cae desde el borde superior', async () => {
    await crear({ forma: 'beam' });
    puntero(100, 50);
    correr(5);
    expect(hijo('light').style.opacity).not.toBe('0');
  });

  it('presionar la tarjeta aviva la luz (flare) y soltar la relaja', async () => {
    await crear();
    puntero(100, 50);
    correr(60);
    const reposo = opacidad('light');

    host.dispatchEvent(Object.assign(new Event('pointerdown'), { clientX: 100, clientY: 50 }));
    correr(30);
    expect(opacidad('light')).toBeGreaterThan(reposo);

    expect(directiva.alSoltar('mouse')).toBe(true);
    correr(120);
    expect(opacidad('light')).toBeCloseTo(reposo, 2);
  });

  it('sin flare presionar no cambia la luz', async () => {
    await crear({ destello: false });
    puntero(100, 50);
    correr(60);
    const reposo = opacidad('light');
    host.dispatchEvent(Object.assign(new Event('pointerdown'), { clientX: 100, clientY: 50 }));
    correr(30);
    expect(opacidad('light')).toBeCloseTo(reposo, 3);
  });

  it('soltar sin haber presionado solo despierta con toques', async () => {
    await crear();
    expect(directiva.alSoltar('mouse')).toBe(false);
    expect(directiva.alSoltar('touch')).toBe(true);
  });

  it('el grano acompaña a la luz con su máscara', async () => {
    await crear({ grano: 0.5 });
    puntero(100, 50);
    correr(60);
    expect(opacidad('grain')).toBeCloseTo(0.5, 1);
    expect(hijo('grain').getAttribute('style')).toContain('mask');
  });

  it('con ambient la luz deriva sola y nunca se queda quieta', async () => {
    await crear({ ambiente: true });
    puntero(0, 0, false);
    expect(correr(120)).toBe(true);
    expect(opacidad('light')).toBeCloseTo(0.15 * 0.6, 1);
  });

  it('en pantallas táctiles activa el ambiente sin pedirlo', async () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('hover: none') }));
    await crear();
    puntero(0, 0, false);
    expect(correr(120)).toBe(true);
    expect(opacidad('light')).toBeGreaterThan(0.05);
  });

  it('con prefers-reduced-motion la luz no se anima y el ambiente se queda quieto', async () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('reduced-motion') }));
    await crear({ ambiente: true });
    puntero(0, 0, false);
    expect(correr(20)).toBe(false);
    expect(opacidad('light')).toBeCloseTo(0.15 * 0.6, 3);
  });

  it('sin ambiente una tarjeta fuera del alcance queda en reposo', async () => {
    await crear();
    puntero(0, 0, false);
    expect(correr(2)).toBe(false);
  });

  it('el foco de teclado enciende la luz sobre el elemento enfocado', async () => {
    await crear();
    const boton = host.querySelector('button')!;
    boton.getBoundingClientRect = () => new DOMRect(150, 40, 20, 20);
    const coincide = vi.spyOn(Element.prototype, 'matches').mockReturnValue(true);

    boton.dispatchEvent(new Event('focusin', { bubbles: true }));
    puntero(0, 0, false);
    correr(100);
    expect(opacidad('light')).toBeCloseTo(0.15, 1);

    boton.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: host }));
    correr(100);
    expect(opacidad('light')).toBeCloseTo(0.15, 1);

    boton.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    correr(200);
    expect(opacidad('light')).toBe(0);
    coincide.mockRestore();
  });

  it('ignora el foco que no es de teclado', async () => {
    await crear();
    vi.spyOn(Element.prototype, 'matches').mockReturnValue(false);
    host.querySelector('button')!.dispatchEvent(new Event('focusin', { bubbles: true }));
    puntero(0, 0, false);
    expect(correr(2)).toBe(false);
    expect(opacidad('light')).toBe(0);
  });

  it('decide cuándo despertar según el puntero, la proximidad y el desplazamiento', async () => {
    await crear({ proximidad: 0 });
    expect(directiva.alMover(document.body)).toBe(false);
    expect(directiva.alMover(host.querySelector('button'))).toBe(true);
    expect(directiva.alSalir()).toBe(false);
    expect(directiva.alDesplazar({ x: 0, y: 0, activo: false })).toBe(false);
    expect(directiva.alDesplazar({ x: 0, y: 0, activo: true })).toBe(true);

    puntero(100, 50);
    correr(30);
    expect(directiva.alMover(document.body)).toBe(true);
    expect(directiva.alSalir()).toBe(true);
    expect(directiva.alDesplazar({ x: 0, y: 0, activo: false })).toBe(true);
  });

  it('con proximidad cualquier movimiento puede encenderla', async () => {
    await crear();
    expect(directiva.alMover(document.body)).toBe(true);
  });

  it('recalcula los ajustes cuando cambian las entradas', async () => {
    await crear();
    puntero(100, 50);
    correr(60);
    fixture.componentInstance.intensidad.set(0.5);
    fixture.detectChanges();
    correr(5);
    expect(opacidad('light')).toBeGreaterThan(0.4);
  });
});
