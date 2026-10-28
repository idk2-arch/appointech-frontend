import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Cita, SolicitudServicio } from '../../../core/models/cita';
import { FranjaDisponible } from '../../../core/models/disponibilidad';
import { FotoElectrodomesticoService } from '../../../core/services/foto-electrodomestico.service';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { EspecialidadResponse } from '../../../core/services/tecnico.service';
import { DetalleSolicitudComponent, SolicitudCreada } from './detalle-solicitud/detalle-solicitud.component';
import { SolicitarServicioComponent } from './solicitar-servicio.component';
import '../cliente.module';

const ESPECIALIDAD: EspecialidadResponse = { id: 1, nombre: 'Lavadoras', descripcion: '' };
const SOLICITUD: SolicitudServicio = {
  id: 7,
  tecnicoId: null,
  especialidadId: 1,
  descripcionProblema: 'No centrifuga',
  direccionServicio: 'Calle 6',
  fechaHoraInicio: null,
  fechaHoraFin: null,
  estado: 'PENDIENTE',
};
const FRANJA: FranjaDisponible = { tecnicoId: 3, inicio: '2026-11-04T14:00:00', fin: '2026-11-04T15:00:00', distanciaKm: 2 };
const CITA = { ...SOLICITUD, tecnicoId: 3, fechaHoraInicio: FRANJA.inicio, fechaHoraFin: FRANJA.fin, estado: 'CONFIRMADA' } as Cita;
const cdr = { markForCheck: vi.fn() } as unknown as ChangeDetectorRef;
const falloHttp = (status: number, error?: unknown): HttpErrorResponse => new HttpErrorResponse({ status, error });

describe('DetalleSolicitudComponent: descripción, ubicación y errores', () => {
  let crearSolicitud: ReturnType<typeof vi.fn>;
  let componente: DetalleSolicitudComponent;

  beforeEach(() => {
    crearSolicitud = vi.fn().mockReturnValue(of(SOLICITUD));
    componente = new DetalleSolicitudComponent(new FormBuilder(), { crearSolicitud } as unknown as SolicitudService, cdr);
    componente.especialidad = ESPECIALIDAD;
    componente.ngOnInit();
  });

  afterEach(() => componente.ngOnDestroy());

  describe('descripción por voz', () => {
    it('el primer dictado queda con mayúscula inicial', () => {
      componente.agregarDictado('la lavadora no centrifuga');
      expect(componente.descripcionProblema?.value).toBe('La lavadora no centrifuga');
      expect(componente.descripcionProblema?.touched).toBe(true);
    });

    it('los siguientes se agregan al final, separados por un espacio', () => {
      componente.descripcionProblema?.setValue('Hace ruido  ');
      componente.agregarDictado('y gotea');
      expect(componente.descripcionProblema?.value).toBe('Hace ruido y gotea');
    });
  });

  describe('ubicación', () => {
    it('elegir un lugar guarda dirección y coordenadas y habilita el mapa', () => {
      componente.errorUbicacionServidor = 'viejo';

      componente.onUbicacionCambio({ direccion: 'Carrera 7 # 1-1', latitud: 4.3, longitud: -74.3 });

      expect(componente.direccionServicio?.value).toBe('Carrera 7 # 1-1');
      expect(componente.form.get('latitud')?.value).toBe(4.3);
      expect(componente.puntoMapa).toEqual({ latitud: 4.3, longitud: -74.3 });
      expect(componente.errorUbicacionServidor).toBeNull();
    });

    it('mover el pin (sin dirección nueva) conserva la dirección escrita', () => {
      componente.direccionServicio?.setValue('Mi casa');
      componente.onUbicacionCambio({ direccion: null, latitud: 4.4, longitud: -74.4 });
      expect(componente.direccionServicio?.value).toBe('Mi casa');
      expect(componente.puntoMapa).toEqual({ latitud: 4.4, longitud: -74.4 });
    });

    it('escribir la dirección la guarda y la marca como tocada', () => {
      componente.onDireccionCambio('Calle 9');
      expect(componente.direccionServicio?.value).toBe('Calle 9');
      expect(componente.direccionServicio?.touched).toBe(true);
    });

    it('texto escrito sin lugar elegido: pide elegirlo de la lista', () => {
      componente.onDireccionCambio('Calle 9');
      expect(componente.errorDireccion).toBe('Elige tu dirección de la lista, o usa tu ubicación actual.');
    });

    it('sin texto, o con un lugar ya elegido, no hay error de dirección', () => {
      expect(componente.errorDireccion).toBeNull();
      componente.onUbicacionCambio({ direccion: 'Calle 9', latitud: 4.3, longitud: -74.3 });
      expect(componente.errorDireccion).toBeNull();
    });

    it('un punto fuera de Colombia no deja continuar', () => {
      componente.form.patchValue({ descripcionProblema: 'x', direccionServicio: 'Madrid' });
      componente.puntoMapa = { latitud: 40.4, longitud: -3.7 };
      expect(componente.puntoEnColombia).toBe(false);
      expect(componente.puedeContinuar).toBe(false);
    });

    it('sin punto no deja continuar', () => {
      expect(componente.puntoEnColombia).toBe(false);
    });
  });

  describe('envío', () => {
    beforeEach(() => {
      componente.form.patchValue({ descripcionProblema: ' No centrifuga ', direccionServicio: ' Calle 6 ' });
      componente.onUbicacionCambio({ direccion: null, latitud: 4.3, longitud: -74.3 });
    });

    it('inválido: marca todo y no llama al backend', () => {
      componente.form.patchValue({ descripcionProblema: '' });
      componente.onSubmit();
      expect(crearSolicitud).not.toHaveBeenCalled();
      expect(componente.descripcionProblema?.touched).toBe(true);
    });

    it('envía los textos recortados y las coordenadas como números', () => {
      componente.onSubmit();
      expect(crearSolicitud.mock.calls[0][0]).toMatchObject({
        especialidadId: 1,
        descripcionProblema: 'No centrifuga',
        direccionServicio: 'Calle 6',
        latitud: 4.3,
        longitud: -74.3,
      });
    });

    it('un 400 por coordenadas va junto al mapa', () => {
      crearSolicitud.mockReturnValue(throwError(() => falloHttp(400, { status: 400, error: 'La longitud debe estar en Colombia' })));
      componente.onSubmit();

      expect(componente.errorUbicacionServidor).toBe('La longitud debe estar en Colombia');
      expect(componente.errorMensaje).toBeNull();
      expect(componente.cargando).toBe(false);
    });

    it('un 400 por otro motivo va en el mensaje general', () => {
      crearSolicitud.mockReturnValue(throwError(() => falloHttp(400, { status: 400, error: 'La descripción es muy corta' })));
      componente.onSubmit();

      expect(componente.errorMensaje).toBe('La descripción es muy corta');
      expect(componente.errorUbicacionServidor).toBeNull();
    });

    it('un error sin mensaje: texto genérico en español', () => {
      crearSolicitud.mockReturnValue(throwError(() => falloHttp(500)));
      componente.onSubmit();
      expect(componente.errorMensaje).toBe('No fue posible crear la solicitud. Intenta de nuevo.');
    });

    it('un nuevo intento limpia los errores anteriores', () => {
      componente.errorMensaje = 'viejo';
      componente.errorUbicacionServidor = 'viejo';
      componente.onSubmit();
      expect(componente.errorMensaje).toBeNull();
      expect(componente.errorUbicacionServidor).toBeNull();
    });
  });

  describe('borrador al volver al formulario', () => {
    it('recupera el punto del mapa guardado', () => {
      const otro = new DetalleSolicitudComponent(new FormBuilder(), { crearSolicitud } as unknown as SolicitudService, cdr);
      otro.especialidad = ESPECIALIDAD;
      otro.borrador = { descripcionProblema: 'x', direccionServicio: 'y', latitud: 4.3, longitud: -74.3 };

      otro.ngOnInit();

      expect(otro.puntoMapa).toEqual({ latitud: 4.3, longitud: -74.3 });
      expect(otro.fotos).toEqual([]);
      otro.ngOnDestroy();
    });

    it('un borrador sin coordenadas no inventa un punto', () => {
      const otro = new DetalleSolicitudComponent(new FormBuilder(), { crearSolicitud } as unknown as SolicitudService, cdr);
      otro.especialidad = ESPECIALIDAD;
      otro.borrador = { descripcionProblema: 'x', direccionServicio: 'y', latitud: null, longitud: null };

      otro.ngOnInit();

      expect(otro.puntoMapa).toBeNull();
      otro.ngOnDestroy();
    });

    it('cada cambio del formulario emite el borrador', () => {
      const borradores: unknown[] = [];
      componente.borradorCambio.subscribe((b) => borradores.push(b));
      componente.form.patchValue({ descripcionProblema: 'Hace ruido' });
      expect(borradores.at(-1)).toMatchObject({ descripcionProblema: 'Hace ruido' });
    });
  });
});

describe('SolicitarServicioComponent: navegación entre pasos', () => {
  let flujo: SolicitarServicioComponent;

  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.useFakeTimers({ now: new Date(2026, 9, 27, 12, 0, 0), toFake: ['Date'] });
    flujo = new SolicitarServicioComponent({ subirVarias: vi.fn().mockReturnValue(of({})) } as unknown as FotoElectrodomesticoService, cdr);
  });

  afterEach(() => {
    flujo.ngOnDestroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const evento = (): SolicitudCreada => ({ solicitud: SOLICITUD, latitud: 4.3, longitud: -74.3, fotos: [] });

  it('empieza en la especialidad, en el primer paso', () => {
    expect(flujo.paso).toBe('especialidad');
    expect(flujo.indicePaso).toBe(0);
    expect(flujo.fecha).toBe('2026-10-27');
  });

  it('elegir especialidad pasa a los detalles', () => {
    flujo.onEspecialidadSeleccionada(ESPECIALIDAD);
    expect(flujo.especialidad).toBe(ESPECIALIDAD);
    expect(flujo.paso).toBe('detalle');
    expect(flujo.indicePaso).toBe(1);
  });

  it('al crearse la solicitud pasa a los horarios y ya no se puede editar el borrador', () => {
    flujo.borradorDetalle = { descripcionProblema: 'x', direccionServicio: 'y', latitud: 1, longitud: 2 };
    flujo.onSolicitudCreada(evento());

    expect(flujo.paso).toBe('franja');
    expect(flujo.solicitud).toBe(SOLICITUD);
    expect(flujo.latitud).toBe(4.3);
    expect(flujo.borradorDetalle).toBeNull();
  });

  it('elegir una franja pasa a confirmar y limpia el aviso de franjas', () => {
    flujo.avisoFranjas = 'viejo';
    flujo.onFranjaSeleccionada(FRANJA);

    expect(flujo.franja).toBe(FRANJA);
    expect(flujo.avisoFranjas).toBeNull();
    expect(flujo.paso).toBe('confirmar');
    expect(flujo.indicePaso).toBe(3);
  });

  it('si la franja se ocupó, vuelve a los horarios con el aviso', () => {
    flujo.onFranjaSeleccionada(FRANJA);
    flujo.onFranjaNoDisponible('Ese horario se acaba de ocupar');

    expect(flujo.franja).toBeNull();
    expect(flujo.avisoFranjas).toBe('Ese horario se acaba de ocupar');
    expect(flujo.paso).toBe('franja');
  });

  it('al confirmar la cita muestra la pantalla final (fuera del indicador de pasos)', () => {
    flujo.onCitaConfirmada(CITA);

    expect(flujo.cita).toBe(CITA);
    expect(flujo.paso).toBe('confirmada');
    expect(flujo.indicePaso).toBe(flujo.pasos.length);
  });

  it('volver a la especialidad y volver a los horarios', () => {
    flujo.onEspecialidadSeleccionada(ESPECIALIDAD);
    flujo.volverAEspecialidad();
    expect(flujo.paso).toBe('especialidad');

    flujo.onFranjaSeleccionada(FRANJA);
    flujo.volverAFranjas();
    expect(flujo.paso).toBe('franja');
    expect(flujo.franja).toBeNull();
  });

  it('pedir otro servicio reinicia todo el flujo', () => {
    flujo.onEspecialidadSeleccionada(ESPECIALIDAD);
    flujo.onSolicitudCreada(evento());
    flujo.onFranjaSeleccionada(FRANJA);
    flujo.onCitaConfirmada(CITA);

    flujo.solicitarOtroServicio();

    expect(flujo).toMatchObject({
      paso: 'especialidad',
      especialidad: null,
      solicitud: null,
      latitud: null,
      longitud: null,
      franja: null,
      cita: null,
      avisoFranjas: null,
      fecha: '2026-10-27',
    });
  });

  it('cada cambio de paso sube al inicio de la página', () => {
    flujo.onEspecialidadSeleccionada(ESPECIALIDAD);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
