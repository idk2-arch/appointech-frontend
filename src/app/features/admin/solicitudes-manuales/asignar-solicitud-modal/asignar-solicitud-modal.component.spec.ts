import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SolicitudManualAdmin, SolicitudManualAdminService, TecnicoDisponible } from '../../../../core/services/solicitud-manual-admin.service';
import { ToastService } from '../../../../shared/toast/toast.service';
import { AdminModule } from '../../admin.module';
import { AsignarSolicitudModalComponent } from './asignar-solicitud-modal.component';

const SOLICITUD: SolicitudManualAdmin = {
  id: 7,
  clienteId: 3,
  clienteNombre: 'Ana',
  clienteApellido: 'Pérez',
  telefono: '300 123 4567',
  direccionServicio: 'Vereda El Peñón',
  descripcionProblema: 'No enfría',
  especialidadId: 6,
  especialidadNombre: 'Aires acondicionados',
  latitud: 4.3,
  longitud: -74.3,
  creadaEn: '2026-11-01T08:00:00',
  motivo: 'FUERA_DE_COBERTURA',
  estado: 'PENDIENTE',
};

const FREDDY: TecnicoDisponible = { tecnicoId: 11, nombre: 'Freddy', apellido: 'Rojas', telefono: '311 222 3333', fotoUrl: null, distanciaKm: 3.14 };
const LUIS: TecnicoDisponible = { tecnicoId: 12, nombre: 'Luis', apellido: 'Gómez', telefono: null, fotoUrl: null, distanciaKm: null };

describe('AsignarSolicitudModalComponent', () => {
  let fixture: ComponentFixture<AsignarSolicitudModalComponent>;
  let modal: AsignarSolicitudModalComponent;
  let toast: ToastService;
  let asignadas: SolicitudManualAdmin[];
  let desactualizadas: number;
  const tecnicosDisponibles = vi.fn();
  const asignar = vi.fn();

  const raiz = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => (raiz().textContent ?? '').replace(/\s+/g, ' ');
  const boton = (nombre: string): HTMLButtonElement | undefined =>
    Array.from(raiz().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes(nombre));
  const avisos = (): [string, string, string][] => toast.visibles().map((a) => [a.tipo, a.titulo, a.descripcion]);
  const refrescar = (): void => {
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };

  function escribirCampo(id: string, valor: string): void {
    const campo = raiz().querySelector<HTMLInputElement>(`#${id}`)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    refrescar();
  }

  /** Horario válido (mañana, 10:00 a 12:00); "ahora" está fijado en el 1 de noviembre de 2026. */
  function llenarHorario(): void {
    escribirCampo('asignar-inicio', '2026-11-04T10:00');
    escribirCampo('asignar-fin', '2026-11-04T12:00');
  }

  function buscar(): void {
    boton('Buscar técnicos disponibles')!.click();
    refrescar();
  }

  const radios = (): HTMLInputElement[] => Array.from(raiz().querySelectorAll('input[type="radio"]'));

  async function abrir(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [AdminModule],
      providers: [{ provide: SolicitudManualAdminService, useValue: { tecnicosDisponibles, asignar } }],
    }).compileComponents();
    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(AsignarSolicitudModalComponent);
    modal = fixture.componentInstance;
    asignadas = [];
    desactualizadas = 0;
    modal.asignada.subscribe((s) => asignadas.push(s));
    modal.desactualizada.subscribe(() => desactualizadas++);
    fixture.componentRef.setInput('solicitud', SOLICITUD);
    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.useFakeTimers({ now: new Date(2026, 10, 1, 9, 0, 0), toFake: ['Date'] });
    tecnicosDisponibles.mockReset().mockReturnValue(of([FREDDY, LUIS]));
    asignar.mockReset().mockReturnValue(of({ id: 7, estado: 'CONFIRMADA' }));
  });

  afterEach(() => vi.useRealTimers());

  describe('formulario', () => {
    beforeEach(() => abrir());

    it('pide fecha y hora de inicio y de fin, y todavía no muestra técnicos', () => {
      expect(raiz().querySelector('#asignar-inicio')?.getAttribute('type')).toBe('datetime-local');
      expect(raiz().querySelector('#asignar-fin')?.getAttribute('type')).toBe('datetime-local');
      expect(texto()).toContain('Buscar técnicos disponibles');
      expect(radios()).toHaveLength(0);
      expect(texto()).toContain('Ana Pérez · Aires acondicionados');
    });

    it('sin horario no busca y marca los campos', () => {
      buscar();
      expect(tecnicosDisponibles).not.toHaveBeenCalled();
      expect(texto()).toContain('Elige la fecha y hora de inicio.');
      expect(texto()).toContain('Elige la fecha y hora de fin.');
    });

    it('el inicio debe estar en el futuro', () => {
      escribirCampo('asignar-inicio', '2026-11-01T08:00');
      escribirCampo('asignar-fin', '2026-11-01T11:00');
      buscar();
      expect(texto()).toContain('El inicio debe ser en el futuro.');
      expect(tecnicosDisponibles).not.toHaveBeenCalled();
    });

    it('el fin debe ser posterior al inicio', () => {
      escribirCampo('asignar-inicio', '2026-11-04T10:00');
      escribirCampo('asignar-fin', '2026-11-04T10:00');
      buscar();
      expect(texto()).toContain('El fin debe ser posterior al inicio.');

      escribirCampo('asignar-fin', '2026-11-04T09:00');
      expect(texto()).toContain('El fin debe ser posterior al inicio.');
      expect(tecnicosDisponibles).not.toHaveBeenCalled();
    });
  });

  describe('búsqueda de técnicos', () => {
    beforeEach(async () => {
      await abrir();
      llenarHorario();
    });

    it('envía el horario con segundos y lista los técnicos como llegan: más cercano primero', () => {
      buscar();

      expect(tecnicosDisponibles).toHaveBeenCalledWith(7, '2026-11-04T10:00:00', '2026-11-04T12:00:00');
      const items = Array.from(raiz().querySelectorAll('fieldset li')).map((li) => (li.textContent ?? '').replace(/\s+/g, ' ').trim());
      expect(items[0]).toContain('Freddy Rojas');
      expect(items[0]).toContain('3,14 km');
      expect(items[0]).toContain('311 222 3333');
      expect(items[1]).toContain('Luis Gómez');
      expect(items[1]).toContain('Sin ubicación registrada');
    });

    it('el teléfono es un enlace para llamar solo si existe, y el avatar muestra iniciales sin foto', () => {
      buscar();
      const enlaces = Array.from(raiz().querySelectorAll<HTMLAnchorElement>('fieldset a')).map((a) => a.getAttribute('href'));
      expect(enlaces).toEqual(['tel:3112223333']);
      expect(raiz().querySelectorAll('fieldset app-avatar')).toHaveLength(2);
    });

    it('la lista es un grupo de opciones accesible por teclado (radios con leyenda)', () => {
      buscar();
      expect(raiz().querySelector('fieldset legend')?.textContent).toContain('Técnicos disponibles (2)');
      expect(radios().map((r) => r.name)).toEqual(['tecnico-disponible', 'tecnico-disponible']);
      expect(raiz().querySelectorAll('fieldset label')).toHaveLength(2);
    });

    it('mientras busca lo avisa y deshabilita el botón', () => {
      tecnicosDisponibles.mockReturnValue(new Subject<TecnicoDisponible[]>());
      buscar();
      expect(texto()).toContain('Buscando técnicos libres en ese horario…');
      expect(boton('Buscando…')!.disabled).toBe(true);
    });

    it('sin técnicos dice que pruebe otro horario y permite cambiarlo', () => {
      tecnicosDisponibles.mockReturnValue(of([]));
      buscar();
      expect(texto()).toContain('Ningún técnico disponible en ese horario. Prueba otro horario.');

      boton('Cambiar horario')!.click();
      refrescar();
      expect(texto()).not.toContain('Ningún técnico disponible');
      expect(document.activeElement).toBe(raiz().querySelector('#asignar-inicio'));
    });

    it('una respuesta que no es lista se trata como vacía', () => {
      tecnicosDisponibles.mockReturnValue(of(null));
      buscar();
      expect(texto()).toContain('Ningún técnico disponible');
    });

    it('cambiar una fecha invalida la lista mostrada y la selección', () => {
      buscar();
      radios()[0].click();
      refrescar();
      expect(modal.seleccionadoId).toBe(11);

      escribirCampo('asignar-fin', '2026-11-04T13:00');
      expect(modal.tecnicos).toBeNull();
      expect(modal.seleccionadoId).toBeNull();
      expect(radios()).toHaveLength(0);
    });

    it('si falla la búsqueda muestra el mensaje del servidor y un toast de error', () => {
      tecnicosDisponibles.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { timestamp: 'x', status: 400, error: 'La fecha de fin debe ser posterior al inicio.' } })));
      buscar();

      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('La fecha de fin debe ser posterior al inicio.');
      expect(avisos()).toEqual([['error', 'No se pudieron buscar los técnicos', 'La fecha de fin debe ser posterior al inicio.']]);
    });

    it('un 404 en la búsqueda usa el texto de que ya no existe', () => {
      tecnicosDisponibles.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
      buscar();
      expect(modal.errorBusqueda).toContain('No encontramos este registro');
    });

    it('no lanza dos búsquedas a la vez', () => {
      tecnicosDisponibles.mockReturnValue(new Subject<TecnicoDisponible[]>());
      buscar();
      modal.buscar();
      expect(tecnicosDisponibles).toHaveBeenCalledOnce();
    });
  });

  describe('selección, confirmación y asignación', () => {
    beforeEach(async () => {
      await abrir();
      llenarHorario();
      buscar();
    });

    it('elegir un técnico lo deja visiblemente seleccionado', () => {
      radios()[1].click();
      refrescar();

      expect(radios()[1].checked).toBe(true);
      expect(raiz().querySelectorAll('fieldset label')[1].className).toContain('border-[#D98E4A]');
      expect(raiz().querySelectorAll('fieldset label')[0].className).not.toContain('border-[#D98E4A]');
    });

    it('asignar sin elegir pide elegir un técnico', () => {
      modal.alEnviar();
      refrescar();
      expect(texto()).toContain('Elige un técnico de la lista.');
      expect(asignar).not.toHaveBeenCalled();
    });

    it('al elegir y pulsar Asignar pide una confirmación con cliente, servicio, técnico y horario', () => {
      radios()[0].click();
      modal.alEnviar();
      refrescar();

      const resumen = texto();
      for (const esperado of ['Confirma la asignación', 'Ana Pérez', 'Aires acondicionados', 'Freddy Rojas', 'mié, 4 de nov', '10:00', '12:00']) {
        expect(resumen).toContain(esperado);
      }
      expect(boton('Confirmar asignación')).toBeDefined();
      expect(asignar).not.toHaveBeenCalled();
    });

    it('"Volver" regresa a la lista sin perder la selección', () => {
      radios()[0].click();
      modal.alEnviar();
      refrescar();

      boton('Volver')!.click();
      refrescar();
      expect(modal.confirmando).toBe(false);
      expect(radios()[0].checked).toBe(true);
    });

    it('al confirmar llama al PATCH con el técnico y el horario, avisa y emite la solicitud', () => {
      radios()[0].click();
      modal.alEnviar();
      modal.alEnviar();

      expect(asignar).toHaveBeenCalledWith(7, { tecnicoId: 11, fechaHoraInicio: '2026-11-04T10:00:00', fechaHoraFin: '2026-11-04T12:00:00' });
      expect(asignadas).toEqual([SOLICITUD]);
      expect(avisos()).toEqual([['exito', 'Técnico asignado a la solicitud', 'Freddy Rojas atenderá a Ana Pérez.']]);
    });

    it('sin técnico seleccionado confirmar no hace nada', () => {
      modal.confirmar();
      expect(asignar).not.toHaveBeenCalled();
    });

    it('no asigna dos veces mientras espera', () => {
      asignar.mockReturnValue(new Subject());
      radios()[0].click();
      modal.confirmar();
      modal.confirmar();
      expect(asignar).toHaveBeenCalledOnce();
      expect(modal.cargando).toBe(true);
    });

    it('un 409 de horario ocupado muestra el mensaje del servidor dentro del modal, sin cerrar, y vuelve a la lista', () => {
      asignar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { timestamp: 'x', status: 409, error: 'El técnico ya tiene una cita en ese horario.' } })));
      radios()[0].click();
      modal.alEnviar();
      modal.alEnviar();
      refrescar();

      expect(raiz().querySelector('app-modal-formulario [role="alert"]')?.textContent).toContain('El técnico ya tiene una cita en ese horario.');
      expect(avisos()).toEqual([['error', 'No se pudo asignar el técnico', 'El técnico ya tiene una cita en ese horario.']]);
      expect(asignadas).toEqual([]);
      expect(desactualizadas).toBe(0);
      expect(modal.confirmando).toBe(false);
      expect(modal.cargando).toBe(false);
    });

    it('un 409 porque la solicitud ya no está pendiente pide recargar la lista', () => {
      asignar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { timestamp: 'x', status: 409, error: 'La solicitud ya fue asignada.' } })));
      radios()[0].click();
      modal.confirmar();

      expect(desactualizadas).toBe(1);
      expect(modal.errorMensaje).toBe('La solicitud ya fue asignada.');
    });

    it('un 409 sin mensaje usa uno general', () => {
      asignar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
      radios()[0].click();
      modal.confirmar();
      expect(modal.errorMensaje).toContain('el técnico ya no está libre');
    });

    it('un 404 dice que la solicitud o el técnico ya no existe', () => {
      asignar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
      radios()[0].click();
      modal.confirmar();
      expect(modal.errorMensaje).toContain('ya no existe');
    });

    it('un 400 sin mensaje pide revisar las fechas', () => {
      asignar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
      radios()[0].click();
      modal.confirmar();
      expect(modal.errorMensaje).toContain('Revisa las fechas');
    });
  });

  describe('ciclo de vida', () => {
    beforeEach(() => abrir());

    it('al volver a abrirse reinicia todo', () => {
      llenarHorario();
      buscar();
      radios()[0].click();
      modal.errorMensaje = 'viejo';

      fixture.componentRef.setInput('abierto', false);
      fixture.detectChanges();
      fixture.componentRef.setInput('abierto', true);
      fixture.detectChanges();

      expect(modal.tecnicos).toBeNull();
      expect(modal.seleccionadoId).toBeNull();
      expect(modal.errorMensaje).toBeNull();
      expect(modal.inicio.value).toBe('');
    });

    it('si cambian otras entradas o no hay solicitud, no reinicia', () => {
      modal.ngOnChanges({});
      fixture.componentRef.setInput('solicitud', null);
      fixture.componentRef.setInput('abierto', false);
      fixture.detectChanges();
      fixture.componentRef.setInput('abierto', true);
      fixture.detectChanges();
      expect(raiz().querySelector('app-modal-formulario')).toBeNull();
    });

    it('buscar sin solicitud no hace nada', () => {
      modal.solicitud = null;
      modal.buscar();
      expect(tecnicosDisponibles).not.toHaveBeenCalled();
    });

    it('Enter sin haber buscado lanza la búsqueda', () => {
      llenarHorario();
      modal.alEnviar();
      expect(tecnicosDisponibles).toHaveBeenCalledOnce();
    });

    it('cerrar desde el modal avisa al padre', () => {
      const cerrar = vi.fn();
      modal.cerrar.subscribe(cerrar);
      boton('Cancelar')!.click();
      expect(cerrar).toHaveBeenCalledOnce();
    });

    it('al destruirse cancela la búsqueda y la asignación pendientes', () => {
      llenarHorario();
      const lenta = new Subject<TecnicoDisponible[]>();
      tecnicosDisponibles.mockReturnValue(lenta);
      buscar();
      fixture.destroy();
      expect(lenta.observed).toBe(false);
    });
  });
});
