import { ChangeDetectorRef } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertasAdminService } from '../../../core/services/alertas-admin.service';
import { SolicitudManualAdmin, SolicitudManualAdminService } from '../../../core/services/solicitud-manual-admin.service';
import { TecnicoService } from '../../../core/services/tecnico.service';
import { ToastService } from '../../../shared/toast/toast.service';
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
  let alertas: { obtener: ReturnType<typeof vi.fn> };
  let toast: { error: ReturnType<typeof vi.fn> };
  let componente: SolicitudesManualesComponent;

  const pagina = (filas: SolicitudManualAdmin[], total = filas.length) => of({ filas, total });

  const crear = (): void => {
    componente = new SolicitudesManualesComponent(
      servicio as unknown as SolicitudManualAdminService,
      { obtenerEspecialidades: () => of([]) } as unknown as TecnicoService,
      alertas as unknown as AlertasAdminService,
      toast as unknown as ToastService,
      cdr
    );
    componente.ngOnInit();
  };

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 9, 27, 12, 0, 0) });
    servicio = { listar: vi.fn().mockReturnValue(pagina([ANA, LUIS], 12)) };
    alertas = { obtener: vi.fn().mockReturnValue(of({ total: 0, alertas: [] })) };
    toast = { error: vi.fn() };
    crear();
  });

  afterEach(() => {
    componente.ngOnDestroy();
    vi.useRealTimers();
  });

  describe('carga', () => {
    it('al iniciar carga la primera página, las más antiguas primero, y guarda el total del servidor', () => {
      expect(componente.cargando).toBe(false);
      expect(componente.tarjetas.map((t) => t.nombreCliente)).toEqual(['Luis Gómez', 'Ana Pérez']);
      expect(componente.total).toBe(12);
    });

    it('si falla muestra el mensaje y un toast, y deja la lista vacía', () => {
      servicio.listar.mockReturnValue(throwError(() => falloHttp(500, { status: 500, error: 'Servicio no disponible' })));
      componente.cargar();

      expect(componente.errorCarga).toBe('Servicio no disponible');
      expect(componente.solicitudes).toEqual([]);
      expect(componente.total).toBe(0);
      expect(toast.error).toHaveBeenCalledWith('No se pudieron cargar las solicitudes', 'Servicio no disponible');
    });

    it('sin mensaje del backend usa uno genérico en español', () => {
      servicio.listar.mockReturnValue(throwError(() => new Error('x')));
      componente.cargar();
      expect(componente.errorCarga).toBe('No fue posible cargar las solicitudes por coordinar.');
    });

    it('recargar vuelve a pedir la página', () => {
      servicio.listar.mockReturnValue(pagina([ANA]));
      componente.cargar();
      expect(servicio.listar).toHaveBeenCalledTimes(2);
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
      servicio.listar.mockReturnValue(pagina([solicitud({ descripcionProblema: 'a'.repeat(141) }), solicitud({ id: 3, descripcionProblema: 'a'.repeat(140) })]));
      componente.cargar();
      expect(componente.tarjetas.map((t) => t.esLarga)).toEqual([true, false]);
    });

    it('solo las pendientes (o sin estado) son asignables', () => {
      servicio.listar.mockReturnValue(
        pagina([solicitud({ id: 1, estado: 'PENDIENTE' }), solicitud({ id: 2, estado: 'CONFIRMADA' }), solicitud({ id: 3, estado: undefined })])
      );
      componente.cargar();
      expect(componente.tarjetas.map((t) => [t.solicitud.id, t.asignable])).toEqual([
        [1, true],
        [2, false],
        [3, true],
      ]);
    });

    it('los tiempos se actualizan solos cada minuto', () => {
      vi.setSystemTime(new Date(2026, 9, 27, 12, 30, 0));
      vi.advanceTimersByTime(60_000);
      expect(componente.tarjetas.find((t) => t.solicitud.id === 1)?.tiempo).toBe('Hace 36 min');
    });
  });

  describe('coincidencias de la búsqueda', () => {
    it('dice cuántas de la página coinciden', () => {
      componente.buscar('nevera');
      expect(componente.coincidencias).toBe('1 de 2 en esta página');
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

    it('al asignar: avisa, la tarjeta se desvanece, sale tras la transición y baja el total', () => {
      componente.abrirAsignar(ANA);
      componente.onAsignada(ANA);

      expect(componente.solicitudAsignando).toBeNull();
      expect(componente.mensajeExito).toBe('La visita de Ana Pérez quedó agendada.');
      expect(alertas.obtener).toHaveBeenCalledOnce();
      const tarjeta = componente.tarjetas.find((t) => t.solicitud.id === 1)!;
      expect(componente.estaSaliendo(tarjeta)).toBe(true);

      vi.advanceTimersByTime(300);

      expect(componente.tarjetas.map((t) => t.solicitud.id)).toEqual([2]);
      expect(componente.estaSaliendo(tarjeta)).toBe(false);
      expect(componente.total).toBe(11);
    });

    it('el total nunca baja de cero', () => {
      servicio.listar.mockReturnValue(pagina([ANA], 0));
      componente.cargar();
      componente.onAsignada(ANA);
      vi.advanceTimersByTime(300);
      expect(componente.total).toBe(0);
    });

    it('si asignó la última de una página que no es la primera, vuelve a la anterior', () => {
      servicio.listar.mockReturnValue(pagina([ANA], 11));
      componente.irAPagina(1);
      servicio.listar.mockClear();
      servicio.listar.mockReturnValue(pagina([LUIS], 10));

      componente.onAsignada(ANA);
      vi.advanceTimersByTime(300);

      expect(servicio.listar).toHaveBeenCalledWith(expect.objectContaining({ page: 0 }));
      expect(componente.pagina).toBe(0);
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

  it('al destruirse detiene el refresco de tiempos y cancela lo pendiente', () => {
    componente.ngOnDestroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
