import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { By } from '@angular/platform-browser';
import { Observable, of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FotoElectrodomestico } from '../../core/models/cita';
import { FotoCitaService } from '../../core/services/foto-cita.service';
import { CardSwapComponent } from '../card-swap/card-swap.component';
import { SharedModule } from '../shared.module';
import { FotosElectrodomesticoComponent } from './fotos-electrodomestico.component';

const FOTOS: FotoElectrodomestico[] = [
  { id: 1, url: '/api/citas/9/fotos/1' },
  { id: 2, url: '/api/citas/9/fotos/2' },
];

describe('FotosElectrodomesticoComponent', () => {
  let fixture: ComponentFixture<FotosElectrodomesticoComponent>;
  let urlSegura: ReturnType<typeof vi.fn>;
  let liberar: ReturnType<typeof vi.fn>;
  let respuestas: Record<string, Observable<string>>;

  const raiz = (): HTMLElement => fixture.nativeElement;
  const pila = (): CardSwapComponent | undefined => fixture.debugElement.query(By.directive(CardSwapComponent))?.componentInstance;
  const dialogo = (): HTMLElement | null => raiz().querySelector('[role="dialog"]');
  const miniaturas = (): HTMLElement[] => Array.from(raiz().querySelectorAll('ul[aria-label="Fotos guardadas"] li'));

  async function crear(fotos: FotoElectrodomestico[] | null = FOTOS, entradas: Record<string, unknown> = {}): Promise<void> {
    // El servicio se provee a nivel del componente: se espían los métodos del prototipo.
    urlSegura = vi.spyOn(FotoCitaService.prototype, 'urlSegura').mockImplementation((ruta: string) => respuestas[ruta] ?? of(`blob:${ruta}`));
    liberar = vi.spyOn(FotoCitaService.prototype, 'liberar').mockImplementation(() => undefined);
    await TestBed.configureTestingModule({ imports: [SharedModule], providers: [provideHttpClient()] }).compileComponents();
    fixture = TestBed.createComponent(FotosElectrodomesticoComponent);
    fixture.componentRef.setInput('fotos', fotos);
    for (const [clave, valor] of Object.entries(entradas)) fixture.componentRef.setInput(clave, valor);
    fixture.detectChanges();
  }

  /** Cambia las fotos de entrada y espera al siguiente ciclo. */
  function cambiarFotos(fotos: FotoElectrodomestico[]): void {
    fixture.componentRef.setInput('fotos', fotos);
    fixture.detectChanges();
  }

  beforeEach(() => (respuestas = {}));

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
  });

  it('sin fotos no muestra nada', async () => {
    await crear([]);
    expect(raiz().querySelector('app-card-swap')).toBeNull();
    expect(raiz().textContent?.trim()).toBe('');
  });

  it('con fotos nulas tampoco muestra nada', async () => {
    await crear(null);
    expect(raiz().querySelector('app-card-swap')).toBeNull();
  });

  it('descarga cada foto con el servicio seguro y arma una carta por foto', async () => {
    await crear();

    expect(urlSegura).toHaveBeenCalledWith('/api/citas/9/fotos/1');
    expect(urlSegura).toHaveBeenCalledWith('/api/citas/9/fotos/2');
    expect(pila()?.items).toEqual([
      { title: 'Foto 1', imageUrl: 'blob:/api/citas/9/fotos/1', alt: 'Foto 1 del electrodoméstico' },
      { title: 'Foto 2', imageUrl: 'blob:/api/citas/9/fotos/2', alt: 'Foto 2 del electrodoméstico' },
    ]);
    expect(raiz().querySelectorAll('.card-swap-slot')).toHaveLength(2);
  });

  it('usa los ajustes pedidos para la pila', async () => {
    await crear();
    const p = pila()!;
    expect(p.delay).toBe(4000);
    expect(p.cardDistance).toBe(60);
    expect(p.verticalDistance).toBe(70);
    expect(p.depth).toBe(90);
    expect(p.skewAmount).toBe(6);
    expect(p.visibleCards).toBe(4);
    expect(p.cardRadius).toBe(18);
    expect(p.speed).toBe(1);
    expect(p.bounce).toBe(0.35);
    expect(p.parallax).toBe(0.5);
    expect(p.hoverSpread).toBe(0.12);
    expect(p.dim).toBe(0.5);
    expect([p.autoplay, p.pauseOnHover, p.draggable]).toEqual([true, true, true]);
  });

  it('con una sola foto muestra una carta', async () => {
    await crear([FOTOS[0]]);
    expect(raiz().querySelectorAll('.card-swap-slot')).toHaveLength(1);
  });

  it('mientras descarga muestra el estado de carga y arma la pila cuando terminan todas', async () => {
    const primera = new Subject<string>();
    respuestas['/api/citas/9/fotos/1'] = primera;
    await crear();

    expect(raiz().querySelector('[role="status"]')?.textContent).toContain('Cargando fotos');
    expect(pila()).toBeUndefined();

    primera.next('blob:uno');
    primera.complete();
    fixture.detectChanges();

    expect(raiz().querySelector('[role="status"]')).toBeNull();
    expect(pila()?.items).toHaveLength(2);
  });

  it('si una foto falla, muestra las otras y avisa con opción de reintentar', async () => {
    await crear([]);
    respuestas['/api/citas/9/fotos/2'] = throwError(() => new Error('404'));
    cambiarFotos(FOTOS);

    expect(pila()?.items).toHaveLength(1);
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('No pudimos cargar una foto.');

    delete respuestas['/api/citas/9/fotos/2'];
    (raiz().querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(pila()?.items).toHaveLength(2);
    expect(raiz().querySelector('[role="alert"]')).toBeNull();
  });

  it('si todas fallan no hay pila, solo el aviso', async () => {
    await crear([]);
    FOTOS.forEach((f) => (respuestas[f.url] = throwError(() => new Error('x'))));
    cambiarFotos(FOTOS);

    expect(pila()).toBeUndefined();
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('No pudimos cargar 2 fotos.');
  });

  describe('foto en grande', () => {
    it('tocar la carta del frente la abre en un diálogo con la imagen y el foco en "Cerrar"', async () => {
      await crear();

      (raiz().querySelectorAll('.card-swap-slot')[0] as HTMLElement).click();
      fixture.detectChanges();

      expect(dialogo()).not.toBeNull();
      expect(dialogo()?.getAttribute('aria-modal')).toBe('true');
      expect(dialogo()?.querySelector('img')?.getAttribute('src')).toBe('blob:/api/citas/9/fotos/1');
      expect(document.activeElement?.getAttribute('aria-label')).toBe('Cerrar foto');
    });

    it('tocar una carta de atrás no abre el diálogo', async () => {
      await crear();
      (raiz().querySelectorAll('.card-swap-slot')[1] as HTMLElement).click();
      fixture.detectChanges();
      expect(dialogo()).toBeNull();
    });

    it('abre la foto que quedó al frente tras cambiar de carta', async () => {
      await crear();
      pila()!.next();
      fixture.detectChanges();

      (raiz().querySelectorAll('.card-swap-slot')[1] as HTMLElement).click();
      fixture.detectChanges();

      expect(dialogo()?.querySelector('img')?.getAttribute('src')).toBe('blob:/api/citas/9/fotos/2');
    });

    it('se cierra con el botón, con Escape y al tocar el fondo', async () => {
      await crear();
      const abrir = (): void => {
        (raiz().querySelectorAll('.card-swap-slot')[0] as HTMLElement).click();
        fixture.detectChanges();
      };

      abrir();
      (dialogo()!.querySelector('button') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(dialogo()).toBeNull();

      abrir();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(dialogo()).toBeNull();

      abrir();
      (raiz().querySelector('[role="dialog"] .fixed.inset-0') as HTMLElement).click();
      fixture.detectChanges();
      expect(dialogo()).toBeNull();
    });

    it('Escape sin diálogo abierto no hace nada', async () => {
      await crear();
      expect(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))).not.toThrow();
    });
  });

  describe('modo editable', () => {
    it('muestra miniaturas con botón para quitar cada foto', async () => {
      await crear(FOTOS, { editable: true });
      expect(miniaturas()).toHaveLength(2);

      const quitadas: FotoElectrodomestico[] = [];
      fixture.componentInstance.quitar.subscribe((f) => quitadas.push(f));
      (raiz().querySelector('button[aria-label="Quitar la foto 2"]') as HTMLButtonElement).click();

      expect(quitadas).toEqual([FOTOS[1]]);
    });

    it('sin editable no hay miniaturas', async () => {
      await crear(FOTOS);
      expect(miniaturas()).toHaveLength(0);
    });

    it('mientras está ocupado, los botones quedan deshabilitados', async () => {
      await crear(FOTOS, { editable: true, ocupado: true });
      expect((raiz().querySelector('button[aria-label="Quitar la foto 1"]') as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('memoria', () => {
    it('al quitar una foto libera su URL de objeto y deja las demás', async () => {
      await crear();

      cambiarFotos([FOTOS[0]]);

      expect(liberar).toHaveBeenCalledTimes(1);
      expect(liberar).toHaveBeenCalledWith('/api/citas/9/fotos/2');
      expect(pila()?.items).toHaveLength(1);
    });

    it('no vuelve a descargar las fotos que ya tiene', async () => {
      await crear();
      urlSegura.mockClear();

      cambiarFotos([...FOTOS]);

      expect(urlSegura).not.toHaveBeenCalled();
    });

    it('descarga solo la foto nueva', async () => {
      await crear([FOTOS[0]]);
      urlSegura.mockClear();

      cambiarFotos(FOTOS);

      expect(urlSegura).toHaveBeenCalledTimes(1);
      expect(urlSegura).toHaveBeenCalledWith('/api/citas/9/fotos/2');
    });

    it('al destruirse cancela las descargas pendientes', async () => {
      const pendiente = new Subject<string>();
      respuestas['/api/citas/9/fotos/1'] = pendiente;
      await crear([FOTOS[0]]);
      expect(pendiente.observed).toBe(true);

      fixture.destroy();

      expect(pendiente.observed).toBe(false);
    });

    it('si una foto pendiente deja de estar en la lista, deja de esperarla', async () => {
      const pendiente = new Subject<string>();
      respuestas['/api/citas/9/fotos/1'] = pendiente;
      await crear([FOTOS[0]]);

      cambiarFotos([]);

      expect(pendiente.observed).toBe(false);
    });
  });
});
