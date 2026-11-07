import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertaAdmin, AlertasAdmin, AlertasAdminService } from '../../../core/services/alertas-admin.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { AdminModule } from '../admin.module';
import { AlertasAdminComponent } from './alertas-admin.component';

function alerta(parcial: Partial<AlertaAdmin> = {}): AlertaAdmin {
  return {
    tipo: 'SOLICITUD_SIN_TECNICO',
    mensaje: 'No hay técnicos para Lavadoras.',
    solicitudId: 1,
    clienteId: 5,
    clienteNombre: 'Ana',
    clienteApellido: 'Pérez',
    telefono: '300 123 4567',
    especialidadId: 2,
    especialidadNombre: 'Lavadoras',
    direccionServicio: 'Calle 6 # 12-34',
    creadaEn: '2026-11-04T14:00:00',
    ...parcial,
  };
}

describe('AlertasAdminComponent', () => {
  let fixture: ComponentFixture<AlertasAdminComponent>;
  let toast: ToastService;
  const obtener = vi.fn();

  const raiz = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => (raiz().textContent ?? '').replace(/\s+/g, ' ');
  const tarjetas = (): HTMLElement[] => Array.from(raiz().querySelectorAll('li'));

  async function crear(respuesta: unknown): Promise<void> {
    obtener.mockReset().mockReturnValue(respuesta);
    await TestBed.configureTestingModule({
      imports: [AdminModule, RouterModule.forRoot([])],
      providers: [{ provide: AlertasAdminService, useValue: { obtener } }],
    }).compileComponents();
    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(AlertasAdminComponent);
    fixture.detectChanges();
  }

  const lista = (alertas: AlertaAdmin[]): AlertasAdmin => ({ total: alertas.length, alertas });

  beforeEach(() => TestBed.resetTestingModule());

  it('lista las alertas con especialidad, cliente, teléfono, dirección y fecha, en el orden recibido', async () => {
    await crear(of(lista([alerta({ solicitudId: 1 }), alerta({ solicitudId: 2, clienteNombre: 'Luis', clienteApellido: 'Gómez', especialidadNombre: 'Neveras' })])));

    expect(tarjetas()).toHaveLength(2);
    const primera = (tarjetas()[0].textContent ?? '').replace(/\s+/g, ' ');
    for (const esperado of ['Ana Pérez', 'Lavadoras', 'Calle 6 # 12-34', 'No hay técnicos para Lavadoras.', 'mié, 4 de nov', '2:00']) {
      expect(primera).toContain(esperado);
    }
    expect(tarjetas()[1].textContent).toContain('Luis Gómez');
    expect(texto()).toContain('2 solicitudes sin técnico');
  });

  it('el teléfono es un enlace para llamar y cada alerta enlaza a las solicitudes por coordinar', async () => {
    await crear(of(lista([alerta()])));

    const llamar = tarjetas()[0].querySelector<HTMLAnchorElement>('a[href^="tel:"]')!;
    expect(llamar.getAttribute('href')).toBe('tel:3001234567');
    expect(llamar.textContent).toContain('300 123 4567');
    expect(tarjetas()[0].querySelector('a[href="/admin/solicitudes-manuales"]')).not.toBeNull();
  });

  it('sin teléfono lo dice en vez de ofrecer llamar', async () => {
    await crear(of(lista([alerta({ telefono: null })])));
    expect(tarjetas()[0].querySelector('a[href^="tel:"]')).toBeNull();
    expect(texto()).toContain('Sin teléfono registrado');
  });

  it('usa el singular con una sola alerta', async () => {
    await crear(of(lista([alerta()])));
    expect(texto()).toContain('1 solicitud sin técnico');
  });

  it('muestra un estado de carga accesible', async () => {
    await crear(new Subject<AlertasAdmin>());
    expect(raiz().querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Cargando alertas');
    expect(raiz().querySelector('button')?.disabled).toBe(true);
  });

  it('sin alertas muestra el estado vacío con un enlace a las solicitudes', async () => {
    await crear(of({ total: 0, alertas: [] }));

    expect(texto()).toContain('No hay alertas');
    expect(tarjetas()).toHaveLength(0);
    expect(raiz().querySelector('a[href="/admin/solicitudes-manuales"]')).not.toBeNull();
  });

  it('si falla muestra el detalle, un toast de error y permite reintentar', async () => {
    await crear(throwError(() => new HttpErrorResponse({ status: 500, error: { detail: 'Servicio caído.' } })));

    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Servicio caído.');
    expect(toast.visibles().map((a) => [a.tipo, a.titulo, a.descripcion])).toEqual([['error', 'No se pudieron cargar las alertas', 'Servicio caído.']]);

    obtener.mockReturnValue(of(lista([alerta()])));
    Array.from(raiz().querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar'))!.click();
    fixture.detectChanges();
    expect(tarjetas()).toHaveLength(1);
    expect(raiz().querySelector('[role="alert"]')).toBeNull();
  });

  it('un 403 muestra el texto de permisos', async () => {
    await crear(throwError(() => new HttpErrorResponse({ status: 403 })));
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('No tienes permisos');
  });

  it('"Actualizar" vuelve a pedir las alertas', async () => {
    await crear(of(lista([alerta()])));
    obtener.mockReturnValue(of(lista([alerta(), alerta({ solicitudId: 2 })])));

    Array.from(raiz().querySelectorAll('button')).find((b) => b.textContent?.includes('Actualizar'))!.click();
    fixture.detectChanges();

    expect(obtener).toHaveBeenCalledTimes(2);
    expect(tarjetas()).toHaveLength(2);
  });

  it('al destruirse cancela la consulta pendiente', async () => {
    const respuesta = new Subject<AlertasAdmin>();
    await crear(respuesta);
    fixture.destroy();
    expect(respuesta.observed).toBe(false);
  });
  it('el encabezado y la lista entran con la animación de aparecer', async () => {
    await crear(of(lista([alerta()])));
    expect(raiz().querySelector('[appaparecer="simple"] h1')).not.toBeNull();
    expect(raiz().querySelector('ul[appaparecer="lista"]')).not.toBeNull();
  });

});
