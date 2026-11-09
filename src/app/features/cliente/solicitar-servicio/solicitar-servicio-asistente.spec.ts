import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Cita, CrearSolicitudRequest, SolicitudServicio } from '../../../core/models/cita';
import { FranjaDisponible } from '../../../core/models/disponibilidad';
import { BuscadorDirecciones, GeocodificadorInverso } from '../../../core/services/geocodificacion';
import { CitaClienteService } from '../../../core/services/cita-cliente.service';
import { CitaService } from '../../../core/services/cita.service';
import { DisponibilidadService } from '../../../core/services/disponibilidad.service';
import { PagoService } from '../../../core/services/pago.service';
import { PerfilService } from '../../../core/services/perfil.service';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { EspecialidadResponse, TecnicoService } from '../../../core/services/tecnico.service';
import { AvisosPagoService } from '../../../shared/toast/avisos-pago.service';
import { ClienteModule } from '../cliente.module';
import { SolicitarServicioComponent } from './solicitar-servicio.component';

const ESPECIALIDAD: EspecialidadResponse = { id: 1, nombre: 'Lavadoras', descripcion: '' };
const DATOS: CrearSolicitudRequest = {
  especialidadId: 1,
  descripcionProblema: 'No centrifuga',
  direccionServicio: 'Calle 6 # 12-34',
  latitud: 4.3369,
  longitud: -74.3637,
};
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
const FRANJA: FranjaDisponible = { tecnicoId: 3, inicio: '2026-11-04T14:00:00', fin: '2026-11-04T15:00:00', distanciaKm: 2, tecnicoNombre: 'Luis', tecnicoApellido: 'Gómez' };
const CITA = { ...SOLICITUD, tecnicoId: 3, fechaHoraInicio: FRANJA.inicio, fechaHoraFin: FRANJA.fin, estado: 'CONFIRMADA' } as Cita;

describe('SolicitarServicioComponent: asistente por pasos', () => {
  let fixture: ComponentFixture<SolicitarServicioComponent>;
  let flujo: SolicitarServicioComponent;
  const confirmarCita = vi.fn();
  const crearSolicitud = vi.fn();
  const solicitarAgendamientoManual = vi.fn();
  const cancelar = vi.fn();
  const obtenerFranjas = vi.fn();
  const anunciarCitaConfirmada = vi.fn();

  const raiz = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => (raiz().textContent ?? '').replace(/\s+/g, ' ');
  const detectar = async (): Promise<void> => {
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const indicadores = (): HTMLButtonElement[] => Array.from(raiz().querySelectorAll<HTMLButtonElement>('.stepper__segment'));
  const boton = (t: string): HTMLButtonElement => Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes(t))!;
  /** Llega a los horarios como el flujo real: especialidad elegida y detalles ya validados (sin guardar nada). */
  const irAHorarios = async (): Promise<void> => {
    flujo.onEspecialidadSeleccionada(ESPECIALIDAD);
    flujo.onDetallesListos({ datos: DATOS, fotos: [] });
    await detectar();
  };
  const irAConfirmar = async (): Promise<void> => {
    await irAHorarios();
    flujo.onFranjaSeleccionada(FRANJA);
    await detectar();
  };

  beforeEach(async () => {
    confirmarCita.mockReset().mockReturnValue(of(CITA));
    crearSolicitud.mockReset().mockReturnValue(of(SOLICITUD));
    solicitarAgendamientoManual.mockReset().mockReturnValue(of({ ...CITA, estado: 'PENDIENTE', motivoSolicitudEspecial: 'SIN_HORARIOS' }));
    cancelar.mockReset().mockReturnValue(of({}));
    obtenerFranjas.mockReset().mockReturnValue(of({ franjas: [FRANJA], motivoSinFranjas: null }));
    anunciarCitaConfirmada.mockReset();
    await TestBed.configureTestingModule({
      imports: [ClienteModule, RouterModule.forRoot([])],
      providers: [
        { provide: TecnicoService, useValue: { obtenerEspecialidades: () => of([ESPECIALIDAD]) } },
        { provide: DisponibilidadService, useValue: { obtenerFranjas, obtenerTecnicos: () => of([]) } },
        { provide: CitaService, useValue: { confirmarCita, solicitarAgendamientoManual } },
        { provide: SolicitudService, useValue: { crearSolicitud } },
        { provide: CitaClienteService, useValue: { cancelar } },
        { provide: BuscadorDirecciones, useValue: { sugerirDirecciones: () => of([]) } },
        { provide: GeocodificadorInverso, useValue: { buscarPorCoordenadas: () => of(null) } },
        { provide: PagoService, useValue: { cotizarEspecialidad: () => of({ disponible: false }) } },
        { provide: PerfilService, useValue: { obtener: () => of({ telefono: null }) } },
        { provide: AvisosPagoService, useValue: { anunciarCitaConfirmada } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SolicitarServicioComponent);
    flujo = fixture.componentInstance;
    window.scrollTo = vi.fn();
    await detectar();
  });

  describe('mapeo de las secciones a pasos', () => {
    it('muestra el asistente con los cuatro pasos de siempre y el primero activo', () => {
      expect(raiz().querySelector('h1')?.textContent).toContain('Solicitar servicio técnico');
      expect(raiz().querySelector('app-stepper')).not.toBeNull();
      expect(indicadores().map((b) => b.getAttribute('aria-label'))).toEqual(['Paso 1: Especialidad', 'Paso 2: Detalles', 'Paso 3: Horario', 'Paso 4: Confirmar']);
      expect(indicadores()[0].getAttribute('aria-current')).toBe('step');
      expect(raiz().querySelector('app-elegir-especialidad')).not.toBeNull();
    });

    it('cada paso tiene sus propios botones: el asistente no agrega un Continuar que cambie cuándo se llama al backend', () => {
      expect(raiz().querySelector('.stepper__button')).toBeNull();
    });

    it('elegir la especialidad sigue llevando a los detalles', async () => {
      boton('Lavadoras').click();
      expect(flujo.paso).toBe('detalle');
      expect(flujo.especialidad).toEqual(ESPECIALIDAD);
    });
  });

  describe('proporciones', () => {
    it('el encabezado y el asistente forman una sola columna centrada de 960 px como máximo, que ocupa todo el ancho en pantallas pequeñas', () => {
      const columna = raiz().firstElementChild as HTMLElement;
      expect(columna.className).toContain('mx-auto');
      expect(columna.className).toContain('w-full');
      expect(columna.className).toContain('max-w-[960px]');
      expect(columna.contains(raiz().querySelector('h1'))).toBe(true);
      expect(columna.contains(raiz().querySelector('app-stepper'))).toBe(true);
      expect((fixture.nativeElement as HTMLElement).className).toContain('block');
    });

    it('el asistente reserva una altura mínima para que los pasos no cambien de tamaño y ocupa todo el ancho de la columna', () => {
      const estilo = (raiz().querySelector('.stepper') as HTMLElement).style;
      expect(estilo.getPropertyValue('--stepper-content-min')).toBe('min(30rem, 70dvh)');
      expect(estilo.getPropertyValue('--stepper-width')).toBe('100%');
    });

    it('las tarjetas de especialidad van en una cuadrícula de 2 columnas (1 en móvil) con filas de la misma altura y descripción de 2 líneas como máximo', () => {
      const cuadricula = raiz().querySelector('app-elegir-especialidad .grid')!;
      expect(cuadricula.className).toContain('grid-cols-1');
      expect(cuadricula.className).toContain('sm:grid-cols-2');
      expect(cuadricula.className).toContain('auto-rows-fr');
      const tarjeta = cuadricula.querySelector('button')!;
      expect(tarjeta.className).toContain('h-full');
      expect(tarjeta.className).toContain('items-start');
    });

    it('los títulos de cada paso comparten jerarquía (h2 de text-xl) y los botones quedan en los bordes', async () => {
      expect(raiz().querySelector('app-stepper h2')?.className).toContain('text-xl');
      await irAHorarios();
      expect(raiz().querySelector('app-elegir-franja h2')?.className).toContain('text-xl');
      await irAConfirmar();
      expect(raiz().querySelector('app-confirmar-cita h2')?.className).toContain('text-xl');
      expect(boton('Confirmar cita').parentElement?.className).toContain('sm:justify-between');
    });
  });

  describe('nada se guarda hasta el botón final', () => {
    it('al pasar de los detalles a los horarios y a la confirmación no se crea ninguna solicitud ni cita', async () => {
      await irAConfirmar();
      expect(flujo.paso).toBe('confirmar');
      expect(crearSolicitud).not.toHaveBeenCalled();
      expect(confirmarCita).not.toHaveBeenCalled();
      expect(solicitarAgendamientoManual).not.toHaveBeenCalled();
      expect(flujo.solicitud).toBeNull();
    });

    it('las franjas se consultan con los datos del formulario, sin id de solicitud, al llegar al paso', async () => {
      await irAHorarios();
      expect(obtenerFranjas).toHaveBeenCalledTimes(1);
      expect(obtenerFranjas).toHaveBeenCalledWith({ especialidadId: 1, fecha: flujo.fecha, latitud: 4.3369, longitud: -74.3637 });
    });

    it('el horario muestra el resumen de lo descrito, sin número de solicitud ni "pendiente"', async () => {
      await irAHorarios();
      expect(texto()).toContain('Tu solicitud');
      expect(texto()).toContain('No centrifuga');
      expect(texto()).not.toContain('#7');
      expect(texto()).not.toContain('pendiente');
    });
  });

  describe('confirmación', () => {
    it('muestra el resumen de lo elegido: fecha, hora, especialidad, problema, dirección y técnico', async () => {
      await irAConfirmar();
      const t = texto();
      expect(t).toContain('Revisa y confirma tu cita');
      expect(t).toContain('Lavadoras');
      expect(t).toContain('No centrifuga');
      expect(t).toContain('Calle 6 # 12-34');
      expect(t).toContain('Luis Gómez');
      expect(t).toMatch(/2:00\s*p\.\s*m\./);
    });

    it('"Confirmar cita" crea la solicitud y confirma la cita (un solo momento) y muestra la pantalla de cita confirmada', async () => {
      await irAConfirmar();

      boton('Confirmar cita').click();
      await detectar();

      expect(crearSolicitud).toHaveBeenCalledTimes(1);
      expect(crearSolicitud).toHaveBeenCalledWith(DATOS);
      expect(confirmarCita).toHaveBeenCalledWith({ solicitudId: 7, tecnicoId: 3, inicio: FRANJA.inicio, fin: FRANJA.fin });
      expect(anunciarCitaConfirmada).toHaveBeenCalledTimes(1);
      expect(flujo.paso).toBe('confirmada');
      expect(raiz().querySelector('app-cita-confirmada')).not.toBeNull();
      expect(raiz().querySelector('app-stepper')).toBeNull();
      expect(texto()).not.toContain('Solicitar servicio técnico');
    });

    it('un error al enviar muestra el mensaje, se queda en la confirmación y no pierde lo elegido', async () => {
      confirmarCita.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500, error: { error: 'Servicio caído' } })));
      await irAConfirmar();

      boton('Confirmar cita').click();
      await detectar();

      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Servicio caído');
      expect(flujo.paso).toBe('confirmar');
      expect(flujo.franja).toEqual(FRANJA);
      expect(flujo.datos).toEqual(DATOS);
      expect(texto()).toContain('Calle 6 # 12-34');
      expect(boton('Confirmar cita').disabled).toBe(false);
      expect(anunciarCitaConfirmada).not.toHaveBeenCalled();
    });

    it('un error al crear la solicitud (400) se muestra en la confirmación y no confirma nada', async () => {
      crearSolicitud.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { status: 400, error: 'La longitud debe estar en Colombia' } })));
      await irAConfirmar();

      boton('Confirmar cita').click();
      await detectar();

      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('La longitud debe estar en Colombia');
      expect(confirmarCita).not.toHaveBeenCalled();
      expect(flujo.paso).toBe('confirmar');
      expect(flujo.solicitud).toBeNull();
    });

    it('un 409 (el horario se ocupó) vuelve a los horarios con el aviso; la solicitud creada se reutiliza al reintentar, sin duplicarla', async () => {
      confirmarCita.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'La franja ya no está disponible' } })));
      await irAConfirmar();

      boton('Confirmar cita').click();
      await detectar();

      expect(flujo.paso).toBe('franja');
      expect(flujo.avisoFranjas).toBe('La franja ya no está disponible');
      expect(texto()).toContain('La franja ya no está disponible');
      expect(flujo.solicitud).toEqual(SOLICITUD);

      flujo.onFranjaSeleccionada(FRANJA);
      await detectar();
      boton('Confirmar cita').click();
      await detectar();

      expect(crearSolicitud).toHaveBeenCalledTimes(1);
      expect(confirmarCita).toHaveBeenCalledTimes(2);
      expect(flujo.paso).toBe('confirmada');
    });
  });

  describe('navegación con los indicadores (linear)', () => {
    it('no se puede saltar hacia adelante: sin pasos alcanzados todos los indicadores están apagados', () => {
      expect(indicadores().map((b) => b.disabled)).toEqual([true, true, true, true]);
    });

    it('desde los detalles se puede volver a la especialidad, y de ahí volver a los detalles sin elegir otra vez', () => {
      flujo.onEspecialidadSeleccionada(ESPECIALIDAD);
      flujo.onCambioPaso(1);
      expect(flujo.paso).toBe('especialidad');
      flujo.onCambioPaso(2);
      expect(flujo.paso).toBe('detalle');
    });

    it('sin especialidad elegida no se puede pasar a los detalles; saltos hacia adelante se ignoran', () => {
      flujo.onCambioPaso(2);
      expect(flujo.paso).toBe('especialidad');
      flujo.onCambioPaso(4);
      expect(flujo.paso).toBe('especialidad');
      flujo.onCambioPaso(9);
      expect(flujo.paso).toBe('especialidad');
    });

    it('mientras no se haya guardado nada, desde los horarios se puede volver a los detalles y a la especialidad', async () => {
      await irAHorarios();
      expect(indicadores().map((b) => b.disabled)).toEqual([false, false, true, true]);

      indicadores()[1].click();
      await detectar();
      expect(flujo.paso).toBe('detalle');
      expect(raiz().querySelector('app-detalle-solicitud')).not.toBeNull();
    });

    it('desde la confirmación se puede volver a los horarios, a los detalles y a la especialidad', async () => {
      await irAConfirmar();
      expect(indicadores().map((b) => b.disabled)).toEqual([false, false, false, true]);

      indicadores()[2].click();
      await detectar();
      expect(flujo.paso).toBe('franja');
      expect(flujo.franja).toBeNull();
    });

    it('una vez creada la solicitud (intento de confirmar que no terminó) la especialidad y los detalles quedan bloqueados', async () => {
      confirmarCita.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'ocupado' } })));
      await irAConfirmar();
      boton('Confirmar cita').click();
      await detectar();

      expect(flujo.paso).toBe('franja');
      expect(indicadores().map((b) => b.disabled)).toEqual([true, true, true, true]);
      flujo.onCambioPaso(1);
      flujo.onCambioPaso(2);
      expect(flujo.paso).toBe('franja');
    });

    it('tras volver a los horarios no se puede saltar a la confirmación sin elegir horario', async () => {
      await irAConfirmar();
      flujo.volverAFranjas();
      await detectar();
      flujo.onCambioPaso(4);
      expect(flujo.paso).toBe('franja');
    });
  });

  describe('agendamiento manual / solicitud especial', () => {
    it('sin técnicos para la especialidad no permite coordinación manual', async () => {
      obtenerFranjas.mockReturnValue(of({ franjas: [], motivoSinFranjas: 'SIN_TECNICOS_ESPECIALIDAD' }));
      await irAHorarios();

      expect(texto()).toContain('Por ahora no tenemos técnicos para este servicio.');
      expect(texto()).not.toContain('Dejar solicitud');
      expect(crearSolicitud).not.toHaveBeenCalled();
      expect(solicitarAgendamientoManual).not.toHaveBeenCalled();
    });

    it('al pulsar "Solicitar agendamiento manual" se envía y se muestra "Recibimos tu solicitud", fuera del asistente', async () => {
      obtenerFranjas.mockReturnValue(of({ franjas: [], motivoSinFranjas: 'SIN_HORARIOS' }));
      await irAHorarios();

      boton('Solicitar agendamiento manual').click();
      await detectar();

      expect(solicitarAgendamientoManual).toHaveBeenCalledTimes(1);
      expect(solicitarAgendamientoManual).toHaveBeenCalledWith({
        fecha: flujo.fecha,
        especialidadId: 1,
        descripcionProblema: 'No centrifuga',
        direccionServicio: 'Calle 6 # 12-34',
        latitud: 4.3369,
        longitud: -74.3637,
      });
      expect(flujo.paso).toBe('manual');
      expect(flujo.motivoManual).toBe('SIN_HORARIOS');
      expect(raiz().querySelector('app-solicitud-manual-creada')).not.toBeNull();
      expect(texto()).toContain('Recibimos tu solicitud');
      expect(raiz().querySelector('app-stepper')).toBeNull();
      expect(crearSolicitud).not.toHaveBeenCalled();
    });

    it('fuera de cobertura conserva sus opciones y el mismo envío', async () => {
      obtenerFranjas.mockReturnValue(of({ franjas: [], motivoSinFranjas: 'FUERA_DE_COBERTURA' }));
      await irAHorarios();
      expect(texto()).toContain('Tu dirección está fuera de nuestra zona de cobertura automática');

      boton('Solicitar agendamiento manual').click();
      await detectar();
      expect(flujo.paso).toBe('manual');
    });

    it('un error al enviar la solicitud manual se muestra y se queda en los horarios', async () => {
      obtenerFranjas.mockReturnValue(of({ franjas: [], motivoSinFranjas: 'FUERA_DE_COBERTURA' }));
      solicitarAgendamientoManual.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      await irAHorarios();

      boton('Solicitar agendamiento manual').click();
      await detectar();

      expect(texto()).toContain('No pudimos enviar tu solicitud');
      expect(flujo.paso).toBe('franja');
    });

    it('sin horarios en el día ofrece la solicitud manual', async () => {
      obtenerFranjas.mockReturnValue(of({ franjas: [], motivoSinFranjas: 'SIN_HORARIOS' }));
      await irAHorarios();
      expect(texto()).toContain('Dejar solicitud');
    });

    it.each([400, 409])('un %i manual refresca horarios y conserva datos y teléfono', async status => {
      obtenerFranjas.mockReturnValue(of({ franjas: [], motivoSinFranjas: 'SIN_HORARIOS' }));
      await irAHorarios();
      const fecha = raiz().querySelector<HTMLInputElement>('input[type="date"]')!;
      fecha.value = '2099-11-12'; fecha.dispatchEvent(new Event('change')); await detectar();
      const telefono = raiz().querySelector<HTMLInputElement>('#telefono-contacto')!;
      telefono.value = '3001234567'; telefono.dispatchEvent(new Event('input')); await detectar();
      solicitarAgendamientoManual.mockReturnValue(throwError(() => new HttpErrorResponse({ status, error: { detail: 'Consulta los horarios actualizados' } })));
      obtenerFranjas.mockReturnValue(of({ franjas: [FRANJA], motivoSinFranjas: null }));
      boton('Solicitar agendamiento manual').click(); await detectar();
      expect(solicitarAgendamientoManual).toHaveBeenCalledWith({ ...DATOS, fecha: '2099-11-12', telefonoContacto: '3001234567' });
      expect(obtenerFranjas).toHaveBeenLastCalledWith({ especialidadId: 1, fecha: '2099-11-12', latitud: DATOS.latitud, longitud: DATOS.longitud });
      expect(texto()).toContain('Consulta los horarios actualizados'); expect(flujo.paso).toBe('franja'); expect(texto()).toContain(DATOS.descripcionProblema);
      obtenerFranjas.mockReturnValue(of({ franjas: [], motivoSinFranjas: 'SIN_HORARIOS' }));
      const otraFecha = raiz().querySelector<HTMLInputElement>('input[type="date"]')!;
      otraFecha.value = '2099-11-13'; otraFecha.dispatchEvent(new Event('change')); await detectar();
      expect(raiz().querySelector<HTMLInputElement>('#telefono-contacto')?.value).toBe('3001234567');
    });

    it('si el backend marca la solicitud como manual al confirmar, se muestra la pantalla manual sin confirmar cita', async () => {
      crearSolicitud.mockReturnValue(of({ ...SOLICITUD, agendamientoManual: true, motivoSolicitudEspecial: 'FUERA_DE_COBERTURA' }));
      await irAConfirmar();
      boton('Confirmar cita').click();
      await detectar();

      expect(confirmarCita).not.toHaveBeenCalled();
      expect(flujo.paso).toBe('manual');
      expect(flujo.motivoManual).toBe('FUERA_DE_COBERTURA');
    });
  });

  describe('salida con datos sin confirmar', () => {
    const preguntar = (): { respuesta: boolean | undefined } => {
      const estado: { respuesta: boolean | undefined } = { respuesta: undefined };
      (flujo.confirmarSalida() as Observable<boolean>).subscribe((r) => (estado.respuesta = r));
      return estado;
    };

    it('muestra la pregunta de la app y "Cancelar" se queda', async () => {
      await irAHorarios();
      const estado = preguntar();
      await detectar();

      const dialogo = document.body.querySelector('[role="dialog"]');
      expect(dialogo?.textContent).toContain('¿Salir sin terminar?');
      expect(dialogo?.textContent).toContain('Tienes una solicitud sin terminar');

      boton('Cancelar').click();
      await detectar();
      expect(estado.respuesta).toBe(false);
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    });

    it('"Salir" deja salir; con una solicitud ya creada intenta cancelarla', async () => {
      confirmarCita.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'ocupado' } })));
      await irAConfirmar();
      boton('Confirmar cita').click();
      await detectar();

      const estado = preguntar();
      await detectar();
      boton('Salir').click();
      await detectar();

      expect(estado.respuesta).toBe(true);
      expect(cancelar).toHaveBeenCalledWith(7);
    });

    it('sin nada ingresado ni la pantalla final pide confirmar', async () => {
      expect(flujo.confirmarSalida()).toBe(true);
      await irAConfirmar();
      boton('Confirmar cita').click();
      await detectar();
      expect(flujo.confirmarSalida()).toBe(true);
    });
  });

  describe('transición entre pasos', () => {
    let finalizar: (() => void)[];

    beforeEach(() => {
      finalizar = [];
      Object.defineProperty(HTMLElement.prototype, 'animate', {
        configurable: true,
        writable: true,
        value() {
          return {
            cancel: vi.fn(),
            effect: { getTiming: () => ({ duration: 560 }) },
            finished: new Promise<void>((resolver) => finalizar.push(resolver)),
          };
        },
      });
    });

    afterEach(() => delete (HTMLElement.prototype as { animate?: unknown }).animate);

    it('el contenido del paso que sale no desaparece de golpe: se ve hasta que termina la animación', async () => {
      await irAHorarios();
      finalizar.splice(0);
      expect(raiz().querySelector('app-elegir-franja')).not.toBeNull();

      flujo.onFranjaSeleccionada(FRANJA);
      await detectar();

      expect(raiz().querySelector('.stepper__pane--leaving app-elegir-franja')).not.toBeNull();
      expect(raiz().querySelector('.stepper__pane:not(.stepper__pane--leaving) app-confirmar-cita')).not.toBeNull();
      expect(flujo.pasoSaliente).toBe('franja');

      finalizar.forEach((f) => f());
      await detectar();
      await detectar();

      expect(raiz().querySelector('.stepper__pane--leaving')).toBeNull();
      expect(raiz().querySelector('app-elegir-franja')).toBeNull();
      expect(flujo.pasoSaliente).toBeNull();
    });

    it('los detalles (con su mapa) no se recrean al volver a ellos', async () => {
      flujo.onEspecialidadSeleccionada(ESPECIALIDAD);
      await detectar();
      const detalle = raiz().querySelector('app-detalle-solicitud');
      expect(detalle).not.toBeNull();

      flujo.onDetallesListos({ datos: DATOS, fotos: [] });
      await detectar();
      finalizar.forEach((f) => f());
      await detectar();
      flujo.onCambioPaso(2);
      await detectar();

      expect(raiz().querySelector('app-detalle-solicitud')).toBe(detalle);
    });
  });

  it('"solicitar otro servicio" reinicia el flujo con un asistente nuevo en el primer paso', async () => {
    await irAConfirmar();
    boton('Confirmar cita').click();
    await detectar();

    flujo.solicitarOtroServicio();
    await detectar();

    expect(flujo.paso).toBe('especialidad');
    expect(indicadores()[0].getAttribute('aria-current')).toBe('step');
    expect(raiz().querySelector('app-elegir-especialidad')).not.toBeNull();
    expect(raiz().querySelector('app-detalle-solicitud')).toBeNull();
  });
});
