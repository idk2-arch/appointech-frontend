import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DetalleCita } from '../../../core/models/cita';
import { CitaClienteService } from '../../../core/services/cita-cliente.service';
import { FotoElectrodomesticoService } from '../../../core/services/foto-electrodomestico.service';
import { DetalleCitaClienteComponent } from './detalle-cita-cliente.component';
import '../cliente.module';

const cita = (estado: DetalleCita['estado'] = 'CONFIRMADA'): DetalleCita => ({
  id: 5,
  estado,
  tecnicoId: 1,
  especialidadId: 1,
  descripcionProblema: 'No centrifuga',
  direccionServicio: 'Calle 6',
  fechaHoraInicio: '2026-11-04T14:00:00',
  fechaHoraFin: '2026-11-04T15:00:00',
  diagnostico: null,
  historial: [],
});

const falloHttp = (status: number, error?: unknown): HttpErrorResponse => new HttpErrorResponse({ status, error });

describe('DetalleCitaClienteComponent: carga, cancelar y reprogramar', () => {
  let servicio: {
    obtener: ReturnType<typeof vi.fn>;
    cancelar: ReturnType<typeof vi.fn>;
    reprogramar: ReturnType<typeof vi.fn>;
  };
  let componente: DetalleCitaClienteComponent;

  const crear = (id: string | null = '5'): void => {
    componente = new DetalleCitaClienteComponent(
      { snapshot: { paramMap: { get: () => id } } } as unknown as ActivatedRoute,
      servicio as unknown as CitaClienteService,
      {} as FotoElectrodomesticoService,
      { markForCheck: vi.fn() } as unknown as ChangeDetectorRef
    );
    componente.ngOnInit();
  };

  beforeEach(() => {
    servicio = {
      obtener: vi.fn().mockReturnValue(of(cita())),
      cancelar: vi.fn().mockReturnValue(of({})),
      reprogramar: vi.fn().mockReturnValue(of({})),
    };
    crear();
  });

  describe('carga', () => {
    it('toma el número de la ruta y carga la cita', () => {
      expect(servicio.obtener).toHaveBeenCalledWith(5);
      expect(componente.cita?.id).toBe(5);
      expect(componente.cargando).toBe(false);
      expect(componente.errorCarga).toBeNull();
    });

    it('si falla, deja la cita vacía y muestra el mensaje del backend', () => {
      servicio.obtener.mockReturnValue(throwError(() => falloHttp(404, { status: 404, error: 'No encontramos esa cita' })));
      componente.cargar();

      expect(componente.cita).toBeNull();
      expect(componente.errorCarga).toBe('No encontramos esa cita');
    });

    it('sin mensaje del backend: texto genérico en español', () => {
      servicio.obtener.mockReturnValue(throwError(() => new Error('x')));
      componente.cargar();
      expect(componente.errorCarga).toBe('No fue posible cargar la cita.');
    });

    it('recargar cancela la consulta anterior', () => {
      const lenta = new Subject<DetalleCita>();
      servicio.obtener.mockReturnValue(lenta);
      componente.cargar();
      expect(lenta.observed).toBe(true);

      servicio.obtener.mockReturnValue(of(cita()));
      componente.cargar();

      expect(lenta.observed).toBe(false);
    });

    it('al destruirse cancela la consulta en curso', () => {
      const lenta = new Subject<DetalleCita>();
      servicio.obtener.mockReturnValue(lenta);
      componente.cargar();

      componente.ngOnDestroy();

      expect(lenta.observed).toBe(false);
    });
  });

  describe('qué se puede hacer según el estado', () => {
    it.each([
      ['PENDIENTE', true],
      ['CONFIRMADA', true],
      ['EN_CAMINO', false],
      ['FINALIZADA', false],
      ['CANCELADA', false],
    ] as const)('en %s, puede modificar: %s', (estado, esperado) => {
      componente.cita = cita(estado);
      expect(componente.puedeModificar).toBe(esperado);
    });

    it('sin cita cargada no puede modificar', () => {
      componente.cita = null;
      expect(componente.puedeModificar).toBe(false);
    });
  });

  describe('diálogos', () => {
    it('abrir limpia el error anterior y muestra el diálogo pedido', () => {
      componente.errorDialogo = 'viejo';
      componente.abrir('cancelar');
      expect(componente.dialogo).toBe('cancelar');
      expect(componente.errorDialogo).toBeNull();
    });

    it('cerrar lo oculta', () => {
      componente.abrir('reprogramar');
      componente.cerrarDialogo();
      expect(componente.dialogo).toBeNull();
    });

    it('no se puede cerrar mientras se envía', () => {
      componente.abrir('cancelar');
      componente.enviando = true;
      componente.cerrarDialogo();
      expect(componente.dialogo).toBe('cancelar');
    });
  });

  describe('cancelar la cita', () => {
    it('envía el motivo, cierra el diálogo, avisa y recarga el detalle', () => {
      componente.abrir('cancelar');
      servicio.obtener.mockClear();

      componente.cancelar('Ya no lo necesito');

      expect(servicio.cancelar).toHaveBeenCalledWith(5, 'Ya no lo necesito');
      expect(componente.dialogo).toBeNull();
      expect(componente.mensajeExito).toBe('Tu cita fue cancelada.');
      expect(servicio.obtener).toHaveBeenCalledTimes(1);
      expect(componente.enviando).toBe(false);
    });

    it('el motivo es opcional', () => {
      componente.cancelar(undefined);
      expect(servicio.cancelar).toHaveBeenCalledWith(5, undefined);
    });

    it('si el backend la rechaza (409), muestra su mensaje en el diálogo y lo deja abierto', () => {
      servicio.cancelar.mockReturnValue(throwError(() => falloHttp(409, { status: 409, error: 'La cita ya está en proceso' })));
      componente.abrir('cancelar');

      componente.cancelar('x');

      expect(componente.errorDialogo).toBe('La cita ya está en proceso');
      expect(componente.dialogo).toBe('cancelar');
      expect(componente.mensajeExito).toBeNull();
      expect(componente.enviando).toBe(false);
    });

    it('sin mensaje del backend: texto genérico', () => {
      servicio.cancelar.mockReturnValue(throwError(() => new Error('x')));
      componente.cancelar('x');
      expect(componente.errorDialogo).toBe('No fue posible cancelar la cita.');
    });
  });

  describe('reprogramar la cita', () => {
    it('envía el nuevo inicio, cierra el diálogo, avisa y recarga', () => {
      componente.abrir('reprogramar');
      servicio.obtener.mockClear();

      componente.reprogramar('2026-11-10T09:00:00');

      expect(servicio.reprogramar).toHaveBeenCalledWith(5, '2026-11-10T09:00:00');
      expect(componente.dialogo).toBeNull();
      expect(componente.mensajeExito).toBe('Tu cita fue reprogramada.');
      expect(servicio.obtener).toHaveBeenCalledTimes(1);
    });

    it('si la hora no está libre (409), muestra el mensaje del backend', () => {
      servicio.reprogramar.mockReturnValue(throwError(() => falloHttp(409, { status: 409, error: 'Esa hora ya no está disponible' })));
      componente.abrir('reprogramar');

      componente.reprogramar('2026-11-10T09:00:00');

      expect(componente.errorDialogo).toBe('Esa hora ya no está disponible');
      expect(componente.dialogo).toBe('reprogramar');
    });

    it('sin mensaje del backend: texto genérico', () => {
      servicio.reprogramar.mockReturnValue(throwError(() => new Error('x')));
      componente.reprogramar('2026-11-10T09:00:00');
      expect(componente.errorDialogo).toBe('No fue posible reprogramar la cita.');
    });

    it('mientras envía, marca que está enviando', () => {
      const pendiente = new Subject<unknown>();
      servicio.reprogramar.mockReturnValue(pendiente);

      componente.reprogramar('2026-11-10T09:00:00');
      expect(componente.enviando).toBe(true);

      pendiente.next({});
      pendiente.complete();
      expect(componente.enviando).toBe(false);
    });
  });
});
