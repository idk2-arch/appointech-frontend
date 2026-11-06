import { Component, NgModule, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SharedModule } from '../shared.module';
import { SpotlightService } from '../spotlight/spotlight.service';

@Component({
  standalone: false,
  template: `
    <app-magic-bento
      [columns]="columnas()"
      [rowHeight]="180"
      [gap]="10"
      [radius]="16"
      [spotlightRadius]="250"
      [disableAnimations]="sinAnimacion()"
      [clickEffect]="onda()"
      [enableSpotlight]="luz()"
      [enableBorderGlow]="borde()"
    >
      <app-magic-bento-card [colSpan]="2" [rowSpan]="2" enlace="/admin/citas" etiqueta="Ir a las citas"><p>Citas</p></app-magic-bento-card>
      <app-magic-bento-card><p>Estática</p></app-magic-bento-card>
      <app-magic-bento-card [luz]="false" [colSpan]="0" [rowSpan]="-3"><p>Esqueleto</p></app-magic-bento-card>
    </app-magic-bento>
  `,
})
class AnfitrionComponent {
  columnas = signal(4);
  sinAnimacion = signal(false);
  onda = signal(true);
  luz = signal(true);
  borde = signal(true);
}

@NgModule({ imports: [SharedModule], declarations: [AnfitrionComponent] })
class ModuloPruebaModule {}

describe('MagicBentoComponent', () => {
  let fixture: ComponentFixture<AnfitrionComponent>;

  const raiz = (): HTMLElement => fixture.nativeElement;
  const rejilla = (): HTMLElement => raiz().querySelector('.magic-bento')!;
  const tarjetas = (): HTMLElement[] => Array.from(raiz().querySelectorAll('app-magic-bento-card'));
  const superficie = (indice: number): HTMLElement => tarjetas()[indice].querySelector('.magic-bento-card__superficie')!;

  async function crear(): Promise<void> {
    await TestBed.configureTestingModule({ imports: [ModuloPruebaModule], providers: [provideRouter([{ path: '**', children: [] }])] }).compileComponents();
    fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.resetTestingModule());
  afterEach(() => vi.unstubAllGlobals());

  describe('cuadrícula', () => {
    beforeEach(() => crear());

    it('lleva las columnas, la altura de fila, el hueco y el radio como variables CSS', () => {
      const estilo = rejilla().style;
      expect(estilo.getPropertyValue('--mb-columnas')).toBe('4');
      expect(estilo.getPropertyValue('--mb-fila-alto')).toBe('180px');
      expect(estilo.getPropertyValue('--mb-hueco')).toBe('10px');
      expect(estilo.getPropertyValue('--mb-radio')).toBe('16px');
    });

    it('cada tarjeta lleva sus columnas y filas, y nunca menos de una', () => {
      expect(tarjetas().map((t) => [t.style.getPropertyValue('--mb-col-span'), t.style.getPropertyValue('--mb-row-span')])).toEqual([
        ['2', '2'],
        ['1', '1'],
        ['1', '1'],
      ]);
      expect(tarjetas().map((t) => t.getAttribute('data-col'))).toEqual(['2', '1', '1']);
    });

    it('proyecta el contenido de cada tarjeta', () => {
      expect(tarjetas().map((t) => t.textContent?.trim())).toEqual(['Citas', 'Estática', 'Esqueleto']);
    });

    it('cambiar las columnas cambia la variable', () => {
      fixture.componentInstance.columnas.set(3);
      fixture.detectChanges();
      expect(rejilla().style.getPropertyValue('--mb-columnas')).toBe('3');
    });
  });

  describe('tarjetas', () => {
    beforeEach(() => crear());

    it('con enlace es un <a> real con su ruta y su nombre accesible', () => {
      const enlace = superficie(0);
      expect(enlace.tagName).toBe('A');
      expect(enlace.getAttribute('href')).toBe('/admin/citas');
      expect(enlace.getAttribute('aria-label')).toBe('Ir a las citas');
    });

    it('sin enlace es un bloque estático que no recibe foco', () => {
      const estatica = superficie(1);
      expect(estatica.tagName).toBe('DIV');
      expect(estatica.hasAttribute('tabindex')).toBe(false);
      expect(estatica.hasAttribute('href')).toBe(false);
    });

    it('lo único que se puede enfocar en la cuadrícula es el enlace', () => {
      const enfocables = Array.from(raiz().querySelectorAll('a[href], button, [tabindex]'));
      expect(enfocables).toEqual([superficie(0)]);
    });

    it('cada superficie tiene los cuatro elementos de luz del spotlight, ocultos a los lectores de pantalla', () => {
      for (const i of [0, 1, 2]) {
        for (const clase of ['light', 'grain', 'border', 'edge']) {
          const elemento = superficie(i).querySelector(`.spotlight-card__${clase}`);
          expect(elemento?.getAttribute('aria-hidden')).toBe('true');
        }
      }
    });

    it('las superficies usan la directiva de spotlight que ya existe en la app', () => {
      for (const i of [0, 1, 2]) expect(superficie(i).classList.contains('spotlight-card')).toBe(true);
    });
  });

  describe('onda de luz al hacer clic', () => {
    beforeEach(() => crear());

    const ondas = (indice: number): HTMLElement[] => Array.from(tarjetas()[indice].querySelectorAll('.magic-bento-card__onda'));

    it('un clic en una tarjeta interactiva crea una onda en el punto pulsado y se quita al terminar', () => {
      const enlace = superficie(0);
      enlace.getBoundingClientRect = () => new DOMRect(100, 50, 300, 200);
      enlace.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 160, clientY: 90, detail: 1 }));
      fixture.detectChanges();

      expect(ondas(0)).toHaveLength(1);
      expect(ondas(0)[0].style.left).toBe('60px');
      expect(ondas(0)[0].style.top).toBe('40px');
      expect(ondas(0)[0].getAttribute('aria-hidden')).toBe('true');

      ondas(0)[0].dispatchEvent(new Event('animationend'));
      fixture.detectChanges();
      expect(ondas(0)).toHaveLength(0);
    });

    it('activada con el teclado nace en el centro de la tarjeta', () => {
      const enlace = superficie(0);
      enlace.getBoundingClientRect = () => new DOMRect(0, 0, 300, 200);
      enlace.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
      fixture.detectChanges();
      expect([ondas(0)[0].style.left, ondas(0)[0].style.top]).toEqual(['150px', '100px']);
    });

    it('varios clics seguidos crean varias ondas, cada una con su vida', () => {
      const enlace = superficie(0);
      enlace.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
      enlace.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
      fixture.detectChanges();
      expect(ondas(0)).toHaveLength(2);

      ondas(0)[0].dispatchEvent(new Event('animationend'));
      fixture.detectChanges();
      expect(ondas(0)).toHaveLength(1);
    });

    it('las tarjetas estáticas no tienen onda', () => {
      expect(tarjetas()[1].querySelector('.magic-bento-card__onda')).toBeNull();
    });

    it('con clickEffect apagado no hay onda', () => {
      fixture.componentInstance.onda.set(false);
      fixture.detectChanges();
      superficie(0).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
      fixture.detectChanges();
      expect(ondas(0)).toHaveLength(0);
    });
  });

  describe('animaciones y menos movimiento', () => {
    it('disableAnimations lo marca en la cuadrícula y apaga ondas y luces', async () => {
      await crear();
      fixture.componentInstance.sinAnimacion.set(true);
      fixture.detectChanges();

      expect(rejilla().hasAttribute('data-sin-animacion')).toBe(true);
      superficie(0).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
      fixture.detectChanges();
      expect(raiz().querySelectorAll('.magic-bento-card__onda')).toHaveLength(0);
    });

    it('por defecto la cuadrícula anima su entrada', async () => {
      await crear();
      expect(rejilla().hasAttribute('data-sin-animacion')).toBe(false);
    });

    it('con prefers-reduced-motion no hay ondas', async () => {
      vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('reduced-motion') }));
      await crear();

      superficie(0).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
      fixture.detectChanges();
      expect(raiz().querySelectorAll('.magic-bento-card__onda')).toHaveLength(0);
    });

    it('apagar la luz o el borde del contenedor no rompe nada', async () => {
      await crear();
      fixture.componentInstance.luz.set(false);
      fixture.componentInstance.borde.set(false);
      fixture.detectChanges();
      expect(tarjetas()).toHaveLength(3);
    });
  });

  describe('limpieza', () => {
    it('al destruirse da de baja cada tarjeta del servicio de spotlight y quita sus elementos de luz', async () => {
      await crear();
      const baja = vi.spyOn(TestBed.inject(SpotlightService), 'desregistrar');
      const luces = Array.from(raiz().querySelectorAll('.spotlight-card__light'));
      expect(luces).toHaveLength(3);

      fixture.destroy();

      expect(baja).toHaveBeenCalledTimes(3);
      expect(luces.every((luz) => !luz.isConnected)).toBe(true);
    });
  });
});
