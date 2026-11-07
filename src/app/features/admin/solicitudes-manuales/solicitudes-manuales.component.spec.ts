import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertasAdminService } from '../../../core/services/alertas-admin.service';
import { SolicitudManualAdmin, SolicitudManualAdminService } from '../../../core/services/solicitud-manual-admin.service';
import { TecnicoService } from '../../../core/services/tecnico.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { AdminModule } from '../admin.module';
import { SolicitudesManualesComponent } from './solicitudes-manuales.component';

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
    motivo: 'FUERA_DE_COBERTURA',
    estado: 'PENDIENTE',
    ...datos,
  };
}

const ANA = solicitud({ id: 1, creadaEn: '2026-10-27T11:55:00' });
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

describe('SolicitudesManualesComponent', () => {
  let fixture: ComponentFixture<SolicitudesManualesComponent>;
  let toast: ToastService;
  const listar = vi.fn();
  const asignar = vi.fn();
  const obtenerAlertas = vi.fn();
  const obtenerEspecialidades = vi.fn();

  const pagina = (filas: SolicitudManualAdmin[], total = filas.length) => of({ filas, total });

  const ESPECIALIDADES = [{ id: 1, nombre: 'Lavadoras' }, { id: 6, nombre: 'Aires acondicionados' }];

  async function crear(respuesta: unknown, especialidades: unknown = of(ESPECIALIDADES)): Promise<void> {
    listar.mockReset().mockReturnValue(respuesta);
    asignar.mockReset();
    obtenerAlertas.mockReset().mockReturnValue(of({ total: 0, alertas: [] }));
    obtenerEspecialidades.mockReset().mockReturnValue(especialidades);
    await TestBed.configureTestingModule({
      imports: [AdminModule, RouterModule.forRoot([])],
      providers: [
        { provide: SolicitudManualAdminService, useValue: { listar, asignar, tecnicosDisponibles: vi.fn() } },
        { provide: TecnicoService, useValue: { obtenerEspecialidades } },
        { provide: AlertasAdminService, useValue: { obtener: obtenerAlertas } },
      ],
    }).compileComponents();

    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(SolicitudesManualesComponent);
    fixture.detectChanges();
  }

  const raiz = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => (raiz().textContent ?? '').replace(/\s+/g, ' ');
  const nombres = (): string[] => Array.from(raiz().querySelectorAll('li h2')).map((h) => h.textContent?.trim() ?? '');
  const boton = (nombre: string): HTMLButtonElement | undefined =>
    Array.from(raiz().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes(nombre));

  /** Sin zona, un cambio hecho directo en el componente (no por un evento) debe marcarse a mano. */
  const refrescar = (): void => {
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.useFakeTimers({ now: new Date(2026, 9, 27, 12, 0, 0) });
  });

  afterEach(() => vi.useRealTimers());

  it('muestra una tarjeta por solicitud con su tiempo, las más antiguas primero', async () => {
    await crear(pagina([ANA, LUIS]));

    expect(nombres()).toEqual(['Luis Gómez', 'Ana Pérez']);
    expect(texto()).toContain('Hace 5 min');
    expect(texto()).toContain('Hace 2 días');
  });

  it('el subtítulo explica los dos motivos de coordinación manual', async () => {
    await crear(pagina([ANA]));
    expect(texto()).toContain('Solicitudes que requieren coordinación manual: dirección fuera de cobertura o sin técnicos para la especialidad.');
    expect(texto()).not.toContain('Clientes cuya dirección quedó fuera');
  });

  it('muestra la barra de filtros con motivo, especialidad y estado Pendiente por defecto', async () => {
    await crear(pagina([ANA]));

    for (const etiqueta of ['Motivo', 'Especialidad', 'Estado']) expect(texto()).toContain(etiqueta);
    expect(listar).toHaveBeenCalledWith({ motivo: '', especialidadId: null, estado: 'PENDIENTE', page: 0, size: 10 });
    expect(fixture.componentInstance.opcionesEspecialidad.map((o) => o.label)).toEqual(['Todas', 'Lavadoras', 'Aires acondicionados']);
  });

  it('cada filtro viaja al servidor y vuelve a la primera página', async () => {
    await crear(pagina([ANA], 25));
    const componente = fixture.componentInstance;
    componente.irAPagina(2);

    componente.cambiarMotivo('SIN_TECNICOS_ESPECIALIDAD');
    expect(listar).toHaveBeenLastCalledWith({ motivo: 'SIN_TECNICOS_ESPECIALIDAD', especialidadId: null, estado: 'PENDIENTE', page: 0, size: 10 });

    componente.irAPagina(1);
    componente.cambiarEspecialidad('6');
    expect(listar).toHaveBeenLastCalledWith({ motivo: 'SIN_TECNICOS_ESPECIALIDAD', especialidadId: 6, estado: 'PENDIENTE', page: 0, size: 10 });

    componente.cambiarEstado('CONFIRMADA');
    expect(listar).toHaveBeenLastCalledWith({ motivo: 'SIN_TECNICOS_ESPECIALIDAD', especialidadId: 6, estado: 'CONFIRMADA', page: 0, size: 10 });
    expect(componente.pagina).toBe(0);
  });

  it('un valor de filtro desconocido vuelve a "Todos" o a Pendiente', async () => {
    await crear(pagina([ANA]));
    const componente = fixture.componentInstance;
    componente.cambiarMotivo('otro');
    componente.cambiarEstado('otro');
    componente.cambiarEspecialidad(null as unknown as string);
    expect([componente.motivo, componente.estado, componente.especialidad]).toEqual(['', 'PENDIENTE', '']);
  });

  it('no ofrece "Todos los estados": solo un estado a la vez', async () => {
    await crear(pagina([ANA]));
    expect(fixture.componentInstance.opcionesEstado.map((o) => o.label)).toEqual(['Pendiente', 'Confirmada', 'En camino', 'En proceso', 'Finalizada', 'Cancelada']);
  });

  it('si no cargan las especialidades lo avisa y permite reintentar', async () => {
    await crear(pagina([ANA]), throwError(() => new HttpErrorResponse({ status: 500 })));
    refrescar();
    expect(texto()).toContain('No pudimos cargar las especialidades.');

    obtenerEspecialidades.mockReturnValue(of([{ id: 3, nombre: 'Neveras' }]));
    boton('Reintentar')!.click();
    fixture.detectChanges();
    expect(texto()).not.toContain('No pudimos cargar las especialidades.');
    expect(fixture.componentInstance.opcionesEspecialidad.map((o) => o.label)).toEqual(['Todas', 'Neveras']);
  });

  it('una respuesta de especialidades que no es lista deja solo "Todas"', async () => {
    await crear(pagina([ANA]), of(null));
    expect(fixture.componentInstance.opcionesEspecialidad.map((o) => o.label)).toEqual(['Todas']);
  });

  describe('paginación', () => {
    it('indica el rango y el total del encabezado X-Total-Count', async () => {
      await crear(pagina([ANA, LUIS], 23));

      expect(texto()).toContain('Mostrando 1–2 de 23 solicitudes');
      expect(fixture.componentInstance.total).toBe(23);
    });

    it('Siguiente pide la página 1 y Anterior vuelve a la 0', async () => {
      await crear(pagina(Array.from({ length: 10 }, (_, i) => solicitud({ id: i + 1 })), 23));

      boton('Siguiente')!.click();
      fixture.detectChanges();
      expect(listar).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, size: 10 }));
      expect(texto()).toContain('Mostrando 11–20 de 23');

      boton('Anterior')!.click();
      fixture.detectChanges();
      expect(listar).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0 }));
    });

    it('deshabilita Anterior en la primera página y Siguiente en la última', async () => {
      await crear(pagina([ANA, LUIS], 2));
      expect(boton('Anterior')!.disabled).toBe(true);
      expect(boton('Siguiente')!.disabled).toBe(true);
    });

    it('irAPagina ignora la página actual y las negativas', async () => {
      await crear(pagina([ANA], 40));
      listar.mockClear();
      fixture.componentInstance.irAPagina(0);
      fixture.componentInstance.irAPagina(-1);
      expect(listar).not.toHaveBeenCalled();
    });

    it('si la página quedó fuera de rango vuelve a la última que existe', async () => {
      await crear(pagina([ANA], 25));
      const componente = fixture.componentInstance;
      componente.pagina = 5;
      listar.mockReturnValueOnce(pagina([], 25)).mockReturnValue(pagina([ANA], 25));
      componente.cargar();
      expect(listar).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
      expect(componente.pagina).toBe(2);
    });
  });

  describe('estados de la pantalla', () => {
    it('muestra esqueletos mientras carga', async () => {
      await crear(new Subject());
      expect(raiz().querySelector('[aria-label="Cargando solicitudes"]')).not.toBeNull();
    });

    it('sin solicitudes dice que no hay con estos filtros', async () => {
      await crear(pagina([], 0));
      expect(texto()).toContain('No hay solicitudes con estos filtros');
      expect(raiz().querySelectorAll('li')).toHaveLength(0);
    });

    it('si falla muestra el detalle, un toast de error y permite reintentar', async () => {
      await crear(throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'size debe estar entre 1 y 100' } })));

      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('size debe estar entre 1 y 100');
      expect(toast.visibles().map((a) => [a.tipo, a.titulo, a.descripcion])).toEqual([
        ['error', 'No se pudieron cargar las solicitudes', 'size debe estar entre 1 y 100'],
      ]);

      listar.mockReturnValue(pagina([ANA]));
      boton('Reintentar')!.click();
      fixture.detectChanges();
      expect(nombres()).toEqual(['Ana Pérez']);
    });
  });

  describe('tarjetas', () => {
    it('muestra la insignia del motivo y, si no está pendiente, la del estado', async () => {
      await crear(pagina([solicitud({ id: 1, estado: 'PENDIENTE' }), solicitud({ id: 2, clienteNombre: 'Luis', estado: 'CONFIRMADA', motivo: 'SIN_TECNICOS_ESPECIALIDAD' })]));

      const [pendiente, confirmada] = Array.from(raiz().querySelectorAll('li'));
      expect(pendiente.textContent).toContain('Fuera de cobertura');
      expect(pendiente.querySelector('app-insignia-estado')).toBeNull();
      expect(confirmada.textContent).toContain('Sin técnicos para la especialidad');
      expect(confirmada.querySelector('app-insignia-estado')?.textContent).toContain('Confirmada');
    });

    it('solo las pendientes se pueden asignar; Llamar, WhatsApp y Ver detalle se conservan en todas', async () => {
      await crear(pagina([solicitud({ id: 1 }), solicitud({ id: 2, estado: 'FINALIZADA' })]));

      const [pendiente, finalizada] = Array.from(raiz().querySelectorAll('li'));
      expect(pendiente.textContent).toContain('Asignar técnico');
      expect(finalizada.textContent).not.toContain('Asignar técnico');
      for (const tarjeta of [pendiente, finalizada]) {
        const enlaces = Array.from(tarjeta.querySelectorAll('a')).map((a) => a.textContent?.replace(/\s+/g, ' ').trim());
        expect(enlaces).toEqual(['Llamar', 'WhatsApp', 'Ver detalle']);
      }
    });

    it('una fila sin estado se trata como pendiente', async () => {
      await crear(pagina([solicitud({ estado: undefined })]));
      expect(texto()).toContain('Asignar técnico');
    });

    it('resalta la que espera más de 24 horas', async () => {
      await crear(pagina([ANA, LUIS]));
      expect(texto().match(/Espera hace más de 1 día/g)).toHaveLength(1);
    });

    it('ofrece Llamar y WhatsApp solo si hay teléfono', async () => {
      await crear(pagina([ANA, LUIS]));
      const enlaces = Array.from(raiz().querySelectorAll<HTMLAnchorElement>('li a')).map((a) => a.getAttribute('href'));
      expect(enlaces.filter((h) => h?.startsWith('tel:'))).toEqual(['tel:3001234567']);
      expect(enlaces.filter((h) => h?.startsWith('https://wa.me/573001234567?text='))).toHaveLength(1);
    });
  });

  describe('búsqueda y orden sobre la página cargada', () => {
    it('busca por cliente, dirección o descripción sin importar tildes y dice cuántas coinciden', async () => {
      await crear(pagina([ANA, LUIS]));
      const componente = fixture.componentInstance;

      componente.buscar('gomez');
      refrescar();
      expect(nombres()).toEqual(['Luis Gómez']);
      expect(texto()).toContain('1 de 2 en esta página');

      componente.buscar('peñón');
      refrescar();
      expect(nombres()).toEqual(['Ana Pérez']);

      componente.buscar('zzz');
      refrescar();
      expect(texto()).toContain('No encontramos solicitudes con ese texto');
    });

    it('no vuelve a pedir nada al servidor al buscar ni al ordenar', async () => {
      await crear(pagina([ANA, LUIS]));
      listar.mockClear();
      fixture.componentInstance.buscar('ana');
      fixture.componentInstance.cambiarOrden('recientes');
      expect(listar).not.toHaveBeenCalled();
    });

    it('ordena por antigüedad y cambia el orden', async () => {
      await crear(pagina([ANA, LUIS]));
      expect(nombres()).toEqual(['Luis Gómez', 'Ana Pérez']);

      fixture.componentInstance.cambiarOrden('recientes');
      refrescar();
      expect(nombres()).toEqual(['Ana Pérez', 'Luis Gómez']);
    });
  });

  describe('asignar', () => {
    it('"Asignar técnico" abre el modal de la solicitud', async () => {
      await crear(pagina([ANA]));
      boton('Asignar técnico')!.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.solicitudAsignando?.id).toBe(1);
      expect(raiz().querySelector('app-asignar-solicitud-modal')?.textContent).toContain('Asignar técnico');
    });

    it('al asignar: la tarjeta se desvanece y sale, baja el total y se actualiza el indicador del menú', async () => {
      await crear(pagina([ANA, LUIS], 2));
      const componente = fixture.componentInstance;

      componente.onAsignada(ANA);
      refrescar();
      expect(nombres()).toContain('Ana Pérez');
      expect(texto()).toContain('quedó agendada');
      expect(obtenerAlertas).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(400);
      refrescar();
      expect(nombres()).toEqual(['Luis Gómez']);
      expect(componente.total).toBe(1);
    });

    it('si falla actualizar el indicador no molesta a quien asigna', async () => {
      await crear(pagina([ANA], 1));
      obtenerAlertas.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      expect(() => fixture.componentInstance.onAsignada(ANA)).not.toThrow();
    });

    it('si la solicitud ya no estaba pendiente el modal pide recargar la lista', async () => {
      await crear(pagina([ANA]));
      listar.mockClear();
      boton('Asignar técnico')!.click();
      fixture.detectChanges();

      fixture.debugElement.query((e) => e.name === 'app-asignar-solicitud-modal').componentInstance.desactualizada.emit();
      expect(listar).toHaveBeenCalledOnce();
    });
  });
  it('el encabezado y la lista entran con la animación de aparecer', async () => {
    await crear(pagina([ANA]));
    expect(raiz().querySelector('[appaparecer="simple"] h1')).not.toBeNull();
    expect(raiz().querySelector('ul[appaparecer="lista"]')).not.toBeNull();
  });

});
