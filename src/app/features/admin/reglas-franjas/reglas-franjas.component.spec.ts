import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReglasFranjas, ReglasFranjasService } from '../../../core/services/reglas-franjas.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { AdminModule } from '../admin.module';
import { ReglasFranjasComponent } from './reglas-franjas.component';

const REGLAS: ReglasFranjas = {
  radioMaximoKm: 10,
  duracionBloqueMinutos: 120,
  horaInicioJornada: '08:00:00',
  horaFinJornada: '18:00:00',
  franjasOfrecidasInvalidadas: false,
  advertencia: null,
};

describe('ReglasFranjasComponent', () => {
  let fixture: ComponentFixture<ReglasFranjasComponent>;
  let componente: ReglasFranjasComponent;
  let toast: ToastService;
  const obtener = vi.fn();
  const actualizar = vi.fn();

  const refrescar = (): void => {
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };
  const raiz = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => (raiz().textContent ?? '').replace(/\s+/g, ' ');
  const campo = (id: string): HTMLInputElement => raiz().querySelector(`#franjas-${id}`)!;
  const avisos = (): [string, string][] => toast.visibles().map((a) => [a.tipo, a.titulo]);

  async function crear(respuesta: unknown = of(REGLAS)): Promise<void> {
    obtener.mockReset().mockReturnValue(respuesta);
    actualizar.mockReset();
    await TestBed.configureTestingModule({
      imports: [AdminModule, RouterModule.forRoot([])],
      providers: [{ provide: ReglasFranjasService, useValue: { obtener, actualizar } }],
    }).compileComponents();
    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ReglasFranjasComponent);
    componente = fixture.componentInstance;
    refrescar();
  }

  /** Cambia valores como lo haría la persona y deja que el formulario se vea con sus errores. */
  function escribirValores(valores: Record<string, unknown>): void {
    componente.form.patchValue(valores);
    componente.form.markAllAsTouched();
    refrescar();
  }

  const botonGuardar = (): HTMLButtonElement => raiz().querySelector('button[type="submit"]')!;

  beforeEach(() => TestBed.resetTestingModule());

  describe('carga', () => {
    it('muestra los valores del servidor, con las horas en HH:mm', async () => {
      await crear();

      expect(obtener).toHaveBeenCalledOnce();
      expect(campo('radio').value).toBe('10');
      expect(campo('duracion').value).toBe('120');
      expect(campo('inicio').value).toBe('08:00');
      expect(campo('fin').value).toBe('18:00');
    });

    it('muestra un estado de carga accesible', async () => {
      await crear(new Subject<ReglasFranjas>());
      expect(raiz().querySelector('[role="status"]')?.textContent).toContain('Cargando');
    });

    it('si falla muestra el detalle legible, avisa con un toast y permite reintentar', async () => {
      await crear(throwError(() => new HttpErrorResponse({ status: 500, error: { detail: 'Base de datos caída.' } })));

      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Base de datos caída.');
      expect(avisos()).toEqual([['error', 'No se pudieron cargar las reglas de franjas']]);

      obtener.mockReturnValue(of(REGLAS));
      Array.from(raiz().querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar'))!.click();
      refrescar();
      expect(campo('radio').value).toBe('10');
    });

    it('al destruirse cancela la consulta pendiente', async () => {
      const respuesta = new Subject<ReglasFranjas>();
      await crear(respuesta);
      fixture.destroy();
      expect(respuesta.observed).toBe(false);
    });
  });

  describe('validación en el cliente', () => {
    beforeEach(() => crear());

    it.each([
      ['radio', 'radioMaximoKm', -5, 'entre 1 y 100'],
      ['radio', 'radioMaximoKm', 0, 'entre 1 y 100'],
      ['radio', 'radioMaximoKm', 101, 'entre 1 y 100'],
      ['radio', 'radioMaximoKm', 2.5, 'entre 1 y 100'],
      ['radio', 'radioMaximoKm', null, 'Escribe la distancia'],
      ['duracion', 'duracionBloqueMinutos', -30, 'entre 15 y 480'],
      ['duracion', 'duracionBloqueMinutos', 14, 'entre 15 y 480'],
      ['duracion', 'duracionBloqueMinutos', 481, 'entre 15 y 480'],
      ['duracion', 'duracionBloqueMinutos', null, 'Escribe la duración'],
    ])('el %s no acepta %s y lo explica', (_nombre, control, valor, mensaje) => {
      escribirValores({ [control]: valor });
      componente.guardar();
      refrescar();

      expect(texto()).toContain(mensaje);
      expect(actualizar).not.toHaveBeenCalled();
    });

    it('pide ambas horas', () => {
      escribirValores({ horaInicioJornada: '', horaFinJornada: '' });
      expect(texto()).toContain('Elige la hora de inicio');
      expect(texto()).toContain('Elige la hora de fin');
    });

    it('el inicio debe ser anterior al fin', () => {
      escribirValores({ horaInicioJornada: '18:00', horaFinJornada: '08:00' });
      expect(texto()).toContain('La hora de inicio debe ser anterior a la de fin.');
      componente.guardar();
      expect(actualizar).not.toHaveBeenCalled();
    });

    it('la jornada debe tener espacio para un bloque completo', () => {
      escribirValores({ horaInicioJornada: '08:00', horaFinJornada: '09:00', duracionBloqueMinutos: 120 });
      expect(texto()).toContain('espacio para al menos un bloque completo');
      componente.guardar();
      expect(actualizar).not.toHaveBeenCalled();
    });

    it('un envío inválido marca los campos para mostrar sus errores', () => {
      componente.form.patchValue({ radioMaximoKm: -1 });
      componente.guardar();
      refrescar();
      expect(texto()).toContain('entre 1 y 100');
      expect(raiz().querySelector('#franjas-radio')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('no muestra errores de campos que nadie ha tocado', () => {
      expect(raiz().querySelectorAll('[role="alert"]')).toHaveLength(0);
    });
  });

  describe('guardar', () => {
    beforeEach(() => crear());

    it('cambiar solo el radio guarda directo, con HH:mm, y no advierte', () => {
      actualizar.mockReturnValue(of({ ...REGLAS, radioMaximoKm: 25 }));
      escribirValores({ radioMaximoKm: 25 });

      componente.guardar();
      refrescar();

      expect(actualizar).toHaveBeenCalledWith({
        radioMaximoKm: 25,
        duracionBloqueMinutos: 120,
        horaInicioJornada: '08:00',
        horaFinJornada: '18:00',
      });
      expect(componente.confirmando).toBe(false);
      expect(raiz().querySelector('app-modal-formulario')).toBeNull();
      expect(componente.advertencia).toBeNull();
      expect(toast.visibles().map((a) => [a.tipo, a.titulo, a.descripcion])).toEqual([['exito', 'Reglas de franjas guardadas', '']]);
    });

    it('cambiar la duración pide confirmación antes de guardar', () => {
      actualizar.mockReturnValue(of({ ...REGLAS, duracionBloqueMinutos: 90 }));
      escribirValores({ duracionBloqueMinutos: 90 });

      componente.guardar();
      refrescar();

      expect(actualizar).not.toHaveBeenCalled();
      const modal = raiz().querySelector('app-modal-formulario')!;
      expect(modal.textContent).toContain('dejarán de poder confirmarse');
      expect(modal.textContent).toContain('citas ya confirmadas no se tocan');
    });

    it('cambiar la jornada también pide confirmación, y cancelar no guarda', () => {
      escribirValores({ horaFinJornada: '17:00' });
      componente.guardar();
      expect(componente.confirmando).toBe(true);

      componente.cancelarConfirmacion();
      refrescar();
      expect(raiz().querySelector('app-modal-formulario')).toBeNull();
      expect(actualizar).not.toHaveBeenCalled();
    });

    it('al confirmar guarda y muestra la advertencia del servidor con un toast de éxito', () => {
      actualizar.mockReturnValue(
        of({
          ...REGLAS,
          duracionBloqueMinutos: 90,
          franjasOfrecidasInvalidadas: true,
          advertencia: 'Las franjas ofrecidas ya no se pueden confirmar.',
        })
      );
      escribirValores({ duracionBloqueMinutos: 90 });
      componente.guardar();
      componente.confirmarGuardado();
      refrescar();

      expect(actualizar).toHaveBeenCalledOnce();
      expect(raiz().querySelector('[role="status"]')?.textContent).toContain('Las franjas ofrecidas ya no se pueden confirmar.');
      expect(toast.visibles().map((a) => [a.tipo, a.titulo, a.descripcion])).toEqual([
        ['exito', 'Reglas de franjas guardadas', 'Las franjas ya ofrecidas dejaron de poder confirmarse.'],
      ]);
      expect(componente.confirmando).toBe(false);
    });

    it('si el servidor invalida franjas sin texto usa uno general', () => {
      actualizar.mockReturnValue(of({ ...REGLAS, franjasOfrecidasInvalidadas: true, advertencia: null }));
      componente.confirmarGuardado();
      expect(componente.advertencia).toContain('dejarán de poder confirmarse');
    });

    it('después de guardar, lo guardado es la nueva base para decidir si hay que confirmar', () => {
      actualizar.mockReturnValue(of({ ...REGLAS, duracionBloqueMinutos: 90 }));
      escribirValores({ duracionBloqueMinutos: 90 });
      componente.guardar();
      componente.confirmarGuardado();

      actualizar.mockClear();
      escribirValores({ radioMaximoKm: 30 });
      componente.guardar();
      expect(actualizar).toHaveBeenCalledOnce();
      expect(componente.confirmando).toBe(false);
    });

    it('si el servidor responde 400 muestra su detalle y un toast de error', () => {
      actualizar.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'La jornada no contiene un bloque completo.' } }))
      );
      escribirValores({ radioMaximoKm: 25 });

      componente.guardar();
      refrescar();

      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('La jornada no contiene un bloque completo.');
      expect(toast.visibles().map((a) => [a.tipo, a.titulo, a.descripcion])).toEqual([
        ['error', 'No se pudieron guardar las reglas', 'La jornada no contiene un bloque completo.'],
      ]);
    });

    it('un 400 sin detalle muestra un texto general y un 403 el de permisos', () => {
      actualizar.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 400 })));
      escribirValores({ radioMaximoKm: 25 });
      componente.guardar();
      expect(componente.errorGuardado).toContain('el servidor no aceptó las reglas');

      actualizar.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403 })));
      componente.guardar();
      expect(componente.errorGuardado).toContain('No tienes permisos');
    });

    it('no envía dos veces mientras guarda y el botón lo refleja', () => {
      const respuesta = new Subject<ReglasFranjas>();
      actualizar.mockReturnValue(respuesta);
      escribirValores({ radioMaximoKm: 25 });

      componente.guardar();
      componente.guardar();
      refrescar();

      expect(actualizar).toHaveBeenCalledOnce();
      expect(botonGuardar().disabled).toBe(true);
      expect(botonGuardar().textContent).toContain('Guardando');

      respuesta.next({ ...REGLAS, radioMaximoKm: 25 });
      respuesta.complete();
      refrescar();
      expect(botonGuardar().disabled).toBe(false);
    });

    it('enviar el formulario desde el teclado guarda', () => {
      actualizar.mockReturnValue(of({ ...REGLAS, radioMaximoKm: 25 }));
      escribirValores({ radioMaximoKm: 25 });
      raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
      expect(actualizar).toHaveBeenCalledOnce();
    });
  });

  it('las pestañas enlazan la distancia y las reglas de franjas', async () => {
    await crear();
    const enlaces = Array.from(raiz().querySelectorAll('nav a')).map((a) => [a.textContent?.trim(), a.getAttribute('href')]);
    expect(enlaces).toEqual([
      ['Distancia y contacto', '/admin/cobertura'],
      ['Reglas de franjas', '/admin/cobertura/franjas'],
    ]);
  });
  it('el encabezado y la tarjeta del formulario entran con la animación de aparecer, cada uno con su clave', async () => {
    await crear();
    expect(raiz().querySelector('[appaparecer="simple"] h1')).not.toBeNull();
    expect(raiz().querySelector('[appaparecer="simple"][aparecerclave="tarjeta"] form')).not.toBeNull();
  });

});
