import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Metricas } from '../../../core/models/metricas';
import { metricasDe, metricasVacias } from '../../../core/models/metricas.mock';
import { MetricasService } from '../../../core/services/metricas.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { AdminModule } from '../admin.module';
import { DashboardAdminComponent } from './dashboard-admin.component';

describe('DashboardAdminComponent', () => {
  let fixture: ComponentFixture<DashboardAdminComponent>;
  let componente: DashboardAdminComponent;
  let toast: ToastService;
  const obtener = vi.fn();

  const raiz = (): HTMLElement => fixture.nativeElement;
  /** El texto visible nodo por nodo, separado por espacios: Angular quita los espacios entre elementos. */
  const texto = (elemento: Element = raiz()): string => {
    const recorrido = document.createTreeWalker(elemento, NodeFilter.SHOW_TEXT);
    const partes: string[] = [];
    for (let nodo = recorrido.nextNode(); nodo; nodo = recorrido.nextNode()) {
      const parte = (nodo.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (parte) partes.push(parte);
    }
    return partes.join(' ');
  };
  const tarjetas = (): HTMLElement[] => Array.from(raiz().querySelectorAll('app-magic-bento-card'));
  const tarjeta = (titulo: string): HTMLElement => tarjetas().find((t) => t.querySelector('h2')?.textContent?.trim() === titulo)!;
  const boton = (nombre: string): HTMLButtonElement =>
    Array.from(raiz().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === nombre)!;
  const refrescar = (): void => {
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };

  async function crear(respuesta: unknown = of(metricasDe())): Promise<void> {
    obtener.mockReset().mockReturnValue(respuesta);
    await TestBed.configureTestingModule({
      imports: [AdminModule],
      providers: [provideRouter([{ path: '**', children: [] }]), { provide: MetricasService, useValue: { obtener } }],
    }).compileComponents();
    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(DashboardAdminComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.useFakeTimers({ now: new Date(2026, 10, 6, 10, 0, 0), toFake: ['Date'] });
  });

  afterEach(() => vi.useRealTimers());

  describe('carga y rango', () => {
    it('al entrar pide los últimos 30 días sin enviar parámetros', async () => {
      await crear();
      expect(obtener).toHaveBeenCalledWith({});
    });

    it('muestra el título, el subtítulo y el rango que devolvió el servidor', async () => {
      await crear();
      expect(texto(raiz().querySelector('h1')!)).toBe('Dashboard');
      expect(texto()).toContain('El estado del negocio de un vistazo');
      expect(texto()).toContain('Del 8 oct 2026 al 6 nov 2026 (30 días)');
    });

    it('ofrece los cinco rangos y marca el elegido', async () => {
      await crear();
      const chips = Array.from(raiz().querySelectorAll<HTMLButtonElement>('[aria-label="Rango de fechas"] button'));
      expect(chips.map((c) => c.textContent?.trim())).toEqual(['Últimos 30 días', 'Este mes', 'Últimos 90 días', 'Este año', 'Personalizado']);
      expect(chips.map((c) => c.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false', 'false']);
    });

    it.each([
      ['Este mes', { desde: '2026-11-01', hasta: '2026-11-06' }],
      ['Últimos 90 días', { desde: '2026-08-09', hasta: '2026-11-06' }],
      ['Este año', { desde: '2026-01-01', hasta: '2026-11-06' }],
    ])('"%s" pide ese rango con sus fechas', async (nombre, rango) => {
      await crear();
      boton(nombre).click();
      fixture.detectChanges();

      expect(obtener).toHaveBeenLastCalledWith(rango);
      expect(boton(nombre).getAttribute('aria-pressed')).toBe('true');
    });

    it('volver a "Últimos 30 días" otra vez no envía parámetros', async () => {
      await crear();
      boton('Este año').click();
      boton('Últimos 30 días').click();
      expect(obtener).toHaveBeenLastCalledWith({});
    });

    it('elegir un rango mientras carga el anterior cancela la consulta vieja', async () => {
      const lenta = new Subject<Metricas>();
      await crear(lenta);
      obtener.mockReturnValue(of(metricasDe()));
      boton('Este mes').click();
      expect(lenta.observed).toBe(false);
    });
  });

  describe('rango personalizado', () => {
    beforeEach(() => crear());

    const llenar = (desde: string, hasta: string): void => {
      boton('Personalizado').click();
      fixture.detectChanges();
      componente.personalizado.setValue({ desde, hasta });
    };

    it('muestra las dos fechas y no consulta hasta que se aplique', () => {
      obtener.mockClear();
      boton('Personalizado').click();
      fixture.detectChanges();

      expect(raiz().querySelector('#dash-desde')).not.toBeNull();
      expect(raiz().querySelector('#dash-hasta')).not.toBeNull();
      expect(obtener).not.toHaveBeenCalled();
    });

    it('con un rango válido consulta con esas fechas', () => {
      llenar('2026-10-01', '2026-10-31');
      obtener.mockClear();
      componente.aplicarPersonalizado();
      expect(obtener).toHaveBeenCalledWith({ desde: '2026-10-01', hasta: '2026-10-31' });
    });

    it('el formulario se envía con el botón Aplicar', () => {
      llenar('2026-10-01', '2026-10-31');
      obtener.mockClear();
      raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
      expect(obtener).toHaveBeenCalledOnce();
    });

    it.each([
      ['', '2026-10-31', 'Elige la fecha inicial y la final.'],
      ['2026-11-02', '2026-11-01', 'La fecha inicial no puede ser posterior a la fecha final.'],
      ['2025-11-05', '2026-11-06', 'El rango no puede superar 366 días.'],
    ])('rechaza %s – %s sin llamar al servidor', (desde, hasta, mensaje) => {
      llenar(desde, hasta);
      obtener.mockClear();
      componente.aplicarPersonalizado();
      refrescar();

      expect(obtener).not.toHaveBeenCalled();
      expect(raiz().querySelector('#dash-error-rango')?.textContent).toContain(mensaje);
      expect(raiz().querySelector('#dash-desde')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('acepta justo 366 días', () => {
      llenar('2025-11-06', '2026-11-06');
      obtener.mockClear();
      componente.aplicarPersonalizado();
      expect(obtener).toHaveBeenCalledOnce();
    });

    it('si el servidor responde 400 explica el motivo bajo el selector y con un toast', () => {
      llenar('2026-10-01', '2026-10-31');
      obtener.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'El rango no puede superar 366 días.' } })));
      componente.aplicarPersonalizado();
      refrescar();

      expect(raiz().querySelector('#dash-error-rango')?.textContent).toContain('El rango no puede superar 366 días.');
      expect(toast.visibles().map((a) => [a.tipo, a.titulo, a.descripcion])).toEqual([
        ['error', 'No se pudieron cargar las métricas', 'El rango no puede superar 366 días.'],
      ]);
    });

    it('cambiar a otro rango rápido borra el error del rango', () => {
      llenar('', '');
      componente.aplicarPersonalizado();
      expect(componente.errorRango).not.toBeNull();
      componente.seleccionar('esteMes');
      expect(componente.errorRango).toBeNull();
    });
  });

  describe('tarjetas con los datos del ejemplo', () => {
    beforeEach(() => crear());

    it('muestra las ocho tarjetas del bento', () => {
      expect(tarjetas()).toHaveLength(8);
      expect(tarjetas().map((t) => t.querySelector('h2')?.textContent?.trim())).toEqual([
        'Citas',
        'Ingresos',
        'Tasa de cancelación',
        'Por cobrar',
        'Especialidades',
        'Calificaciones',
        'Por coordinar',
        'Usuarios activos',
      ]);
    });

    it('Citas: total grande y una fila por estado, con enlace a las citas', () => {
      const citas = tarjeta('Citas');
      expect(texto(citas)).toContain('20');
      const filas = Array.from(citas.querySelectorAll('li')).map((li) => texto(li));
      expect(filas).toEqual(['Pendiente 7', 'Confirmada 5', 'En camino 0', 'En proceso 0', 'Finalizada 7', 'Cancelada 1']);
      expect(citas.querySelector('a')?.getAttribute('href')).toBe('/admin/citas');
    });

    it('Citas: la barra de cada estado es proporcional y de su color', () => {
      const barras = Array.from(tarjeta('Citas').querySelectorAll<HTMLElement>('li .h-full'));
      expect(barras.map((b) => b.style.width)).toEqual(['100%', '71.4%', '0%', '0%', '100%', '14.3%']);
      expect(barras[1].className).toContain('bg-emerald-300');
      expect(barras[5].className).toContain('bg-rose-300');
    });

    it('Ingresos: total en pesos, cantidad de pagos, dos métodos y enlace al historial', () => {
      const ingresos = texto(tarjeta('Ingresos')).replace(/\s/g, ' ');
      expect(ingresos).toContain('$ 585.000');
      expect(ingresos).toContain('4 pagos en el rango');
      expect(ingresos).toContain('Efectivo (2) $ 395.000');
      expect(ingresos).toContain('En línea (2) $ 190.000');
      expect(tarjeta('Ingresos').querySelector('a')?.getAttribute('href')).toBe('/admin/pagos');
    });

    it('Tasa de cancelación: porcentaje con un decimal y un anillo con nombre accesible', () => {
      const tasa = tarjeta('Tasa de cancelación');
      expect(texto(tasa)).toContain('5,0 %');
      expect(tasa.querySelector('svg')?.getAttribute('aria-label')).toBe('Tasa de cancelación: 5,0 %');
      const trazos = tasa.querySelectorAll('circle');
      expect(trazos).toHaveLength(2);
      expect(trazos[1].getAttribute('stroke-dasharray')).toMatch(/^13\.\d+ 250\.\d+$/);
    });

    it('Por cobrar: cantidad y monto de pagos pendientes, marcada como estado actual', () => {
      const cobrar = tarjeta('Por cobrar');
      expect(texto(cobrar).replace(/\s/g, ' ')).toContain('1 pago pendiente $ 300.000');
      expect(texto(cobrar)).toContain('Estado actual');
      expect(texto(cobrar)).toContain('No cambia con el rango de fechas');
      expect(cobrar.querySelector('a')).toBeNull();
    });

    it('Calificaciones: promedio, estrellas, total y el ranking de técnicos', () => {
      const calificaciones = tarjeta('Calificaciones');
      const t = texto(calificaciones);
      expect(t).toContain('5,0');
      expect(t).toContain('1 calificación');
      expect(t).toContain('1. Freddy Monroy 5,0 (1)');
      expect(calificaciones.querySelector('svg')?.getAttribute('aria-label')).toBe('Promedio de 5,0 de 5 estrellas');
      expect(calificaciones.querySelectorAll('svg path')).toHaveLength(5);
    });

    it('Especialidades: una fila por especialidad con su total y finalizadas', () => {
      const t = texto(tarjeta('Especialidades'));
      expect(t).toContain('Aires acondicionados 2 · 0 fin.');
    });

    it('Por coordinar: total y desglose por motivo, con enlace a las solicitudes', () => {
      const coordinar = tarjeta('Por coordinar');
      const t = texto(coordinar);
      expect(t).toContain('0 solicitudes pendientes');
      expect(t).toContain('Fuera de cobertura 0');
      expect(t).toContain('Sin técnicos para la especialidad 0');
      expect(t).toContain('Estado actual');
      expect(coordinar.querySelector('a')?.getAttribute('href')).toBe('/admin/solicitudes-manuales');
    });

    it('Usuarios activos: total y por rol, con enlace a los usuarios', () => {
      const usuarios = tarjeta('Usuarios activos');
      const t = texto(usuarios);
      expect(t).toContain('4');
      expect(t).toContain('Clientes 2');
      expect(t).toContain('Técnicos 1');
      expect(t).toContain('Administradores 1');
      expect(usuarios.querySelector('a')?.getAttribute('href')).toBe('/admin/usuarios');
    });

    it('exactamente las tres tarjetas de estado actual lo dicen, con su pista', () => {
      const actuales = tarjetas().filter((t) => texto(t).includes('Estado actual'));
      expect(actuales.map((t) => t.querySelector('h2')?.textContent?.trim())).toEqual(['Por cobrar', 'Por coordinar', 'Usuarios activos']);
      for (const t of actuales) expect(texto(t)).toContain('No cambia con el rango de fechas');
    });

    it('los enlaces son <a> reales y nada más es focusable', () => {
      const enfocables = Array.from(raiz().querySelectorAll('app-magic-bento a[href], app-magic-bento button, app-magic-bento [tabindex]'));
      expect(enfocables.map((e) => e.getAttribute('href'))).toEqual(['/admin/citas', '/admin/pagos', '/admin/solicitudes-manuales', '/admin/usuarios']);
    });

    it('un solo pago o una sola solicitud usan el singular', async () => {
      TestBed.resetTestingModule();
      const m = metricasDe();
      await crear(
        of({
          ...m,
          ingresos: { ...m.ingresos, cantidadPagos: 1 },
          solicitudesEspeciales: { total: 1, porMotivo: { SIN_TECNICOS_ESPECIALIDAD: 1, FUERA_DE_COBERTURA: 0 } },
        })
      );
      expect(texto(tarjeta('Ingresos'))).toContain('1 pago en el rango');
      expect(texto(tarjeta('Por coordinar'))).toContain('1 solicitud pendiente');
    });
  });

  describe('con ceros y nulos (no es un error)', () => {
    beforeEach(() => crear(of(metricasVacias())));

    it('muestra los ceros y avisa que no hubo actividad', () => {
      expect(raiz().querySelector('[role="alert"]')).toBeNull();
      expect(texto()).toContain('No hubo actividad en este rango de fechas.');
      expect(tarjetas()).toHaveLength(8);
      expect(texto(tarjeta('Citas'))).toContain('0');
      expect(texto(tarjeta('Ingresos')).replace(/\s/g, ' ')).toContain('$ 0');
      expect(texto(tarjeta('Tasa de cancelación'))).toContain('0,0 %');
    });

    it('sin calificaciones dice "Sin calificaciones" y no inventa un ranking', () => {
      const t = texto(tarjeta('Calificaciones'));
      expect(t).toContain('Sin calificaciones');
      expect(t).toContain('0 calificaciones');
      expect(t).toContain('Aún no hay calificaciones por técnico.');
      expect(tarjeta('Calificaciones').querySelector('svg')?.getAttribute('aria-label')).toBe('Sin calificaciones');
    });

    it('las especialidades en cero se ven atenuadas, no se ocultan', () => {
      const fila = tarjeta('Especialidades').querySelector('li')!;
      expect(texto(fila)).toContain('Aires acondicionados 0 · 0 fin.');
      expect(fila.classList.contains('opacity-50')).toBe(true);
    });

    it('sin especialidades lo dice', async () => {
      TestBed.resetTestingModule();
      await crear(of({ ...metricasVacias(), especialidades: [] }));
      expect(texto(tarjeta('Especialidades'))).toContain('Todavía no hay especialidades.');
    });
  });

  describe('estados de la pantalla', () => {
    it('mientras carga muestra un esqueleto con las mismas ocho tarjetas, sin datos ni enlaces', async () => {
      await crear(new Subject<Metricas>());

      expect(raiz().querySelector('[aria-label="Cargando métricas"]')).not.toBeNull();
      expect(tarjetas()).toHaveLength(8);
      expect(raiz().querySelector('app-magic-bento a')).toBeNull();
      expect(raiz().querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(raiz().querySelectorAll('.animate-pulse')).toHaveLength(8);
    });

    it('si falla muestra el detalle, un toast de error y permite reintentar con el mismo rango', async () => {
      await crear(throwError(() => new HttpErrorResponse({ status: 500, error: { detail: 'Base de datos caída.' } })));

      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Base de datos caída.');
      expect(tarjetas()).toHaveLength(0);
      expect(toast.visibles().map((a) => [a.tipo, a.titulo])).toEqual([['error', 'No se pudieron cargar las métricas']]);

      obtener.mockReturnValue(of(metricasDe()));
      boton('Reintentar').click();
      fixture.detectChanges();
      expect(obtener).toHaveBeenLastCalledWith({});
      expect(tarjetas()).toHaveLength(8);
    });

    it('reintentar conserva el rango que se había pedido', async () => {
      await crear();
      obtener.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      boton('Este mes').click();
      refrescar();

      obtener.mockReturnValue(of(metricasDe()));
      boton('Reintentar').click();
      expect(obtener).toHaveBeenLastCalledWith({ desde: '2026-11-01', hasta: '2026-11-06' });
    });

    it('un error sin texto usa el mensaje general', async () => {
      await crear(throwError(() => new Error('x')));
      expect(componente.errorCarga).toBe('No fue posible cargar las métricas.');
    });

    it('al destruirse cancela la consulta pendiente', async () => {
      const respuesta = new Subject<Metricas>();
      await crear(respuesta);
      fixture.destroy();
      expect(respuesta.observed).toBe(false);
    });
  });
});
