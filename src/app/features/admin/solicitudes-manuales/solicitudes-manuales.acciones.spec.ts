import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SolicitudManualAdmin, SolicitudManualAdminService } from '../../../core/services/solicitud-manual-admin.service';
import { TecnicoResponse, TecnicoService } from '../../../core/services/tecnico.service';
import { AsignarSolicitudModalComponent } from './asignar-solicitud-modal/asignar-solicitud-modal.component';
import { SolicitudesManualesComponent } from './solicitudes-manuales.component';
import '../admin.module';

const cdr = { markForCheck: vi.fn() } as unknown as ChangeDetectorRef;
const falloHttp = (status: number, error?: unknown): HttpErrorResponse => new HttpErrorResponse({ status, error });

function solicitud(datos: Partial<SolicitudManualAdmin>): SolicitudManualAdmin {
  return {
    id: 1,
    clienteId: 1,
    clienteNombre: 'Ana',
    clienteApellido: 'Pérez',
    telefono: '300 123 4567',
    direccionServicio: 'Vereda El Peñón',
    descripcionProblema: 'La lavadora no centrifuga',
    especialidadId: 1,
    especialidadNombre: 'Lavadoras',
    latitud: 4.3,
    longitud: -74.3,
    creadaEn: '2026-10-27T11:55:00',
    ...datos,
  };
}

const ANA = solicitud({ id: 1 });
const LUIS = solicitud({
  id: 2,
  clienteNombre: 'Luis',
  clienteApellido: 'Gómez',
  telefono: null,
  direccionServicio: 'Calle 6 # 12-34',
  descripcionProblema: 'La nevera no enfría',
  especialidadNombre: 'Neveras',
  creadaEn: '2026-10-25T09:00:00',
});

describe('SolicitudesManualesComponent: lógica de la lista', () => {
  let servicio: { listar: ReturnType<typeof vi.fn> };
  let componente: SolicitudesManualesComponent;

  const crear = (): void => {
    componente = new SolicitudesManualesComponent(servicio as unknown as SolicitudManualAdminService, cdr);
    componente.ngOnInit();
  };

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 9, 27, 12, 0, 0) });
    servicio = { listar: vi.fn().mockReturnValue(of([ANA, LUIS])) };
    crear();
  });

  afterEach(() => {
    componente.ngOnDestroy();
    vi.useRealTimers();
  });

  describe('carga', () => {
    it('al iniciar carga las solicitudes, las más antiguas primero', () => {
      expect(componente.cargando).toBe(false);
      expect(componente.tarjetas.map((t) => t.nombreCliente)).toEqual(['Luis Gómez', 'Ana Pérez']);
    });

    it('si falla muestra el mensaje y deja la lista vacía', () => {
      servicio.listar.mockReturnValue(throwError(() => falloHttp(500, { status: 500, error: 'Servicio no disponible' })));
      componente.cargar();

      expect(componente.errorCarga).toBe('Servicio no disponible');
      expect(componente.solicitudes).toEqual([]);
      expect(componente.tarjetas).toEqual([]);
    });

    it('sin mensaje del backend usa uno genérico en español', () => {
      servicio.listar.mockReturnValue(throwError(() => new Error('x')));
      componente.cargar();
      expect(componente.errorCarga).toBe('No fue posible cargar las solicitudes por coordinar.');
    });

    it('una respuesta que no es lista queda vacía', () => {
      servicio.listar.mockReturnValue(of(null));
      componente.cargar();
      expect(componente.solicitudes).toEqual([]);
    });
  });

  describe('tarjetas', () => {
    it('calculan el tiempo de espera, la urgencia y los enlaces de contacto', () => {
      const [luis, ana] = componente.tarjetas;

      expect(luis.tiempo).toBe('Hace 2 días');
      expect(luis.urgente).toBe(true);
      expect(luis.enlaceLlamar).toBeNull();
      expect(luis.enlaceWhatsapp).toBeNull();

      expect(ana.tiempo).toBe('Hace 5 min');
      expect(ana.urgente).toBe(false);
      expect(ana.enlaceLlamar).toBe('tel:3001234567');
      expect(ana.enlaceWhatsapp).toContain('wa.me');
    });

    it('una descripción de más de 140 caracteres se marca como larga', () => {
      servicio.listar.mockReturnValue(of([solicitud({ descripcionProblema: 'a'.repeat(141) }), solicitud({ id: 3, descripcionProblema: 'a'.repeat(140) })]));
      componente.cargar();
      expect(componente.tarjetas.map((t) => t.esLarga)).toEqual([true, false]);
    });

    it('los tiempos se actualizan solos cada minuto', () => {
      vi.setSystemTime(new Date(2026, 9, 27, 12, 30, 0));
      vi.advanceTimersByTime(60_000);
      expect(componente.tarjetas.find((t) => t.solicitud.id === 1)?.tiempo).toBe('Hace 36 min');
    });
  });

  describe('contador', () => {
    it('singular y plural', () => {
      expect(componente.contador).toBe('2 pendientes');
      servicio.listar.mockReturnValue(of([ANA]));
      componente.cargar();
      expect(componente.contador).toBe('1 pendiente');
    });

    it('con una búsqueda activa indica cuántas se ven del total', () => {
      componente.buscar('nevera');
      expect(componente.contador).toBe('1 de 2 pendientes');
    });
  });

  describe('búsqueda y orden', () => {
    it('busca por cliente, dirección o descripción, sin importar mayúsculas ni tildes', () => {
      componente.buscar('GÓMEZ');
      expect(componente.tarjetas.map((t) => t.solicitud.id)).toEqual([2]);

      componente.buscar('peñon');
      expect(componente.tarjetas.map((t) => t.solicitud.id)).toEqual([1]);

      componente.buscar('centrifuga');
      expect(componente.tarjetas.map((t) => t.solicitud.id)).toEqual([1]);
    });

    it('sin coincidencias no deja ninguna tarjeta y borrar la búsqueda las devuelve', () => {
      componente.buscar('zzz');
      expect(componente.tarjetas).toEqual([]);
      componente.buscar('   ');
      expect(componente.tarjetas).toHaveLength(2);
    });

    it('ordena por antigüedad o por las más recientes', () => {
      componente.cambiarOrden('recientes');
      expect(componente.tarjetas.map((t) => t.solicitud.id)).toEqual([1, 2]);

      componente.cambiarOrden('antiguas');
      expect(componente.tarjetas.map((t) => t.solicitud.id)).toEqual([2, 1]);
    });

    it('un orden desconocido vuelve a las más antiguas', () => {
      componente.cambiarOrden('recientes');
      componente.cambiarOrden('otro');
      expect(componente.orden).toBe('antiguas');
    });
  });

  describe('descripción larga', () => {
    it('se abre y se cierra por tarjeta', () => {
      const tarjeta = componente.tarjetas[0];
      expect(componente.descripcionAbierta(tarjeta)).toBe(false);

      componente.alternarDescripcion(tarjeta);
      expect(componente.descripcionAbierta(tarjeta)).toBe(true);
      expect(componente.descripcionAbierta(componente.tarjetas[1])).toBe(false);

      componente.alternarDescripcion(tarjeta);
      expect(componente.descripcionAbierta(tarjeta)).toBe(false);
    });
  });

  describe('asignar', () => {
    it('abrir el diálogo limpia el aviso de éxito y cerrar lo oculta', () => {
      componente.mensajeExito = 'viejo';
      componente.abrirAsignar(ANA);
      expect(componente.solicitudAsignando).toBe(ANA);
      expect(componente.mensajeExito).toBeNull();

      componente.cerrarAsignar();
      expect(componente.solicitudAsignando).toBeNull();
    });

    it('al asignar: avisa, la tarjeta se desvanece y sale de la lista tras la transición', () => {
      componente.abrirAsignar(ANA);

      componente.onAsignada(ANA);

      expect(componente.solicitudAsignando).toBeNull();
      expect(componente.mensajeExito).toBe('La visita de Ana Pérez quedó agendada.');
      const tarjeta = componente.tarjetas.find((t) => t.solicitud.id === 1)!;
      expect(componente.estaSaliendo(tarjeta)).toBe(true);

      vi.advanceTimersByTime(300);

      expect(componente.tarjetas.map((t) => t.solicitud.id)).toEqual([2]);
      expect(componente.estaSaliendo(tarjeta)).toBe(false);
    });

    it('el aviso de éxito desaparece solo a los 8 segundos', () => {
      componente.onAsignada(ANA);
      vi.advanceTimersByTime(7999);
      expect(componente.mensajeExito).not.toBeNull();
      vi.advanceTimersByTime(2);
      expect(componente.mensajeExito).toBeNull();
    });

    it('dos asignaciones seguidas reinician el temporizador del aviso', () => {
      componente.onAsignada(ANA);
      vi.advanceTimersByTime(5000);
      componente.onAsignada(LUIS);
      vi.advanceTimersByTime(5000);
      expect(componente.mensajeExito).toBe('La visita de Luis Gómez quedó agendada.');
    });
  });

  it('al destruirse detiene el refresco de tiempos', () => {
    componente.ngOnDestroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('AsignarSolicitudModalComponent', () => {
  let tecnicos: { obtenerTecnicos: ReturnType<typeof vi.fn> };
  let solicitudes: { asignar: ReturnType<typeof vi.fn> };
  let modal: AsignarSolicitudModalComponent;
  let asignadas: SolicitudManualAdmin[];

  const tecnico = (id: number, datos: Partial<TecnicoResponse> = {}): TecnicoResponse =>
    ({
      id,
      nombre: `T${id}`,
      apellido: 'Apellido',
      activo: true,
      especialidades: [{ id: 1, nombre: 'Lavadoras', descripcion: '' }],
      ...datos,
    }) as TecnicoResponse;

  const abrir = (s: SolicitudManualAdmin | null = ANA): void => {
    modal.solicitud = s;
    modal.abierto = true;
    modal.ngOnChanges({ abierto: { previousValue: false, currentValue: true, firstChange: false, isFirstChange: () => false } });
  };

  beforeEach(() => {
    tecnicos = { obtenerTecnicos: vi.fn().mockReturnValue(of([tecnico(1), tecnico(2, { activo: false }), tecnico(3, { especialidades: [] }), tecnico(4)])) };
    solicitudes = { asignar: vi.fn().mockReturnValue(of({})) };
    modal = new AsignarSolicitudModalComponent(
      new FormBuilder(),
      tecnicos as unknown as TecnicoService,
      solicitudes as unknown as SolicitudManualAdminService,
      cdr
    );
    asignadas = [];
    modal.asignada.subscribe((s) => asignadas.push(s));
  });

  afterEach(() => modal.ngOnDestroy());

  describe('al abrirse', () => {
    it('ofrece solo técnicos activos con la especialidad de la solicitud', () => {
      abrir();

      expect(modal.tecnicos.map((t) => t.id)).toEqual([1, 4]);
      expect(modal.opcionesTecnicos).toEqual([
        { value: 1, label: 'T1 Apellido' },
        { value: 4, label: 'T4 Apellido' },
      ]);
      expect(modal.cargandoTecnicos).toBe(false);
    });

    it('reinicia el formulario y los errores cada vez', () => {
      abrir();
      modal.form.patchValue({ fecha: '2026-11-01' });
      modal.errorMensaje = 'viejo';

      abrir();

      expect(modal.fecha?.value).toBe('');
      expect(modal.errorMensaje).toBeNull();
    });

    it('si cambia otra entrada, sin abrirse o sin solicitud, no hace nada', () => {
      modal.ngOnChanges({});
      modal.abierto = false;
      modal.ngOnChanges({ abierto: { previousValue: true, currentValue: false, firstChange: false, isFirstChange: () => false } });
      abrir(null);
      expect(tecnicos.obtenerTecnicos).not.toHaveBeenCalled();
    });

    it('sin solicitud no carga técnicos', () => {
      modal.solicitud = null;
      modal.cargarTecnicos();
      expect(tecnicos.obtenerTecnicos).not.toHaveBeenCalled();
    });

    it('una respuesta que no es lista deja la lista vacía', () => {
      tecnicos.obtenerTecnicos.mockReturnValue(of(null));
      abrir();
      expect(modal.tecnicos).toEqual([]);
    });

    it('si falla la carga, muestra el motivo y se puede reintentar', () => {
      tecnicos.obtenerTecnicos.mockReturnValue(throwError(() => falloHttp(500, { status: 500, error: 'Sin conexión con técnicos' })));
      abrir();
      expect(modal.errorTecnicos).toBe('Sin conexión con técnicos');
      expect(modal.cargandoTecnicos).toBe(false);

      tecnicos.obtenerTecnicos.mockReturnValue(of([tecnico(1)]));
      modal.cargarTecnicos();
      expect(modal.errorTecnicos).toBeNull();
      expect(modal.tecnicos).toHaveLength(1);
    });

    it('recargar cancela la carga anterior', () => {
      const lenta = new Subject<TecnicoResponse[]>();
      tecnicos.obtenerTecnicos.mockReturnValue(lenta);
      abrir();
      expect(lenta.observed).toBe(true);

      tecnicos.obtenerTecnicos.mockReturnValue(of([]));
      modal.cargarTecnicos();
      expect(lenta.observed).toBe(false);
    });
  });

  describe('validaciones del formulario', () => {
    beforeEach(() => abrir());

    it('técnico, fecha y horas son obligatorios', () => {
      expect(modal.form.valid).toBe(false);
      expect(modal.tecnicoId?.hasError('required')).toBe(true);
      expect(modal.fecha?.hasError('required')).toBe(true);
      expect(modal.horaInicio?.hasError('required')).toBe(true);
      expect(modal.horaFin?.hasError('required')).toBe(true);
    });

    it('la hora de fin debe ser posterior a la de inicio', () => {
      modal.form.patchValue({ tecnicoId: 1, fecha: '2026-11-04', horaInicio: '10:00', horaFin: '10:00' });
      expect(modal.form.hasError('finAntesDeInicio')).toBe(true);

      modal.form.patchValue({ horaFin: '09:00' });
      expect(modal.form.hasError('finAntesDeInicio')).toBe(true);

      modal.form.patchValue({ horaFin: '11:00' });
      expect(modal.form.valid).toBe(true);
    });
  });

  describe('asignar', () => {
    const llenar = (): void => modal.form.patchValue({ tecnicoId: 1, fecha: '2026-11-04', horaInicio: '10:00', horaFin: '11:30' });

    beforeEach(() => abrir());

    it('sin solicitud no hace nada', () => {
      modal.solicitud = null;
      modal.onSubmit();
      expect(solicitudes.asignar).not.toHaveBeenCalled();
    });

    it('inválido: marca los campos y no llama al backend', () => {
      modal.onSubmit();
      expect(solicitudes.asignar).not.toHaveBeenCalled();
      expect(modal.fecha?.touched).toBe(true);
    });

    it('envía técnico, inicio y fin como hora local sin zona y avisa con la solicitud', () => {
      llenar();
      modal.onSubmit();

      expect(solicitudes.asignar).toHaveBeenCalledWith(1, {
        tecnicoId: 1,
        fechaHoraInicio: '2026-11-04T10:00:00',
        fechaHoraFin: '2026-11-04T11:30:00',
      });
      expect(asignadas).toEqual([ANA]);
      expect(modal.cargando).toBe(false);
    });

    it('409: el técnico ya tiene algo en ese horario', () => {
      solicitudes.asignar.mockReturnValue(throwError(() => falloHttp(409)));
      llenar();
      modal.onSubmit();

      expect(modal.errorMensaje).toContain('ya tiene una cita o un bloqueo');
      expect(asignadas).toEqual([]);
      expect(modal.cargando).toBe(false);
    });

    it('404: la solicitud ya no existe', () => {
      solicitudes.asignar.mockReturnValue(throwError(() => falloHttp(404)));
      llenar();
      modal.onSubmit();
      expect(modal.errorMensaje).toContain('ya no existe o ya fue asignada');
    });

    it('400: revisa técnico, fecha y horario', () => {
      solicitudes.asignar.mockReturnValue(throwError(() => falloHttp(400)));
      llenar();
      modal.onSubmit();
      expect(modal.errorMensaje).toContain('Revisa el técnico, la fecha y el horario');
    });

    it('el mensaje del backend tiene prioridad', () => {
      solicitudes.asignar.mockReturnValue(throwError(() => falloHttp(409, { status: 409, error: 'El técnico está de vacaciones' })));
      llenar();
      modal.onSubmit();
      expect(modal.errorMensaje).toBe('El técnico está de vacaciones');
    });
  });
});
