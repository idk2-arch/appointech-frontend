import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Observable, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Cita, CrearSolicitudRequest, SolicitudServicio } from '../../../core/models/cita';
import { FranjaDisponible } from '../../../core/models/disponibilidad';
import { AvisosPagoService } from '../../../shared/toast/avisos-pago.service';
import { FotoElectrodomesticoService } from '../../../core/services/foto-electrodomestico.service';
import { CitaClienteService } from '../../../core/services/cita-cliente.service';
import { EspecialidadResponse } from '../../../core/services/tecnico.service';
import { DetalleSolicitudComponent, DetallesListos } from './detalle-solicitud/detalle-solicitud.component';
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
const DATOS: CrearSolicitudRequest = { especialidadId: 1, descripcionProblema: 'No centrifuga', direccionServicio: 'Calle 6', latitud: 4.3, longitud: -74.3 };

const avisos = { anunciarCitaConfirmada: vi.fn() };

describe('DetalleSolicitudComponent: descripción, ubicación y errores', () => {
  let componente: DetalleSolicitudComponent;

  beforeEach(() => {
    componente = new DetalleSolicitudComponent(new FormBuilder());
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

      componente.onUbicacionCambio({ direccion: 'Carrera 7 # 1-1', latitud: 4.3, longitud: -74.3 });

      expect(componente.direccionServicio?.value).toBe('Carrera 7 # 1-1');
      expect(componente.form.get('latitud')?.value).toBe(4.3);
      expect(componente.puntoMapa).toEqual({ latitud: 4.3, longitud: -74.3 });
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
    let listos: DetallesListos[];

    beforeEach(() => {
      listos = [];
      componente.listos.subscribe((l) => listos.push(l));
      componente.form.patchValue({ descripcionProblema: ' No centrifuga ', direccionServicio: ' Calle 6 ' });
      componente.onUbicacionCambio({ direccion: null, latitud: 4.3, longitud: -74.3 });
    });

    it('inválido: marca todo y no entrega nada', () => {
      componente.form.patchValue({ descripcionProblema: '' });
      componente.onSubmit();
      expect(listos).toHaveLength(0);
      expect(componente.descripcionProblema?.touched).toBe(true);
    });

    it('entrega los textos recortados y las coordenadas como números, sin llamar al backend', () => {
      componente.onSubmit();
      expect(listos).toHaveLength(1);
      expect(listos[0].datos).toMatchObject({
        especialidadId: 1,
        descripcionProblema: 'No centrifuga',
        direccionServicio: 'Calle 6',
        latitud: 4.3,
        longitud: -74.3,
      });
      expect(listos[0].fotos).toEqual([]);
    });
  });

  describe('borrador al volver al formulario', () => {
    it('recupera el punto del mapa guardado', () => {
      const otro = new DetalleSolicitudComponent(new FormBuilder());
      otro.especialidad = ESPECIALIDAD;
      otro.borrador = { descripcionProblema: 'x', direccionServicio: 'y', latitud: 4.3, longitud: -74.3 };

      otro.ngOnInit();

      expect(otro.puntoMapa).toEqual({ latitud: 4.3, longitud: -74.3 });
      expect(otro.fotos).toEqual([]);
      otro.ngOnDestroy();
    });

    it('un borrador sin coordenadas no inventa un punto', () => {
      const otro = new DetalleSolicitudComponent(new FormBuilder());
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
  const cancelarCliente = { cancelar: vi.fn() };

  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined).mockClear();
    vi.useFakeTimers({ now: new Date(2026, 9, 27, 12, 0, 0), toFake: ['Date'] });
    flujo = new SolicitarServicioComponent({ subirVarias: vi.fn().mockReturnValue(of({})) } as unknown as FotoElectrodomesticoService, cdr, avisos as unknown as AvisosPagoService, cancelarCliente as unknown as CitaClienteService);
  });

  afterEach(() => {
    flujo.ngOnDestroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const evento = (): DetallesListos => ({ datos: DATOS, fotos: [] });

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

  it('con los detalles listos pasa a los horarios sin guardar nada y conserva el borrador para poder volver', () => {
    flujo.borradorDetalle = { descripcionProblema: 'x', direccionServicio: 'y', latitud: 1, longitud: 2 };
    flujo.onDetallesListos(evento());

    expect(flujo.paso).toBe('franja');
    expect(flujo.datos).toBe(DATOS);
    expect(flujo.solicitud).toBeNull();
    expect(flujo.borradorDetalle).not.toBeNull();
  });

  it('si el backend marca la solicitud (al confirmar) para agendamiento manual, salta a la pantalla del administrador', () => {
    const manual = { ...SOLICITUD, agendamientoManual: true, motivoSolicitudEspecial: 'SIN_TECNICOS_ESPECIALIDAD' } as SolicitudServicio;
    flujo.onDetallesListos(evento());
    flujo.onSolicitudManual(manual);

    expect(flujo.paso).toBe('manual');
    expect(flujo.motivoManual).toBe('SIN_TECNICOS_ESPECIALIDAD');
    expect(flujo.indicePaso).toBe(flujo.pasos.length);
    expect(flujo.solicitud).toBe(manual);
  });

  it('al dejar la solicitud para coordinación manual desde los horarios muestra la pantalla "Recibimos tu solicitud"', () => {
    flujo.onDetallesListos(evento());
    flujo.onManualEnviada({ cita: { ...CITA, motivoSolicitudEspecial: null } as Cita, motivo: 'FUERA_DE_COBERTURA' });

    expect(flujo.paso).toBe('manual');
    expect(flujo.motivoManual).toBe('FUERA_DE_COBERTURA');
  });

  it('el motivo del backend manda sobre el que se vio al consultar horarios, y conserva el motivo sin horarios', () => {
    flujo.onManualEnviada({ cita: { ...CITA, motivoSolicitudEspecial: 'SIN_TECNICOS_ESPECIALIDAD' } as Cita, motivo: 'FUERA_DE_COBERTURA' });
    expect(flujo.motivoManual).toBe('SIN_TECNICOS_ESPECIALIDAD');

    flujo.onManualEnviada({ cita: { ...CITA, motivoSolicitudEspecial: null } as Cita, motivo: 'SIN_HORARIOS' });
    expect(flujo.motivoManual).toBe('SIN_HORARIOS');
  });

  it('la solicitud creada al confirmar se recuerda para reutilizarla si hay que elegir otro horario', () => {
    flujo.onSolicitudCreada(SOLICITUD);
    expect(flujo.solicitud).toBe(SOLICITUD);
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
    avisos.anunciarCitaConfirmada.mockClear();
    flujo.onCitaConfirmada(CITA);

    expect(avisos.anunciarCitaConfirmada).toHaveBeenCalledOnce();
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
    flujo.onDetallesListos(evento());
    flujo.onSolicitudCreada(SOLICITUD);
    flujo.onFranjaSeleccionada(FRANJA);
    flujo.onCitaConfirmada(CITA);

    flujo.solicitarOtroServicio();

    expect(flujo).toMatchObject({
      paso: 'especialidad',
      especialidad: null,
      solicitud: null,
      datos: null,
      detalleMontado: false,
      franjaMostrada: null,
      franja: null,
      cita: null,
      avisoFranjas: null,
      fecha: '2026-10-27',
    });
  });

  it('un cambio de paso con la página desplazada sube al inicio, al instante (sin desplazamiento suave que choque con la animación)', () => {
    Object.defineProperty(window, 'scrollY', { value: 240, configurable: true });
    flujo.onEspecialidadSeleccionada(ESPECIALIDAD);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('con la página ya arriba no hace falta desplazar', () => {
    flujo.onEspecialidadSeleccionada(ESPECIALIDAD);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  describe('salida con datos sin confirmar', () => {
    const borrador = (extra: Partial<NonNullable<SolicitarServicioComponent['borradorDetalle']>> = {}) => ({
      descripcionProblema: '',
      direccionServicio: '',
      latitud: null,
      longitud: null,
      ...extra,
    });
    const preguntar = (alRecibir: (r: boolean) => void): void => {
      (flujo.confirmarSalida() as Observable<boolean>).subscribe(alRecibir);
    };

    beforeEach(() => cancelarCliente.cancelar.mockReset().mockReturnValue(of({})));

    it('sin nada ingresado deja salir sin preguntar, aunque ya se haya elegido la especialidad', () => {
      expect(flujo.haySinTerminar).toBe(false);
      expect(flujo.confirmarSalida()).toBe(true);
      flujo.onEspecialidadSeleccionada(ESPECIALIDAD);
      flujo.borradorDetalle = borrador({ descripcionProblema: '   ', direccionServicio: ' ' });
      expect(flujo.haySinTerminar).toBe(false);
      expect(flujo.mostrarSalida).toBe(false);
    });

    it.each([
      ['una descripción', { descripcionProblema: 'No centrifuga' }],
      ['una dirección', { direccionServicio: 'Calle 6' }],
      ['la marca', { marcaElectrodomestico: 'LG' }],
      ['el modelo', { modeloElectrodomestico: 'WW90' }],
      ['fotos', { fotos: ['A'] }],
      ['una ubicación elegida', { latitud: 4.3, longitud: -74.3 }],
    ])('con %s ingresada hay algo que proteger', (_nombre, extra) => {
      flujo.borradorDetalle = borrador(extra);
      expect(flujo.haySinTerminar).toBe(true);
    });

    it('con detalles listos, un horario elegido o una solicitud creada también hay algo que proteger', () => {
      flujo.onDetallesListos(evento());
      expect(flujo.haySinTerminar).toBe(true);
      flujo.solicitarOtroServicio();
      flujo.onFranjaSeleccionada(FRANJA);
      expect(flujo.haySinTerminar).toBe(true);
      flujo.solicitarOtroServicio();
      flujo.onSolicitudCreada(SOLICITUD);
      expect(flujo.haySinTerminar).toBe(true);
    });

    it('con la cita confirmada o la solicitud entregada a un administrador ya no avisa', () => {
      flujo.onDetallesListos(evento());
      flujo.onCitaConfirmada(CITA);
      expect(flujo.haySinTerminar).toBe(false);
      expect(flujo.confirmarSalida()).toBe(true);

      flujo.solicitarOtroServicio();
      flujo.onDetallesListos(evento());
      flujo.onManualEnviada({ cita: CITA, motivo: 'FUERA_DE_COBERTURA' });
      expect(flujo.haySinTerminar).toBe(false);
    });

    it('con datos sin confirmar pregunta y "Cancelar" (quedarse) no descarta nada', () => {
      flujo.onDetallesListos(evento());
      flujo.onSolicitudCreada(SOLICITUD);
      let respuesta: boolean | undefined;
      preguntar((r) => (respuesta = r));
      expect(flujo.mostrarSalida).toBe(true);

      flujo.quedarse();

      expect(respuesta).toBe(false);
      expect(flujo.mostrarSalida).toBe(false);
      expect(cancelarCliente.cancelar).not.toHaveBeenCalled();
    });

    it('"Salir" deja salir y, si había una solicitud creada sin confirmar, intenta cancelarla', () => {
      flujo.onDetallesListos(evento());
      flujo.onSolicitudCreada(SOLICITUD);
      let respuesta: boolean | undefined;
      preguntar((r) => (respuesta = r));

      flujo.salir();

      expect(respuesta).toBe(true);
      expect(cancelarCliente.cancelar).toHaveBeenCalledWith(7);
    });

    it('"Salir" sin solicitud creada no llama a ningún endpoint, y si cancelar falla igual deja salir', () => {
      flujo.onDetallesListos(evento());
      let respuesta: boolean | undefined;
      preguntar((r) => (respuesta = r));
      flujo.salir();
      expect(respuesta).toBe(true);
      expect(cancelarCliente.cancelar).not.toHaveBeenCalled();

      flujo.onSolicitudCreada(SOLICITUD);
      cancelarCliente.cancelar.mockReturnValue(throwError(() => new Error('x')));
      preguntar((r) => (respuesta = r));
      expect(() => flujo.salir()).not.toThrow();
      expect(respuesta).toBe(true);
    });

    it('una pregunta nueva reemplaza a la anterior y destruir la pantalla no deja la navegación colgada', () => {
      flujo.onDetallesListos(evento());
      const primera: boolean[] = [];
      preguntar((r) => primera.push(r));
      preguntar(() => undefined);
      expect(primera).toEqual([false]);

      const ultima: boolean[] = [];
      preguntar((r) => ultima.push(r));
      flujo.ngOnDestroy();
      expect(ultima).toEqual([true]);
    });

    it('al recargar o cerrar la pestaña con datos sin confirmar el navegador pregunta; sin datos, no', () => {
      const evt = (): BeforeUnloadEvent => ({ preventDefault: vi.fn() }) as unknown as BeforeUnloadEvent;
      const sin = evt();
      flujo.avisarAlCerrar(sin);
      expect(sin.preventDefault).not.toHaveBeenCalled();

      flujo.onDetallesListos(evento());
      const con = evt();
      flujo.avisarAlCerrar(con);
      expect(con.preventDefault).toHaveBeenCalled();
    });
  });

  describe('indicadores del asistente', () => {
    it('antes de guardar nada se puede volver a los detalles y a la especialidad desde los horarios', () => {
      flujo.onEspecialidadSeleccionada(ESPECIALIDAD);
      flujo.onDetallesListos(evento());
      expect(flujo.paso).toBe('franja');

      flujo.onCambioPaso(2);
      expect(flujo.paso).toBe('detalle');
      expect(flujo.franja).toBeNull();
      expect(flujo.datos).toBe(DATOS);

      flujo.onCambioPaso(1);
      expect(flujo.paso).toBe('especialidad');
    });

    it('con una solicitud ya creada, esos pasos quedan bloqueados', () => {
      flujo.onEspecialidadSeleccionada(ESPECIALIDAD);
      flujo.onDetallesListos(evento());
      flujo.onSolicitudCreada(SOLICITUD);
      flujo.onCambioPaso(1);
      flujo.onCambioPaso(2);
      expect(flujo.paso).toBe('franja');
    });

    it('el contenido del paso que sale se conserva hasta que el asistente termina de animar', () => {
      flujo.onEspecialidadSeleccionada(ESPECIALIDAD);
      flujo.onDetallesListos(evento());
      flujo.onFranjaSeleccionada(FRANJA);
      expect(flujo.pasoSaliente).toBe('franja');
      expect(flujo.franjaMostrada).toBe(FRANJA);

      flujo.volverAFranjas();
      expect(flujo.pasoSaliente).toBe('confirmar');
      expect(flujo.franja).toBeNull();
      expect(flujo.franjaMostrada).toBe(FRANJA);

      flujo.onTransicionTerminada();
      expect(flujo.pasoSaliente).toBeNull();
      expect(flujo.franjaMostrada).toBeNull();
    });

    it('los detalles quedan montados una vez visitados (no se recrea el mapa) hasta pedir otro servicio', () => {
      expect(flujo.detalleMontado).toBe(false);
      flujo.onEspecialidadSeleccionada(ESPECIALIDAD);
      flujo.onDetallesListos(evento());
      expect(flujo.detalleMontado).toBe(true);
      flujo.solicitarOtroServicio();
      expect(flujo.detalleMontado).toBe(false);
    });
  });
});
