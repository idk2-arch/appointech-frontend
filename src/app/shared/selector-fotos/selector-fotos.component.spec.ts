import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProcesadorImagenService } from '../../core/services/procesador-imagen.service';
import { ErrorImagen } from '../../core/utils/imagen';
import { SharedModule } from '../shared.module';
import { SelectorFotosComponent } from './selector-fotos.component';

describe('SelectorFotosComponent', () => {
  let fixture: ComponentFixture<SelectorFotosComponent>;
  let componente: SelectorFotosComponent;
  let procesar: ReturnType<typeof vi.fn>;
  let emitidas: string[][];
  let contador: number;

  const raiz = (): HTMLElement => fixture.nativeElement;
  const miniaturas = (): HTMLImageElement[] => Array.from(raiz().querySelectorAll('app-bounce-cards .bounce-cards__card img'));
  const botonesQuitar = (): HTMLButtonElement[] => Array.from(raiz().querySelectorAll('button[data-quitar]'));
  const botonAgregar = (): HTMLButtonElement =>
    Array.from(raiz().querySelectorAll<HTMLButtonElement>('button')).find((b) => /Agregar|Preparando/.test(b.textContent ?? ''))!;

  async function elegir(...nombres: string[]): Promise<void> {
    const campo = raiz().querySelector<HTMLInputElement>('input[type="file"]')!;
    const archivos = nombres.map((nombre) => new File(['x'], nombre, { type: 'image/png' }));
    Object.defineProperty(campo, 'files', { value: archivos, configurable: true });
    campo.dispatchEvent(new Event('change'));
    await new Promise((resolver) => setTimeout(resolver));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    contador = 0;
    procesar = vi.fn(async () => `data:image/jpeg;base64,FOTO${++contador}`);
    emitidas = [];
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [{ provide: ProcesadorImagenService, useValue: { procesar } }],
    }).compileComponents();
    fixture = TestBed.createComponent(SelectorFotosComponent);
    componente = fixture.componentInstance;
    componente.fotosCambio.subscribe((f) => emitidas.push(f));
    fixture.detectChanges();
  });

  it('empieza vacío, con "0 de 3" y aceptando solo JPEG, PNG y WebP (varios archivos)', () => {
    const campo = raiz().querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(raiz().textContent).toContain('0 de 3');
    expect(campo.accept).toBe('image/jpeg,image/png,image/webp');
    expect(campo.multiple).toBe(true);
    expect(miniaturas()).toHaveLength(0);
  });

  it('agrega las fotos elegidas con su vista previa y avisa de la lista', async () => {
    await elegir('a.png', 'b.png');

    expect(procesar).toHaveBeenCalledTimes(2);
    expect(miniaturas().map((i) => i.alt)).toEqual(['Foto 1 del electrodoméstico', 'Foto 2 del electrodoméstico']);
    expect(raiz().textContent).toContain('2 de 3');
    expect(emitidas.at(-1)).toEqual(['data:image/jpeg;base64,FOTO1', 'data:image/jpeg;base64,FOTO2']);
  });

  it('acepta hasta 3 fotos: al llegar al límite deshabilita "Agregar fotos"', async () => {
    await elegir('a.png', 'b.png', 'c.png');

    expect(componente.vistas).toHaveLength(3);
    expect(componente.lleno).toBe(true);
    expect(botonAgregar().disabled).toBe(true);
  });

  it('si se eligen más de las que caben, usa las primeras y avisa del límite', async () => {
    await elegir('a.png', 'b.png', 'c.png', 'd.png');

    expect(componente.vistas).toHaveLength(3);
    expect(procesar).toHaveBeenCalledTimes(3);
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Solo puedes tener 3 fotos.');
  });

  it('suma a lo que ya hay: con 2 elegidas, solo cabe 1 más', async () => {
    await elegir('a.png', 'b.png');
    await elegir('c.png', 'd.png');

    expect(componente.vistas).toHaveLength(3);
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Solo puedes tener 3 fotos.');
  });

  it('un archivo inválido se rechaza con su nombre y su motivo, y los buenos se conservan', async () => {
    procesar
      .mockRejectedValueOnce(new ErrorImagen('Elige una imagen JPEG, PNG o WebP.'))
      .mockResolvedValueOnce('data:image/jpeg;base64,BUENA');

    await elegir('documento.gif', 'bien.png');

    expect(componente.vistas).toEqual(['data:image/jpeg;base64,BUENA']);
    const alerta = raiz().querySelector('[role="alert"]')?.textContent ?? '';
    expect(alerta).toContain('documento.gif');
    expect(alerta).toContain('JPEG, PNG o WebP');
  });

  it('un error inesperado se explica sin detalles técnicos', async () => {
    procesar.mockRejectedValueOnce(new Error('boom'));
    await elegir('a.png');
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('a.png: No pudimos preparar la imagen.');
    expect(componente.vistas).toEqual([]);
  });

  it('el aviso de tamaño de la reducción llega a la persona', async () => {
    procesar.mockRejectedValueOnce(new ErrorImagen('La imagen sigue pesando más de 1 MB después de reducirla.'));
    await elegir('grande.png');
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('más de 1 MB');
  });

  describe('vista previa con tarjetas', () => {
    it('sin fotos no muestra el contenedor', () => {
      expect(raiz().querySelector('app-bounce-cards')).toBeNull();
      expect(raiz().querySelector('[aria-label="Fotos elegidas"]')).toBeNull();
    });

    it.each([1, 2, 3])('con %s foto(s) muestra esa cantidad de tarjetas', async (cuantas) => {
      await elegir(...Array.from({ length: cuantas }, (_, i) => `${i}.png`));

      expect(raiz().querySelectorAll('app-bounce-cards .bounce-cards__card')).toHaveLength(cuantas);
      expect(raiz().querySelector('[aria-label="Fotos elegidas"]')).not.toBeNull();
    });

    it('usa la vista previa reducida al 70 %: tarjetas de 140 px en un contenedor de 350 por 224', async () => {
      await elegir('a.png');

      const conjunto = raiz().querySelector('.bounce-cards') as HTMLElement;
      expect(conjunto.style.width).toBe('350px');
      expect(conjunto.style.height).toBe('224px');
      expect(conjunto.style.getPropertyValue('--bounce-cards-size')).toBe('140px');
      expect(conjunto.style.getPropertyValue('--bounce-cards-border-color')).toBe('#ffffff');
    });

    it('cada foto tiene su botón "Quitar foto N", alcanzable con el teclado', async () => {
      await elegir('a.png', 'b.png');

      expect(botonesQuitar().map((b) => b.textContent?.trim())).toEqual(['Quitar foto 1', 'Quitar foto 2']);
      botonesQuitar().forEach((boton) => {
        expect(boton.type).toBe('button');
        expect(boton.tabIndex).toBeGreaterThanOrEqual(0);
      });
    });

    it('los botones de quitar están fuera de las tarjetas, en una fila fija', async () => {
      await elegir('a.png', 'b.png', 'c.png');

      expect(raiz().querySelector('ul[aria-label="Quitar fotos"]')).not.toBeNull();
      botonesQuitar().forEach((boton) => {
        expect(boton.closest('app-bounce-cards')).toBeNull();
        expect(boton.closest('.bounce-cards__card')).toBeNull();
      });
    });

    it('el hover sobre las tarjetas no mueve ni cambia los botones de quitar', async () => {
      await elegir('a.png', 'b.png', 'c.png');
      const antes = raiz().querySelector('ul[aria-label="Quitar fotos"]')!.outerHTML;
      const posiciones = botonesQuitar().map((b) => b.getBoundingClientRect().left);

      const conjunto = raiz().querySelector('.bounce-cards') as HTMLElement;
      for (const x of [-59, 0, 59, 0]) {
        conjunto.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: 0 }));
        await new Promise((resolver) => setTimeout(resolver, 40));
        fixture.detectChanges();
      }

      expect(raiz().querySelector('ul[aria-label="Quitar fotos"]')!.outerHTML).toBe(antes);
      expect(botonesQuitar().map((b) => b.getBoundingClientRect().left)).toEqual(posiciones);
    });

    it('el botón de quitar y las tarjetas no comparten ancestros que se muevan', async () => {
      await elegir('a.png', 'b.png');
      botonesQuitar().forEach((boton) => {
        for (let el: HTMLElement | null = boton; el && el !== raiz(); el = el.parentElement) {
          expect(el.style.transform).toBe('');
        }
      });
    });

    describe('quitar cada una', () => {
      const FOTO = (n: number): string => `data:image/jpeg;base64,FOTO${n}`;

      beforeEach(async () => {
        await elegir('a.png', 'b.png', 'c.png');
      });

      it('la primera', () => {
        botonesQuitar()[0].click();
        fixture.detectChanges();

        expect(componente.vistas).toEqual([FOTO(2), FOTO(3)]);
        expect(botonesQuitar().map((b) => b.textContent?.trim())).toEqual(['Quitar foto 1', 'Quitar foto 2']);
      });

      it('la del medio', () => {
        botonesQuitar()[1].click();
        fixture.detectChanges();

        expect(componente.vistas).toEqual([FOTO(1), FOTO(3)]);
        expect(botonesQuitar()).toHaveLength(2);
      });

      it('la última', () => {
        botonesQuitar()[2].click();
        fixture.detectChanges();

        expect(componente.vistas).toEqual([FOTO(1), FOTO(2)]);
        expect(botonesQuitar()).toHaveLength(2);
      });

      it('quitar una no quita ninguna otra y avisa una sola vez', () => {
        const antes = emitidas.length;

        botonesQuitar()[1].click();
        fixture.detectChanges();

        expect(componente.vistas).toHaveLength(2);
        expect(componente.vistas).toContain(FOTO(1));
        expect(componente.vistas).toContain(FOTO(3));
        expect(emitidas.length).toBe(antes + 1);
        expect(miniaturas().map((i) => i.alt)).toEqual(['Foto 1 del electrodoméstico', 'Foto 2 del electrodoméstico']);
      });

      it('se pueden quitar una tras otra hasta dejar la lista vacía', () => {
        for (const esperado of [[FOTO(2), FOTO(3)], [FOTO(3)], []]) {
          botonesQuitar()[0].click();
          fixture.detectChanges();
          expect(componente.vistas).toEqual(esperado);
        }
        expect(raiz().querySelector('app-bounce-cards')).toBeNull();
      });

      it('con el teclado: Enter sobre el botón quita esa foto y el foco pasa al siguiente botón', () => {
        botonesQuitar()[0].focus();
        botonesQuitar()[0].click();
        fixture.detectChanges();

        expect(document.activeElement).toBe(botonesQuitar()[0]);
        expect(document.activeElement?.textContent?.trim()).toBe('Quitar foto 1');
      });

      it('si se quitó la última de la fila, el foco va al botón anterior', () => {
        botonesQuitar()[2].click();
        fixture.detectChanges();
        expect(document.activeElement).toBe(botonesQuitar()[1]);
      });

      it('al quitar la única foto, el foco va a "Agregar fotos"', async () => {
        componente.vistas = [FOTO(1)];
        botonesQuitar()[2].click();
        botonesQuitar()[1].click();
        fixture.detectChanges();
        botonesQuitar()[0].click();
        fixture.detectChanges();

        expect(document.activeElement).toBe(botonAgregar());
      });
    });

    it('el botón "Quitar foto" quita esa foto y no dispara ninguna otra acción', async () => {
      await elegir('a.png', 'b.png', 'c.png');
      const antes = emitidas.length;

      botonesQuitar()[1].click();
      fixture.detectChanges();

      expect(componente.vistas).toEqual(['data:image/jpeg;base64,FOTO1', 'data:image/jpeg;base64,FOTO3']);
      expect(emitidas.length).toBe(antes + 1);
      expect(procesar).toHaveBeenCalledTimes(3);
      expect(miniaturas()).toHaveLength(2);
      expect(raiz().textContent).toContain('2 de 3');
    });

    it('al quitar la última foto desaparece el contenedor', async () => {
      await elegir('a.png');
      botonesQuitar()[0].click();
      fixture.detectChanges();
      expect(raiz().querySelector('app-bounce-cards')).toBeNull();
    });

    it('conserva el botón, el contador y los textos de ayuda', async () => {
      await elegir('a.png');
      expect(botonAgregar().textContent).toContain('Agregar fotos');
      expect(raiz().textContent).toContain('1 de 3');
      expect(raiz().textContent).toContain('Opcional. JPEG, PNG o WebP; se reducen automáticamente.');
    });
  });

  describe('foto en grande', () => {
    const cartas = (): HTMLElement[] => Array.from(raiz().querySelectorAll('.bounce-cards__card'));
    const dialogo = (): HTMLElement | null => raiz().querySelector('[role="dialog"]');
    const conjunto = (): HTMLElement => raiz().querySelector('.bounce-cards')!;

    /** jsdom no calcula posiciones: el conjunto mide 0, así que clientX ya es relativo al centro. */
    const pulsarCarta = (x: number): void => {
      conjunto().dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: 0 }));
      fixture.detectChanges();
    };

    beforeEach(async () => {
      await elegir('a.png', 'b.png', 'c.png');
    });

    it('las tarjetas son botones con el nombre de su foto', () => {
      expect(cartas().map((c) => c.getAttribute('role'))).toEqual(['button', 'button', 'button']);
      expect(cartas().map((c) => c.getAttribute('aria-label'))).toEqual([
        'Foto 1 del electrodoméstico',
        'Foto 2 del electrodoméstico',
        'Foto 3 del electrodoméstico',
      ]);
    });

    it('hacer clic en una tarjeta abre esa foto (la vista previa local) en un diálogo', () => {
      pulsarCarta(59);

      expect(dialogo()).not.toBeNull();
      expect(dialogo()!.querySelector('img')!.getAttribute('src')).toBe('data:image/jpeg;base64,FOTO3');
      expect(dialogo()!.querySelector('img')!.alt).toBe('Foto 3 del electrodoméstico');
    });

    it('cada tarjeta abre su propia foto', () => {
      pulsarCarta(-59);
      expect(dialogo()!.querySelector('img')!.getAttribute('src')).toBe('data:image/jpeg;base64,FOTO1');
    });

    it('Enter sobre una tarjeta también la abre', () => {
      cartas()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      fixture.detectChanges();
      expect(dialogo()!.querySelector('img')!.getAttribute('src')).toBe('data:image/jpeg;base64,FOTO2');
    });

    it('reutiliza el diálogo compartido de foto ampliada', () => {
      pulsarCarta(0);
      expect(raiz().querySelector('app-foto-ampliada')).not.toBeNull();
    });

    it('la "x" de quitar NO abre el diálogo y sí quita la foto', () => {
      botonesQuitar()[1].click();
      fixture.detectChanges();

      expect(dialogo()).toBeNull();
      expect(componente.vistas).toHaveLength(2);
    });

    it('la "x" no deja que el clic llegue a la tarjeta', () => {
      const alPulsar = vi.fn();
      conjunto().addEventListener('click', alPulsar);

      botonesQuitar()[0].click();

      expect(alPulsar).not.toHaveBeenCalled();
    });

    it('Enter sobre la "x" no abre el diálogo', () => {
      botonesQuitar()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      fixture.detectChanges();
      expect(dialogo()).toBeNull();
    });

    it('se cierra con la X', () => {
      pulsarCarta(0);
      (dialogo()!.querySelector('button[aria-label="Cerrar foto"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(dialogo()).toBeNull();
    });

    it('se cierra con un clic afuera', () => {
      pulsarCarta(0);
      (dialogo()!.querySelector('[data-fondo]') as HTMLElement).click();
      fixture.detectChanges();
      expect(dialogo()).toBeNull();
    });

    it('se cierra con Escape', () => {
      pulsarCarta(0);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(dialogo()).toBeNull();
    });

    it('al cerrar, el foco vuelve a la tarjeta que se abrió', () => {
      pulsarCarta(59);
      expect(document.activeElement?.getAttribute('aria-label')).toBe('Cerrar foto');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(document.activeElement).toBe(cartas()[2]);
    });
  });

  it('quitar una foto la saca de la lista y deja espacio para otra', async () => {
    await elegir('a.png', 'b.png', 'c.png');

    botonesQuitar()[1].click();
    fixture.detectChanges();

    expect(componente.vistas).toEqual(['data:image/jpeg;base64,FOTO1', 'data:image/jpeg;base64,FOTO3']);
    expect(emitidas.at(-1)).toEqual(componente.vistas);
    expect(componente.lleno).toBe(false);
    expect(botonAgregar().disabled).toBe(false);
  });

  it('quitar borra un error anterior', async () => {
    await elegir('a.png', 'b.png', 'c.png', 'd.png');
    expect(raiz().querySelector('[role="alert"]')).not.toBeNull();

    botonesQuitar()[0].click();
    fixture.detectChanges();

    expect(raiz().querySelector('[role="alert"]')).toBeNull();
  });

  it('elegir sin archivos no hace nada', async () => {
    await elegir();
    expect(procesar).not.toHaveBeenCalled();
    expect(emitidas).toHaveLength(0);
  });

  it('respeta el máximo recibido (por ejemplo, cuando la cita ya tiene fotos)', async () => {
    fixture.componentRef.setInput('maximo', 1);
    fixture.detectChanges();

    await elegir('a.png', 'b.png');

    expect(componente.vistas).toHaveLength(1);
    expect(raiz().textContent).toContain('1 de 1');
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Solo puedes tener 1 foto.');
  });

  it('recibe fotos iniciales (por ejemplo, un borrador o fallidas por reintentar)', () => {
    fixture.componentRef.setInput('fotos', ['data:image/jpeg;base64,A', 'data:image/jpeg;base64,B']);
    fixture.detectChanges();

    expect(miniaturas()).toHaveLength(2);
    expect(raiz().textContent).toContain('2 de 3');
  });

  it('deshabilitado, bloquea agregar y quitar', async () => {
    await elegir('a.png');
    fixture.componentRef.setInput('deshabilitado', true);
    fixture.detectChanges();

    expect(botonAgregar().disabled).toBe(true);
    expect(botonesQuitar().every((b) => b.disabled)).toBe(true);
  });

  it('mientras prepara las imágenes, el botón lo indica y queda deshabilitado', async () => {
    let terminar!: (valor: string) => void;
    procesar.mockReturnValueOnce(new Promise<string>((resolver) => (terminar = resolver)));

    const campo = raiz().querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(campo, 'files', { value: [new File(['x'], 'a.png', { type: 'image/png' })], configurable: true });
    campo.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(botonAgregar().textContent).toContain('Preparando');
    expect(botonAgregar().disabled).toBe(true);

    terminar('data:image/jpeg;base64,X');
    await new Promise((resolver) => setTimeout(resolver));
    fixture.detectChanges();
    expect(botonAgregar().textContent).toContain('Agregar fotos');
  });
});
