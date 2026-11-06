import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FilaPagoAdmin } from '../../../core/models/pago-admin';
import { PagoAdminService } from '../../../core/services/pago-admin.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { AdminModule } from '../admin.module';
import { HistorialPagosComponent } from './historial-pagos.component';

function fila(parcial: Partial<FilaPagoAdmin> = {}): FilaPagoAdmin {
  return {
    citaId: 12,
    clienteId: 3,
    clienteNombre: 'Ana Pérez',
    tecnicoId: 9,
    tecnicoNombre: 'Luis Gómez',
    especialidad: 'Lavadoras',
    montoCotizado: 90000,
    montoFinal: 95000,
    metodo: 'EN_LINEA',
    estado: 'PAGADO',
    pagadoEn: '2026-11-04T14:30:00',
    numeroComprobante: 'CP-0007',
    ...parcial,
  };
}

describe('HistorialPagosComponent', () => {
  let fixture: ComponentFixture<HistorialPagosComponent>;
  let componente: HistorialPagosComponent;
  let toast: ToastService;
  const listar = vi.fn();

  const raiz = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => (raiz().textContent ?? '').replace(/\s+/g, ' ');
  const tarjetas = (): HTMLElement[] => Array.from(raiz().querySelectorAll('li'));
  const boton = (nombre: string): HTMLButtonElement =>
    Array.from(raiz().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes(nombre))!;
  const pagina = (filas: FilaPagoAdmin[], total = filas.length) => of({ filas, total });
  /** El valor que va debajo de una etiqueta (<dt>) dentro de una tarjeta. */
  const dato = (tarjeta: HTMLElement, etiqueta: string): string => {
    const dt = Array.from(tarjeta.querySelectorAll('dt')).find((e) => e.textContent?.trim() === etiqueta);
    return (dt?.nextElementSibling?.textContent ?? '').replace(/\s+/g, ' ').trim();
  };
  const refrescar = (): void => {
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };

  async function crear(respuesta: unknown): Promise<void> {
    listar.mockReset().mockReturnValue(respuesta);
    await TestBed.configureTestingModule({
      imports: [AdminModule, RouterModule.forRoot([])],
      providers: [{ provide: PagoAdminService, useValue: { listar } }],
    }).compileComponents();
    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(HistorialPagosComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.resetTestingModule());

  describe('resultados', () => {
    it('carga la primera página de 20 sin filtros', async () => {
      await crear(pagina([fila()]));
      expect(listar).toHaveBeenCalledWith({ page: 0, size: 20 });
    });

    it('muestra cita, cliente, técnico, especialidad, montos en pesos, método, estado, fecha y comprobante', async () => {
      await crear(pagina([fila()]));
      const t = (tarjetas()[0].textContent ?? '').replace(/\s+/g, ' ');

      for (const esperado of ['Cita n.º 12', 'Ana Pérez', 'Luis Gómez', 'Lavadoras', '$ 90.000', '$ 95.000', 'En línea', 'Pagado', 'mié, 4 de nov', '2:30', 'CP-0007']) {
        expect(t).toContain(esperado);
      }
      expect(tarjetas()[0].querySelector('a[href="/admin/citas/12"]')).not.toBeNull();
    });

    it('los datos que faltan se muestran como "—" y el técnico como "Sin asignar"', async () => {
      await crear(
        pagina([fila({ tecnicoNombre: null, tecnicoId: null, montoFinal: null, metodo: null, estado: 'PENDIENTE', pagadoEn: null, numeroComprobante: null })])
      );
      const tarjeta = tarjetas()[0];

      expect(dato(tarjeta, 'Técnico')).toBe('Sin asignar');
      expect(tarjeta.textContent).toContain('Pendiente');
      expect(dato(tarjeta, 'Monto cotizado')).toBe('$ 90.000');
      for (const etiqueta of ['Monto final', 'Método', 'Fecha de pago', 'Comprobante']) expect(dato(tarjeta, etiqueta)).toBe('—');
    });

    it('cada estado tiene su insignia', async () => {
      await crear(pagina([fila({ citaId: 1, estado: 'PAGADO' }), fila({ citaId: 2, estado: 'PENDIENTE' }), fila({ citaId: 3, estado: 'FALLIDO' })]));
      const insignias = tarjetas().map((li) => li.querySelector('app-insignia-pago')?.textContent?.replace(/\s+/g, ''));
      expect(insignias).toEqual(['✓Pagado', '◔Pendiente', '✕Fallido']);
    });

    it('el método efectivo se escribe en español', async () => {
      await crear(pagina([fila({ metodo: 'EFECTIVO' })]));
      expect(texto()).toContain('Efectivo');
    });
  });

  describe('estados de la pantalla', () => {
    it('muestra esqueletos mientras carga', async () => {
      await crear(new Subject());
      expect(raiz().querySelector('[aria-label="Cargando pagos"]')).not.toBeNull();
    });

    it('sin resultados lo dice', async () => {
      await crear(pagina([], 0));
      expect(texto()).toContain('No hay pagos con estos filtros.');
    });

    it('si falla (400) muestra el detalle, un toast y permite reintentar', async () => {
      await crear(throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'size debe estar entre 1 y 100' } })));

      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('size debe estar entre 1 y 100');
      expect(toast.visibles().map((a) => [a.tipo, a.titulo, a.descripcion])).toEqual([
        ['error', 'No se pudo cargar el historial de pagos', 'size debe estar entre 1 y 100'],
      ]);

      listar.mockReturnValue(pagina([fila()]));
      boton('Reintentar').click();
      fixture.detectChanges();
      expect(tarjetas()).toHaveLength(1);
    });
  });

  describe('filtros', () => {
    beforeEach(() => crear(pagina([fila()], 45)));

    it('Aplicar envía estado, método, fechas e identificadores y vuelve a la página 0', () => {
      componente.irAPagina(1);
      componente.filtros.patchValue({ estado: 'PAGADO', metodo: 'EN_LINEA', desde: '2026-11-01', hasta: '2026-11-30', clienteId: '3', tecnicoId: '9' });
      componente.aplicar();

      expect(listar).toHaveBeenLastCalledWith({
        estado: 'PAGADO',
        metodo: 'EN_LINEA',
        clienteId: 3,
        tecnicoId: 9,
        desde: '2026-11-01',
        hasta: '2026-11-30',
        page: 0,
        size: 20,
      });
      expect(componente.pagina).toBe(0);
    });

    it('lo que se escribe sin aplicar no cambia la consulta', () => {
      listar.mockClear();
      componente.filtros.patchValue({ estado: 'FALLIDO' });
      componente.irAPagina(1);
      expect(listar).toHaveBeenLastCalledWith({ page: 1, size: 20 });
    });

    it('no deja aplicar con desde posterior a hasta ni llama al servidor', () => {
      listar.mockClear();
      componente.filtros.patchValue({ desde: '2026-11-30', hasta: '2026-11-01' });
      componente.aplicar();
      refrescar();

      expect(listar).not.toHaveBeenCalled();
      expect(raiz().querySelector('#pagos-error-filtros')?.textContent).toContain('La fecha inicial no puede ser posterior a la fecha final.');
      expect(raiz().querySelector('#pagos-hasta')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('acepta desde igual a hasta', () => {
      listar.mockClear();
      componente.filtros.patchValue({ desde: '2026-11-04', hasta: '2026-11-04' });
      componente.aplicar();
      expect(listar).toHaveBeenCalledOnce();
    });

    it.each(['0', '-3', '1.5', 'abc', '007'])('el identificador "%s" no es válido', (valor) => {
      listar.mockClear();
      componente.filtros.patchValue({ clienteId: valor });
      componente.aplicar();
      refrescar();

      expect(listar).not.toHaveBeenCalled();
      expect(texto()).toContain('deben ser números enteros positivos');
    });

    it('con fechas avisa que solo se muestran los pagos ya realizados', () => {
      expect(texto()).not.toContain('Con fechas solo se muestran');
      componente.filtros.patchValue({ desde: '2026-11-01' });
      refrescar();
      expect(texto()).toContain('Con fechas solo se muestran los pagos ya realizados.');

      componente.filtros.patchValue({ desde: '', hasta: '2026-11-30' });
      refrescar();
      expect(texto()).toContain('Con fechas solo se muestran');
    });

    it('"Limpiar" vacía los filtros y vuelve a cargar desde la página 0', () => {
      componente.filtros.patchValue({ estado: 'PAGADO', desde: '2026-11-01' });
      componente.aplicar();
      componente.irAPagina(1);

      componente.limpiar();
      expect(componente.filtros.getRawValue()).toEqual({ estado: '', metodo: '', desde: '', hasta: '', clienteId: '', tecnicoId: '', });
      expect(listar).toHaveBeenLastCalledWith({ page: 0, size: 20 });
    });

    it('el formulario se envía con el botón Aplicar', () => {
      listar.mockClear();
      raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
      expect(listar).toHaveBeenCalledOnce();
    });

    it('"Más filtros" es un desplegable con cliente y técnico', () => {
      const detalles = raiz().querySelector('details')!;
      expect(detalles.querySelector('summary')?.textContent).toContain('Más filtros');
      expect(detalles.querySelector('#pagos-cliente')).not.toBeNull();
      expect(detalles.querySelector('#pagos-tecnico')).not.toBeNull();
    });
  });

  describe('paginación', () => {
    it('muestra el rango y el total, y Siguiente pide la página siguiente', async () => {
      await crear(pagina(Array.from({ length: 20 }, (_, i) => fila({ citaId: i + 1 })), 45));
      expect(texto()).toContain('Mostrando 1–20 de 45 pagos');
      expect(boton('Anterior').disabled).toBe(true);

      boton('Siguiente').click();
      fixture.detectChanges();
      expect(listar).toHaveBeenLastCalledWith({ page: 1, size: 20 });
    });

    it('irAPagina ignora la actual y las negativas', async () => {
      await crear(pagina([fila()], 45));
      listar.mockClear();
      componente.irAPagina(0);
      componente.irAPagina(-1);
      expect(listar).not.toHaveBeenCalled();
    });
  });

  it('al destruirse cancela la consulta pendiente', async () => {
    const respuesta = new Subject();
    await crear(respuesta);
    fixture.destroy();
    expect(respuesta.observed).toBe(false);
  });
});
