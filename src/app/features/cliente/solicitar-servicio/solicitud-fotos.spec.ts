import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SolicitudServicio } from '../../../core/models/cita';
import { FotoElectrodomesticoService, ResultadoSubidaFotos } from '../../../core/services/foto-electrodomestico.service';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { EspecialidadResponse } from '../../../core/services/tecnico.service';
import { DetalleSolicitudComponent, SolicitudCreada } from './detalle-solicitud/detalle-solicitud.component';
import { SolicitarServicioComponent } from './solicitar-servicio.component';

const SOLICITUD: SolicitudServicio = {
  id: 7,
  tecnicoId: null,
  especialidadId: 1,
  descripcionProblema: 'No centrifuga',
  direccionServicio: 'Calle 6 # 12-34',
  fechaHoraInicio: null,
  fechaHoraFin: null,
  estado: 'PENDIENTE',
};

const ESPECIALIDAD: EspecialidadResponse = { id: 1, nombre: 'Lavadoras', descripcion: '' };
const cdr = { markForCheck: vi.fn() } as unknown as ChangeDetectorRef;

describe('Formulario de solicitud: electrodoméstico y fotos', () => {
  let crearSolicitud: ReturnType<typeof vi.fn>;
  let componente: DetalleSolicitudComponent;
  let creadas: SolicitudCreada[];

  beforeEach(() => {
    crearSolicitud = vi.fn().mockReturnValue(of(SOLICITUD));
    componente = new DetalleSolicitudComponent(new FormBuilder(), { crearSolicitud } as unknown as SolicitudService, cdr);
    componente.especialidad = ESPECIALIDAD;
    creadas = [];
    componente.creada.subscribe((c) => creadas.push(c));
    componente.ngOnInit();
    componente.form.patchValue({ descripcionProblema: 'No centrifuga', direccionServicio: 'Calle 6 # 12-34', latitud: 4.3, longitud: -74.3 });
    componente.puntoMapa = { latitud: 4.3, longitud: -74.3 };
  });

  afterEach(() => componente.ngOnDestroy());

  it('marca, modelo y fotos son opcionales: el formulario es válido sin ellos y la urgencia parte en NORMAL', () => {
    expect(componente.form.get('urgencia')?.value).toBe('NORMAL');
    expect(componente.puedeContinuar).toBe(true);
  });

  it('la solicitud sin marca ni modelo no los envía', () => {
    componente.onSubmit();

    const cuerpo = crearSolicitud.mock.calls[0][0];
    expect(cuerpo).toEqual({
      especialidadId: 1,
      descripcionProblema: 'No centrifuga',
      direccionServicio: 'Calle 6 # 12-34',
      latitud: 4.3,
      longitud: -74.3,
      urgencia: 'NORMAL',
    });
    expect('marcaElectrodomestico' in cuerpo).toBe(false);
    expect('modeloElectrodomestico' in cuerpo).toBe(false);
  });

  it('envía marca, modelo (sin espacios sobrantes) y urgencia', () => {
    componente.form.patchValue({ marcaElectrodomestico: '  Samsung ', modeloElectrodomestico: 'WW90 ', urgencia: 'URGENTE' });

    componente.onSubmit();

    expect(crearSolicitud.mock.calls[0][0]).toMatchObject({
      marcaElectrodomestico: 'Samsung',
      modeloElectrodomestico: 'WW90',
      urgencia: 'URGENTE',
    });
  });

  it('marca y modelo no pueden pasar de 60 caracteres', () => {
    componente.form.patchValue({ marcaElectrodomestico: 'a'.repeat(61) });
    expect(componente.marca?.hasError('maxlength')).toBe(true);
    expect(componente.puedeContinuar).toBe(false);

    componente.form.patchValue({ marcaElectrodomestico: 'a'.repeat(60), modeloElectrodomestico: 'b'.repeat(61) });
    expect(componente.modelo?.hasError('maxlength')).toBe(true);

    componente.form.patchValue({ modeloElectrodomestico: 'b'.repeat(60) });
    expect(componente.puedeContinuar).toBe(true);
  });

  it('las fotos elegidas viajan en el aviso de solicitud creada (se suben cuando la cita ya existe)', () => {
    componente.alCambiarFotos(['data:image/jpeg;base64,A', 'data:image/jpeg;base64,B']);

    componente.onSubmit();

    expect(creadas[0].fotos).toEqual(['data:image/jpeg;base64,A', 'data:image/jpeg;base64,B']);
    expect(creadas[0].solicitud.id).toBe(7);
  });

  it('sin fotos, el aviso trae una lista vacía', () => {
    componente.onSubmit();
    expect(creadas[0].fotos).toEqual([]);
  });

  it('las fotos no se envían con la solicitud: van aparte, tras crear la cita', () => {
    componente.alCambiarFotos(['data:image/jpeg;base64,A']);
    componente.onSubmit();
    expect(JSON.stringify(crearSolicitud.mock.calls[0][0])).not.toContain('base64');
  });

  it('el borrador incluye los campos nuevos y las fotos', () => {
    const borradores: unknown[] = [];
    componente.borradorCambio.subscribe((b) => borradores.push(b));

    componente.form.patchValue({ marcaElectrodomestico: 'LG' });
    componente.alCambiarFotos(['data:image/jpeg;base64,A']);

    expect(borradores.at(-1)).toMatchObject({ marcaElectrodomestico: 'LG', fotos: ['data:image/jpeg;base64,A'] });
  });

  it('al volver al formulario recupera el borrador con sus fotos', () => {
    const otro = new DetalleSolicitudComponent(new FormBuilder(), { crearSolicitud } as unknown as SolicitudService, cdr);
    otro.especialidad = ESPECIALIDAD;
    otro.borrador = {
      descripcionProblema: 'x',
      direccionServicio: 'y',
      latitud: 4.3,
      longitud: -74.3,
      marcaElectrodomestico: 'Whirlpool',
      urgencia: 'URGENTE',
      fotos: ['data:image/jpeg;base64,Z'],
    };

    otro.ngOnInit();

    expect(otro.form.get('marcaElectrodomestico')?.value).toBe('Whirlpool');
    expect(otro.form.get('urgencia')?.value).toBe('URGENTE');
    expect(otro.fotos).toEqual(['data:image/jpeg;base64,Z']);
    otro.ngOnDestroy();
  });

  it('ofrece Normal y Urgente', () => {
    expect(componente.opcionesUrgencia.map((o) => o.label)).toEqual(['Normal', 'Urgente']);
  });
});

describe('SolicitarServicioComponent: subida de fotos tras crear la cita', () => {
  let subirVarias: ReturnType<typeof vi.fn>;
  let flujo: SolicitarServicioComponent;

  const evento = (fotos: string[]): SolicitudCreada => ({ solicitud: SOLICITUD, latitud: 4.3, longitud: -74.3, fotos });
  const resultado = (datos: Partial<ResultadoSubidaFotos>): ResultadoSubidaFotos => ({
    subidas: [],
    fallidas: [],
    mensajeError: null,
    ...datos,
  });

  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    subirVarias = vi.fn().mockReturnValue(of(resultado({ subidas: [{ id: 1, url: '/f/1' }] })));
    flujo = new SolicitarServicioComponent({ subirVarias } as unknown as FotoElectrodomesticoService, cdr);
  });

  afterEach(() => {
    flujo.ngOnDestroy();
    vi.restoreAllMocks();
  });

  it('sube las fotos a la cita recién creada y sigue al paso de horarios', () => {
    flujo.onSolicitudCreada(evento(['A', 'B']));

    expect(subirVarias).toHaveBeenCalledWith(7, ['A', 'B']);
    expect(flujo.paso).toBe('franja');
    expect(flujo.avisoFotos).toBeNull();
    expect(flujo.subiendoFotos).toBe(false);
  });

  it('sin fotos no sube nada', () => {
    flujo.onSolicitudCreada(evento([]));
    expect(subirVarias).not.toHaveBeenCalled();
    expect(flujo.paso).toBe('franja');
  });

  it('mientras sube, lo indica', () => {
    const subida = new Subject<ResultadoSubidaFotos>();
    subirVarias.mockReturnValue(subida);

    flujo.onSolicitudCreada(evento(['A']));
    expect(flujo.subiendoFotos).toBe(true);

    subida.next(resultado({}));
    subida.complete();
    expect(flujo.subiendoFotos).toBe(false);
  });

  it('si una foto falla, la cita queda creada y se avisa con el motivo y cómo seguir', () => {
    subirVarias.mockReturnValue(of(resultado({ fallidas: ['B'], mensajeError: 'La cita ya no admite fotos' })));

    flujo.onSolicitudCreada(evento(['A', 'B']));

    expect(flujo.paso).toBe('franja');
    expect(flujo.solicitud).toEqual(SOLICITUD);
    expect(flujo.fotosPendientes).toEqual(['B']);
    expect(flujo.avisoFotos).toContain('Tu cita quedó creada');
    expect(flujo.avisoFotos).toContain('una foto');
    expect(flujo.avisoFotos).toContain('La cita ya no admite fotos');
    expect(flujo.avisoFotos).toContain('desde Mis citas');
  });

  it('con varias fallidas lo dice en plural', () => {
    subirVarias.mockReturnValue(of(resultado({ fallidas: ['A', 'B'], mensajeError: 'Error' })));
    flujo.onSolicitudCreada(evento(['A', 'B']));
    expect(flujo.avisoFotos).toContain('2 fotos');
  });

  it('reintentar sube solo las que fallaron y limpia el aviso si ahora salen bien', () => {
    subirVarias.mockReturnValueOnce(of(resultado({ fallidas: ['B'], mensajeError: 'Error' })));
    flujo.onSolicitudCreada(evento(['A', 'B']));

    flujo.reintentarFotos();

    expect(subirVarias).toHaveBeenLastCalledWith(7, ['B']);
    expect(flujo.avisoFotos).toBeNull();
    expect(flujo.fotosPendientes).toEqual([]);
  });

  it('si el reintento vuelve a fallar, el aviso se mantiene', () => {
    subirVarias.mockReturnValue(of(resultado({ fallidas: ['B'], mensajeError: 'Error' })));
    flujo.onSolicitudCreada(evento(['B']));

    flujo.reintentarFotos();

    expect(flujo.avisoFotos).not.toBeNull();
    expect(flujo.fotosPendientes).toEqual(['B']);
  });

  it('un error inesperado del servicio no deja al flujo trabado: avisa y deja reintentar', () => {
    subirVarias.mockReturnValue(throwError(() => new Error('boom')));

    flujo.onSolicitudCreada(evento(['A', 'B']));

    expect(flujo.paso).toBe('franja');
    expect(flujo.subiendoFotos).toBe(false);
    expect(flujo.fotosPendientes).toEqual(['A', 'B']);
    expect(flujo.avisoFotos).toContain('2 fotos');
  });

  it('pedir otro servicio reinicia el estado de las fotos', () => {
    subirVarias.mockReturnValue(of(resultado({ fallidas: ['B'], mensajeError: 'Error' })));
    flujo.onSolicitudCreada(evento(['B']));

    flujo.solicitarOtroServicio();

    expect(flujo.avisoFotos).toBeNull();
    expect(flujo.fotosPendientes).toEqual([]);
    expect(flujo.subiendoFotos).toBe(false);
    flujo.reintentarFotos();
    expect(subirVarias).toHaveBeenCalledTimes(1);
  });

  it('al destruirse cancela la subida en curso', () => {
    const subida = new Subject<ResultadoSubidaFotos>();
    subirVarias.mockReturnValue(subida);
    flujo.onSolicitudCreada(evento(['A']));
    expect(subida.observed).toBe(true);

    flujo.ngOnDestroy();

    expect(subida.observed).toBe(false);
  });
});
