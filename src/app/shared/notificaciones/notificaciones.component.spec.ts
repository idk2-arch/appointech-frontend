import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Notificacion } from '../../core/models/notificacion';
import type { PaginaServidor } from '../../core/models/pagina-servidor';
import { AuthService } from '../../core/services/auth.service';
import { ConteoNotificacionesService } from '../../core/services/conteo-notificaciones.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { SharedModule } from '../shared.module';
import { ToastService } from '../toast/toast.service';
import { NOTIFICACIONES_POR_PAGINA, NotificacionesComponent } from './notificaciones.component';

const notificacion = (id: number, extra: Partial<Notificacion> = {}): Notificacion => ({
  id,
  tipo: 'CITA_CONFIRMADA',
  titulo: `Aviso ${id}`,
  mensaje: `Mensaje ${id}`,
  citaId: null,
  leida: false,
  creadaEn: '2026-11-20T11:55:00',
  ...extra,
});

const pagina = (filas: Notificacion[], total = filas.length): Observable<PaginaServidor<Notificacion>> => of({ filas, total });

describe('NotificacionesComponent', () => {
  let fixture: ComponentFixture<NotificacionesComponent>;
  let componente: NotificacionesComponent;
  let router: Router;
  let navegar: ReturnType<typeof vi.spyOn>;
  const listar = vi.fn();
  const marcarLeida = vi.fn();
  const marcarTodasLeidas = vi.fn();
  const refrescar = vi.fn();
  const exito = vi.fn();
  const error = vi.fn();
  const noLeidas = signal<number | null>(2);
  let rol: string | null;

  async function crear(respuesta: Observable<PaginaServidor<Notificacion>> = pagina([])): Promise<void> {
    listar.mockReset().mockReturnValue(respuesta);
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [
        provideRouter([]),
        { provide: NotificacionService, useValue: { listar, marcarLeida, marcarTodasLeidas } },
        { provide: ConteoNotificacionesService, useValue: { noLeidas, refrescar } },
        { provide: ToastService, useValue: { exito, error } },
        { provide: AuthService, useValue: { obtenerRol: () => rol } },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(NotificacionesComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    await tick();
  }

  const tick = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const raiz = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => (raiz().textContent ?? '').replace(/\s+/g, ' ');
  const filas = (): HTMLElement[] => Array.from(raiz().querySelectorAll('li'));
  const boton = (t: string): HTMLButtonElement =>
    Array.from(raiz().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim().startsWith(t))!;

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 10, 20, 12, 0, 0), toFake: ['Date'] });
    rol = 'CLIENTE';
    noLeidas.set(2);
    for (const m of [marcarLeida, marcarTodasLeidas, refrescar, exito, error]) m.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  describe('lista', () => {
    it('pide la primera página sin filtro y muestra título, mensaje y tiempo relativo en español', async () => {
      await crear(pagina([notificacion(1), notificacion(2, { leida: true, creadaEn: '2026-11-20T09:00:00' })]));

      expect(listar).toHaveBeenCalledWith({ soloNoLeidas: false, page: 0, size: NOTIFICACIONES_POR_PAGINA });
      expect(filas()).toHaveLength(2);
      expect(texto()).toContain('Aviso 1');
      expect(texto()).toContain('Mensaje 1');
      expect(texto()).toContain('hace 5 min');
      expect(texto()).toContain('hace 3 h');
    });

    it('las no leídas se distinguen (texto para lector de pantalla y punto) y las leídas no', async () => {
      await crear(pagina([notificacion(1), notificacion(2, { leida: true })]));
      const [sinLeer, leida] = filas();
      expect(sinLeer.textContent).toContain('No leída.');
      expect(sinLeer.querySelector('.rounded-full.bg-\\[\\#d98e4a\\]')).not.toBeNull();
      expect(leida.textContent).not.toContain('No leída.');
    });

    it('cada fila es un botón y no hay tabindex en elementos no interactivos', async () => {
      await crear(pagina([notificacion(1)]));
      expect(filas()[0].querySelector('button')).not.toBeNull();
      expect(raiz().querySelector('[tabindex]')).toBeNull();
    });

    it('elige el icono según el tipo', async () => {
      await crear(
        pagina([notificacion(1, { tipo: 'PAGO_RECIBIDO' }), notificacion(2, { tipo: 'CALIFICACION_NUEVA' }), notificacion(3, { tipo: 'CITA_CANCELADA' }), notificacion(4, { tipo: 'X' })])
      );
      const iconos = filas().map((f) => f.querySelector('svg')!.innerHTML);
      expect(new Set(iconos).size).toBe(4);
    });

    it('el encabezado y la lista entran con la animación de aparecer', async () => {
      await crear(pagina([notificacion(1)]));
      expect(raiz().querySelector('[appaparecer="simple"] h1')?.textContent).toBe('Notificaciones');
      expect(raiz().querySelector('ul[appaparecer="lista"]')).not.toBeNull();
    });
  });

  describe('estados', () => {
    it('mientras carga muestra esqueletos', async () => {
      await crear(new Subject<PaginaServidor<Notificacion>>());
      expect(raiz().querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Cargando notificaciones');
    });

    it('sin notificaciones muestra el estado vacío', async () => {
      await crear(pagina([]));
      expect(texto()).toContain('Aún no tienes notificaciones.');
    });

    it('el error muestra el mensaje del backend y permite reintentar', async () => {
      await crear(throwError(() => new HttpErrorResponse({ status: 500, error: { error: 'Servicio caído' } })));
      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Servicio caído');

      listar.mockReturnValue(pagina([notificacion(1)]));
      boton('Reintentar').click();
      await tick();
      expect(filas()).toHaveLength(1);
    });

    it('un error de red usa el mensaje de conexión', async () => {
      await crear(throwError(() => new HttpErrorResponse({ status: 0 })));
      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('No fue posible conectar con el servidor');
    });
  });

  describe('filtro y paginación', () => {
    it('"No leídas" pide solo las no leídas desde la primera página y el vacío cambia de texto', async () => {
      await crear(pagina([notificacion(1)], 25));
      listar.mockReturnValue(pagina([]));

      boton('No leídas').click();
      await tick();

      expect(listar).toHaveBeenLastCalledWith({ soloNoLeidas: true, page: 0, size: NOTIFICACIONES_POR_PAGINA });
      expect(boton('No leídas').getAttribute('aria-pressed')).toBe('true');
      expect(texto()).toContain('No tienes notificaciones sin leer.');
    });

    it('volver a pulsar el filtro activo no repite la consulta', async () => {
      await crear(pagina([notificacion(1)]));
      listar.mockClear();
      boton('Todas').click();
      expect(listar).not.toHaveBeenCalled();
    });

    it('muestra la paginación con el total del servidor y pide la siguiente página', async () => {
      await crear(pagina(Array.from({ length: 10 }, (_, i) => notificacion(i + 1)), 23));
      expect(texto()).toContain('Mostrando 1–10 de 23 notificaciones');

      listar.mockReturnValue(pagina([notificacion(11)], 23));
      boton('Siguiente').click();
      await tick();
      expect(listar).toHaveBeenLastCalledWith({ soloNoLeidas: false, page: 1, size: NOTIFICACIONES_POR_PAGINA });
    });

    it('al cambiar de filtro vuelve a la primera página', async () => {
      await crear(pagina([notificacion(1)], 30));
      componente.irAPagina(2);
      listar.mockReturnValue(pagina([notificacion(2)], 30));
      boton('No leídas').click();
      await tick();
      expect(listar).toHaveBeenLastCalledWith({ soloNoLeidas: true, page: 0, size: NOTIFICACIONES_POR_PAGINA });
    });
  });

  describe('abrir una notificación', () => {
    it('una no leída se marca, se actualiza en la lista, refresca el contador y abre su cita (cliente)', async () => {
      marcarLeida.mockReturnValue(of(null));
      await crear(pagina([notificacion(1, { citaId: 7 })]));

      filas()[0].querySelector('button')!.click();
      await tick();

      expect(marcarLeida).toHaveBeenCalledWith(1);
      expect(refrescar).toHaveBeenCalledTimes(1);
      expect(filas()[0].textContent).not.toContain('No leída.');
      expect(navegar).toHaveBeenCalledWith(['/cliente/citas', '7']);
    });

    it('el administrador va al detalle de la cita del panel de administración', async () => {
      rol = 'ADMINISTRADOR';
      marcarLeida.mockReturnValue(of(null));
      await crear(pagina([notificacion(1, { citaId: 9 })]));
      filas()[0].querySelector('button')!.click();
      expect(navegar).toHaveBeenCalledWith(['/admin/citas', '9']);
    });

    it('una ya leída solo navega, sin volver a marcarla', async () => {
      await crear(pagina([notificacion(1, { citaId: 7, leida: true })]));
      filas()[0].querySelector('button')!.click();
      expect(marcarLeida).not.toHaveBeenCalled();
      expect(navegar).toHaveBeenCalledTimes(1);
    });

    it('sin cita, o con un rol sin pantalla de detalle (técnico), solo se marca', async () => {
      marcarLeida.mockReturnValue(of(null));
      await crear(pagina([notificacion(1), notificacion(2, { citaId: 4 })]));
      filas()[0].querySelector('button')!.click();
      expect(marcarLeida).toHaveBeenCalledWith(1);

      rol = 'TECNICO';
      filas()[1].querySelector('button')!.click();
      expect(marcarLeida).toHaveBeenCalledWith(2);
      expect(navegar).not.toHaveBeenCalled();
    });

    it('si marcarla falla avisa con el mensaje del backend y aun así abre la cita', async () => {
      marcarLeida.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500, error: { error: 'Falló' } })));
      await crear(pagina([notificacion(1, { citaId: 7 })]));

      filas()[0].querySelector('button')!.click();
      await tick();

      expect(error).toHaveBeenCalledWith('No se pudo marcar como leída', 'Falló');
      expect(filas()[0].textContent).toContain('No leída.');
      expect(refrescar).not.toHaveBeenCalled();
      expect(navegar).toHaveBeenCalledWith(['/cliente/citas', '7']);
    });

    it('un fallo al navegar no rompe nada', async () => {
      marcarLeida.mockReturnValue(of(null));
      await crear(pagina([notificacion(1, { citaId: 7 })]));
      navegar.mockRejectedValue(new Error('no'));
      filas()[0].querySelector('button')!.click();
      await tick();
      expect(marcarLeida).toHaveBeenCalled();
    });
  });

  describe('marcar todas como leídas', () => {
    it('marca todas, avisa, refresca el contador y vuelve a cargar la lista', async () => {
      marcarTodasLeidas.mockReturnValue(of(2));
      await crear(pagina([notificacion(1), notificacion(2)]));
      listar.mockClear().mockReturnValue(pagina([notificacion(1, { leida: true }), notificacion(2, { leida: true })]));

      boton('Marcar todas como leídas').click();
      await tick();

      expect(marcarTodasLeidas).toHaveBeenCalledTimes(1);
      expect(exito).toHaveBeenCalledWith('Todas tus notificaciones quedaron como leídas');
      expect(refrescar).toHaveBeenCalledTimes(1);
      expect(listar).toHaveBeenCalledTimes(1);
      expect(filas().every((f) => !f.textContent?.includes('No leída.'))).toBe(true);
    });

    it('con el contador en 0 el botón está apagado', async () => {
      noLeidas.set(0);
      await crear(pagina([notificacion(1, { leida: true })]));
      expect(boton('Marcar todas como leídas').disabled).toBe(true);
    });

    it('con el contador aún sin cargar se puede pulsar', async () => {
      noLeidas.set(null);
      await crear(pagina([notificacion(1)]));
      expect(boton('Marcar todas como leídas').disabled).toBe(false);
    });

    it('mientras marca no permite pulsar de nuevo', async () => {
      const respuesta = new Subject<number>();
      marcarTodasLeidas.mockReturnValue(respuesta);
      await crear(pagina([notificacion(1)]));

      boton('Marcar todas como leídas').click();
      await tick();
      expect(boton('Marcando…').disabled).toBe(true);
      componente.marcarTodas();
      expect(marcarTodasLeidas).toHaveBeenCalledTimes(1);

      respuesta.next(1);
      respuesta.complete();
      await tick();
      expect(boton('Marcar todas como leídas')).toBeDefined();
    });

    it('si falla avisa con el mensaje y deja la lista como está', async () => {
      marcarTodasLeidas.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      await crear(pagina([notificacion(1)]));
      listar.mockClear();

      boton('Marcar todas como leídas').click();
      await tick();

      expect(error).toHaveBeenCalledWith('No se pudieron marcar', expect.stringContaining('No fue posible conectar'));
      expect(listar).not.toHaveBeenCalled();
      expect(exito).not.toHaveBeenCalled();
    });
  });

  it('al destruir cancela la consulta pendiente', async () => {
    const pendiente = new Subject<PaginaServidor<Notificacion>>();
    await crear(pendiente);
    fixture.destroy();
    expect(pendiente.observed).toBe(false);
  });
});
