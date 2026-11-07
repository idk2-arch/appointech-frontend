import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CitaResumen } from '../../../core/models/cita';
import { ClienteModule } from '../cliente.module';
import { CalificarModalComponent } from './calificar-modal.component';

const CITA: CitaResumen = {
  id: 7,
  estado: 'FINALIZADA',
  tecnicoId: 1,
  tecnicoNombre: 'Luis',
  tecnicoApellido: 'Gómez',
  tecnicoFotoUrl: null,
  especialidadId: 1,
  especialidadNombre: 'Lavadoras',
  descripcionProblema: 'No centrifuga',
  direccionServicio: 'Calle 6 # 12-34',
  fechaHoraInicio: '2026-11-04T14:00:00',
  fechaHoraFin: '2026-11-04T15:00:00',
};

describe('CalificarModalComponent', () => {
  let fixture: ComponentFixture<CalificarModalComponent>;
  let componente: CalificarModalComponent;

  const raiz = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => (raiz().textContent ?? '').replace(/\s+/g, ' ');
  const enviarBtn = (): HTMLButtonElement => raiz().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const chip = (nombre: string): HTMLButtonElement =>
    Array.from(raiz().querySelectorAll<HTMLButtonElement>('button[aria-pressed]')).find((b) => b.textContent?.trim() === nombre)!;
  const chips = (): string[] => Array.from(raiz().querySelectorAll('button[aria-pressed]')).map((b) => b.textContent?.trim() ?? '');
  const comentario = (): HTMLTextAreaElement => raiz().querySelector<HTMLTextAreaElement>('#calificar-comentario')!;
  const refrescar = async (): Promise<void> => {
    // Los cambios hechos directo en el componente (no por un evento) hay que marcarlos a mano.
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  /** Elige la puntuación como lo haría el teclado sobre las estrellas. */
  const puntuar = async (n: number): Promise<void> => {
    componente.elegir(n);
    await refrescar();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ClienteModule] }).compileComponents();
    fixture = TestBed.createComponent(CalificarModalComponent);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('cita', CITA);
    fixture.detectChanges();
  });

  describe('encabezado', () => {
    it('muestra técnico, servicio, fecha, hora y dirección de la cita', () => {
      expect(texto()).toContain('Luis Gómez');
      expect(texto()).toContain('Lavadoras');
      expect(texto()).toMatch(/2:00\s*p\.\s*m\./);
      expect(texto()).toContain('Calle 6 # 12-34');
      expect(raiz().querySelector('app-avatar')).not.toBeNull();
    });

    it('sin técnico ni fecha usa textos por defecto y omite lo que falta', () => {
      fixture.componentRef.setInput('cita', { ...CITA, tecnicoNombre: null, tecnicoApellido: null, especialidadNombre: null, fechaHoraInicio: null, direccionServicio: '' });
      fixture.detectChanges();
      expect(texto()).toContain('Técnico sin asignar');
      expect(texto()).toContain('Servicio');
      expect(texto()).not.toContain('Calle 6');
    });

    it('sin cita no muestra el encabezado', () => {
      fixture.componentRef.setInput('cita', null);
      fixture.detectChanges();
      expect(raiz().querySelector('app-avatar')).toBeNull();
    });
  });

  describe('puntuación', () => {
    it('empieza sin puntuación: enviar apagado, sin frase ni sugerencias, con la ayuda inicial', () => {
      expect(raiz().querySelectorAll('[role="radio"]')).toHaveLength(5);
      expect(enviarBtn().disabled).toBe(true);
      expect(raiz().querySelector('.calificar-frase')).toBeNull();
      expect(chips()).toEqual([]);
      expect(texto()).toContain('Elige una puntuación para continuar.');
    });

    it('no emite nada si se intenta enviar sin puntuación', () => {
      const confirmar = vi.fn();
      componente.confirmar.subscribe(confirmar);
      componente.enviar();
      expect(confirmar).not.toHaveBeenCalled();
    });

    it('elegir con el teclado en las estrellas actualiza la puntuación', async () => {
      const primera = raiz().querySelector<HTMLElement>('[role="radio"]')!;
      primera.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
      await refrescar();
      expect(componente.puntuacion).toBe(5);
      expect(enviarBtn().disabled).toBe(false);
    });

    it.each([
      [1, 'Lamentamos que no haya salido bien', 'Cuéntanos qué pasó'],
      [2, 'Podemos mejorar', 'Cuéntanos qué pasó'],
      [3, 'Gracias por tu opinión', '¿Qué podría haber sido mejor?'],
      [4, '¡Buen servicio!', '¿Qué fue lo que más te gustó?'],
      [5, '¡Excelente servicio!', '¿Qué fue lo que más te gustó?'],
    ])('con %i estrellas dice "%s" y ayuda a escribir el comentario', async (n, frase, ayuda) => {
      await puntuar(n);
      expect(raiz().querySelector('.calificar-frase')?.textContent?.trim()).toBe(frase);
      expect(texto()).toContain(ayuda);
    });

    it('las sugerencias cambian con la puntuación', async () => {
      await puntuar(5);
      expect(chips()).toEqual(['Puntual', 'Amable', 'Trabajo limpio', 'Resolvió el problema', 'Buen precio']);
      await puntuar(1);
      expect(chips()).toEqual(['Llegó tarde', 'No resolvió el problema', 'Poca amabilidad', 'Dejó sucio']);
      await puntuar(3);
      expect(chips()).toEqual(['Puntual', 'Amable', 'Llegó tarde', 'Dejó sucio']);
    });
  });

  describe('sugerencias del comentario', () => {
    beforeEach(async () => puntuar(5));

    it('al pulsar una se agrega al comentario y queda marcada; al pulsarla otra vez se quita', async () => {
      chip('Puntual').click();
      await refrescar();
      expect(comentario().value).toBe('Puntual');
      expect(chip('Puntual').getAttribute('aria-pressed')).toBe('true');

      chip('Amable').click();
      await refrescar();
      expect(comentario().value).toBe('Puntual, Amable');

      chip('Puntual').click();
      await refrescar();
      expect(comentario().value).toBe('Amable');
      expect(chip('Puntual').getAttribute('aria-pressed')).toBe('false');

      chip('Amable').click();
      await refrescar();
      expect(comentario().value).toBe('');
    });

    it('se agrega después de lo que la persona ya escribió, sin duplicarse', async () => {
      componente.comentario = 'Llegó rápido.';
      await refrescar();
      chip('Amable').click();
      await refrescar();
      expect(comentario().value).toBe('Llegó rápido. Amable');

      componente.alternar('Amable');
      componente.alternar('Amable');
      expect(componente.comentario).toBe('Llegó rápido. Amable');
    });

    it('si quitarla deja texto a ambos lados, los une bien', async () => {
      componente.comentario = 'Puntual, Amable, Buen precio';
      await refrescar();
      chip('Amable').click();
      await refrescar();
      expect(comentario().value).toBe('Puntual, Buen precio');
    });

    it('no pasa del máximo de 500 caracteres', async () => {
      componente.comentario = 'a'.repeat(495);
      await refrescar();
      chip('Amable').click();
      await refrescar();
      expect(componente.comentario).toBe('a'.repeat(495));
      expect(chip('Amable').getAttribute('aria-pressed')).toBe('false');
    });

    it('el contador y el límite del cuadro son de 500', async () => {
      expect(comentario().maxLength).toBe(500);
      chip('Puntual').click();
      await refrescar();
      expect(texto()).toContain('7/500');
    });
  });

  describe('envío', () => {
    it('emite solo la puntuación y el comentario sin espacios sobrantes (las sugerencias no se envían aparte)', async () => {
      const confirmar = vi.fn();
      componente.confirmar.subscribe(confirmar);
      await puntuar(5);
      chip('Puntual').click();
      componente.comentario = '  Puntual y muy amable  ';
      await refrescar();

      enviarBtn().click();

      expect(confirmar).toHaveBeenCalledWith({ puntuacion: 5, comentario: 'Puntual y muy amable' });
    });

    it('sin comentario emite solo la puntuación', async () => {
      const confirmar = vi.fn();
      componente.confirmar.subscribe(confirmar);
      await puntuar(2);
      componente.comentario = '   ';

      componente.enviar();

      expect(confirmar).toHaveBeenCalledWith({ puntuacion: 2 });
    });

    it('mientras envía no vuelve a emitir y deja el botón apagado con su indicador', async () => {
      const confirmar = vi.fn();
      componente.confirmar.subscribe(confirmar);
      await puntuar(3);
      fixture.componentRef.setInput('cargando', true);
      await refrescar();

      componente.enviar();

      expect(confirmar).not.toHaveBeenCalled();
      expect(enviarBtn().disabled).toBe(true);
      expect(texto()).toContain('Enviando…');
    });

    it('muestra el error recibido y avisa al cancelar', async () => {
      const cerrar = vi.fn();
      componente.cerrar.subscribe(cerrar);
      fixture.componentRef.setInput('errorMensaje', 'Sin conexión');
      await refrescar();

      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Sin conexión');
      Array.from(raiz().querySelectorAll('button')).find((b) => b.textContent?.includes('Cancelar'))!.click();
      expect(cerrar).toHaveBeenCalled();
    });
  });

  describe('agradecimiento', () => {
    beforeEach(async () => {
      await puntuar(4);
      fixture.componentRef.setInput('enviada', true);
      await refrescar();
    });

    it('reemplaza el formulario por el agradecimiento con las estrellas elegidas en solo lectura', () => {
      expect(texto()).toContain('¡Gracias por tu calificación!');
      expect(raiz().querySelector('textarea')).toBeNull();
      expect(raiz().querySelector('button[type="submit"]')).toBeNull();
      expect(raiz().querySelector('app-peek-rating [role="img"]')?.getAttribute('aria-label')).toBe('4 de 5 estrellas');
    });

    it('el foco pasa al botón Cerrar, que cierra el diálogo', () => {
      const cerrar = vi.fn();
      componente.cerrar.subscribe(cerrar);
      const boton = raiz().querySelector<HTMLButtonElement>('[data-cerrar]')!;
      expect(document.activeElement).toBe(boton);
      boton.click();
      expect(cerrar).toHaveBeenCalled();
    });

    it('no muestra el mensaje de error del formulario', async () => {
      fixture.componentRef.setInput('errorMensaje', 'algo');
      await refrescar();
      expect(raiz().querySelector('[role="alert"]')).toBeNull();
    });
  });
});
