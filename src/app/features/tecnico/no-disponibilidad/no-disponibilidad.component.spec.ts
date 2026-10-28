import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BloqueIndisponibilidad } from '../../../core/models/tecnico-agenda';
import { BloqueService } from '../../../core/services/bloque.service';
import { NoDisponibilidadComponent } from './no-disponibilidad.component';
import '../tecnico.module';

const BLOQUE: BloqueIndisponibilidad = { id: 7, inicio: '2026-10-30T09:00:00', fin: '2026-10-30T11:00:00', motivo: 'Cita médica' };
const falloHttp = (status: number, error?: unknown): HttpErrorResponse => new HttpErrorResponse({ status, error });

describe('NoDisponibilidadComponent', () => {
  let servicio: {
    obtenerBloques: ReturnType<typeof vi.fn>;
    crearBloque: ReturnType<typeof vi.fn>;
    eliminarBloque: ReturnType<typeof vi.fn>;
  };
  let componente: NoDisponibilidadComponent;

  const crear = (): void => {
    componente = new NoDisponibilidadComponent(
      new FormBuilder(),
      servicio as unknown as BloqueService,
      { markForCheck: vi.fn() } as unknown as ChangeDetectorRef
    );
    componente.ngOnInit();
  };

  beforeEach(() => {
    // 27 de octubre de 2026, mediodía.
    vi.useFakeTimers({ now: new Date(2026, 9, 27, 12, 0, 0), toFake: ['Date'] });
    servicio = {
      obtenerBloques: vi.fn().mockReturnValue(of([BLOQUE])),
      crearBloque: vi.fn().mockReturnValue(of(BLOQUE)),
      eliminarBloque: vi.fn().mockReturnValue(of(undefined)),
    };
    crear();
  });

  afterEach(() => vi.useRealTimers());

  describe('carga de bloques', () => {
    it('al iniciar carga los próximos bloques', () => {
      expect(servicio.obtenerBloques).toHaveBeenCalledTimes(1);
      expect(componente.bloques).toEqual([BLOQUE]);
      expect(componente.cargando).toBe(false);
      expect(componente.errorCarga).toBeNull();
    });

    it('si la respuesta no es una lista, queda vacía', () => {
      servicio.obtenerBloques.mockReturnValue(of(null));
      componente.cargarBloques();
      expect(componente.bloques).toEqual([]);
    });

    it('si falla, muestra el mensaje del backend y deja la lista vacía', () => {
      servicio.obtenerBloques.mockReturnValue(throwError(() => falloHttp(500, { status: 500, error: 'Servicio no disponible' })));
      componente.cargarBloques();

      expect(componente.errorCarga).toBe('Servicio no disponible');
      expect(componente.bloques).toEqual([]);
      expect(componente.cargando).toBe(false);
    });

    it('sin mensaje del backend usa uno genérico en español', () => {
      servicio.obtenerBloques.mockReturnValue(throwError(() => new Error('x')));
      componente.cargarBloques();
      expect(componente.errorCarga).toBe('No fue posible cargar tus bloques.');
    });

    it('recargar en silencio no muestra el indicador de carga', () => {
      const pendiente = new Subject<BloqueIndisponibilidad[]>();
      servicio.obtenerBloques.mockReturnValue(pendiente);

      componente.cargarBloques(false);

      expect(componente.cargando).toBe(false);
    });
  });

  describe('formulario', () => {
    it('empieza con el día de hoy', () => {
      expect(componente.fecha?.value).toBe('2026-10-27');
    });

    it('exige hora de inicio y de fin', () => {
      expect(componente.horaInicio?.hasError('required')).toBe(true);
      expect(componente.horaFin?.hasError('required')).toBe(true);
      expect(componente.form.valid).toBe(false);
    });

    it('no acepta un día anterior a hoy', () => {
      componente.form.patchValue({ fecha: '2026-10-26', horaInicio: '09:00', horaFin: '10:00' });
      expect(componente.fecha?.hasError('fechaPasada')).toBe(true);
    });

    it('la hora final debe ser posterior a la inicial', () => {
      componente.form.patchValue({ fecha: '2026-10-28', horaInicio: '10:00', horaFin: '10:00' });
      expect(componente.form.hasError('finAntesDeInicio')).toBe(true);

      componente.form.patchValue({ horaFin: '09:00' });
      expect(componente.form.hasError('finAntesDeInicio')).toBe(true);

      componente.form.patchValue({ horaFin: '11:00' });
      expect(componente.form.hasError('finAntesDeInicio')).toBe(false);
    });

    it('el inicio no puede estar en el pasado', () => {
      componente.form.patchValue({ fecha: '2026-10-27', horaInicio: '08:00', horaFin: '09:00' });
      expect(componente.form.hasError('inicioPasado')).toBe(true);

      componente.form.patchValue({ horaInicio: '13:00', horaFin: '14:00' });
      expect(componente.form.valid).toBe(true);
    });
  });

  describe('crear un bloque', () => {
    const llenar = (extra: object = {}): void =>
      componente.form.patchValue({ fecha: '2026-10-28', horaInicio: '09:00', horaFin: '11:00', motivo: '', ...extra });

    it('inválido: marca los campos y no llama al backend', () => {
      componente.onSubmit();

      expect(servicio.crearBloque).not.toHaveBeenCalled();
      expect(componente.horaInicio?.touched).toBe(true);
    });

    it('envía la hora local tal cual (sin zona) y sin motivo si está vacío', () => {
      llenar();
      componente.onSubmit();

      expect(servicio.crearBloque).toHaveBeenCalledWith({ inicio: '2026-10-28T09:00:00', fin: '2026-10-28T11:00:00' });
    });

    it('incluye el motivo recortado cuando lo hay', () => {
      llenar({ motivo: '  Cita médica ' });
      componente.onSubmit();

      expect(servicio.crearBloque).toHaveBeenCalledWith({ inicio: '2026-10-28T09:00:00', fin: '2026-10-28T11:00:00', motivo: 'Cita médica' });
    });

    it('si sale bien: avisa, limpia el formulario y recarga la lista', () => {
      llenar();
      servicio.obtenerBloques.mockClear();

      componente.onSubmit();

      expect(componente.exito).toBe('Listo, ese horario quedó bloqueado.');
      expect(componente.form.value).toMatchObject({ fecha: '2026-10-27', horaInicio: '', horaFin: '', motivo: '' });
      expect(servicio.obtenerBloques).toHaveBeenCalledTimes(1);
      expect(componente.guardando).toBe(false);
    });

    it('si falla: muestra el mensaje del backend (por ejemplo, un choque con una cita)', () => {
      llenar();
      servicio.crearBloque.mockReturnValue(throwError(() => falloHttp(409, { status: 409, error: 'Ya tienes una cita en ese horario' })));

      componente.onSubmit();

      expect(componente.errorGuardar).toBe('Ya tienes una cita en ese horario');
      expect(componente.exito).toBeNull();
      expect(componente.guardando).toBe(false);
    });

    it('un error sin mensaje: texto genérico', () => {
      llenar();
      servicio.crearBloque.mockReturnValue(throwError(() => new Error('x')));
      componente.onSubmit();
      expect(componente.errorGuardar).toBe('No fue posible guardar el bloque. Intenta de nuevo.');
    });

    it('un nuevo envío limpia el aviso de éxito anterior', () => {
      componente.exito = 'viejo';
      componente.onSubmit();
      expect(componente.exito).toBeNull();
    });
  });

  describe('eliminar un bloque', () => {
    it('pedir eliminar abre la confirmación y limpia avisos', () => {
      componente.exito = 'algo';
      componente.errorEliminar = 'error';

      componente.pedirEliminar(BLOQUE);

      expect(componente.bloqueParaEliminar).toBe(BLOQUE);
      expect(componente.exito).toBeNull();
      expect(componente.errorEliminar).toBeNull();
    });

    it('cancelar cierra la confirmación', () => {
      componente.pedirEliminar(BLOQUE);
      componente.cancelarEliminar();
      expect(componente.bloqueParaEliminar).toBeNull();
    });

    it('no se puede cancelar mientras se elimina', () => {
      componente.pedirEliminar(BLOQUE);
      componente.eliminando = true;
      componente.cancelarEliminar();
      expect(componente.bloqueParaEliminar).toBe(BLOQUE);
    });

    it('confirmar elimina ese bloque, avisa y recarga la lista', () => {
      componente.pedirEliminar(BLOQUE);
      servicio.obtenerBloques.mockClear();

      componente.confirmarEliminar();

      expect(servicio.eliminarBloque).toHaveBeenCalledWith(7);
      expect(componente.bloqueParaEliminar).toBeNull();
      expect(componente.exito).toBe('El bloque se eliminó.');
      expect(servicio.obtenerBloques).toHaveBeenCalledTimes(1);
      expect(componente.eliminando).toBe(false);
    });

    it('confirmar sin un bloque elegido no hace nada', () => {
      componente.confirmarEliminar();
      expect(servicio.eliminarBloque).not.toHaveBeenCalled();
    });

    it('si falla: mantiene la confirmación abierta y muestra el error', () => {
      servicio.eliminarBloque.mockReturnValue(throwError(() => falloHttp(404, { status: 404, error: 'El bloque ya no existe' })));
      componente.pedirEliminar(BLOQUE);

      componente.confirmarEliminar();

      expect(componente.errorEliminar).toBe('El bloque ya no existe');
      expect(componente.bloqueParaEliminar).toBe(BLOQUE);
      expect(componente.eliminando).toBe(false);
    });

    it('un error sin mensaje: texto genérico', () => {
      servicio.eliminarBloque.mockReturnValue(throwError(() => new Error('x')));
      componente.pedirEliminar(BLOQUE);
      componente.confirmarEliminar();
      expect(componente.errorEliminar).toBe('No fue posible eliminar el bloque. Intenta de nuevo.');
    });
  });
});
