import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { citaFinalizadaDe } from '../../../core/models/pago.mock';
import { CitaFinalizadaTecnico } from '../../../core/models/tecnico-agenda';
import { AgendaTecnicoService } from '../../../core/services/agenda-tecnico.service';
import { TecnicoModule } from '../tecnico.module';
import { FinalizadasComponent } from './finalizadas.component';

describe('FinalizadasComponent', () => {
  let fixture: ComponentFixture<FinalizadasComponent>;
  const obtenerFinalizadas = vi.fn();

  const raiz = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => (raiz().textContent ?? '').replace(/\s+/g, ' ');
  const tarjetas = (): HTMLElement[] => Array.from(raiz().querySelectorAll('li'));

  async function crear(respuesta: unknown): Promise<void> {
    obtenerFinalizadas.mockReset().mockReturnValue(respuesta);
    await TestBed.configureTestingModule({
      imports: [TecnicoModule, RouterModule.forRoot([])],
      providers: [{ provide: AgendaTecnicoService, useValue: { obtenerFinalizadas } }],
    }).compileComponents();
    fixture = TestBed.createComponent(FinalizadasComponent);
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('lista las citas más recientes primero, con el estado del pago y el enlace al cobro', async () => {
    const citas: CitaFinalizadaTecnico[] = [
      citaFinalizadaDe({ id: 1, fechaHoraFin: '2026-11-01T10:00:00', estadoPago: 'PAGADO' }),
      citaFinalizadaDe({ id: 2, fechaHoraFin: '2026-11-04T10:00:00', estadoPago: 'SIN_COSTO_FINAL' }),
      citaFinalizadaDe({ id: 3, fechaHoraFin: '2026-11-02T10:00:00', estadoPago: 'PENDIENTE' }),
    ];
    await crear(of(citas));

    const enlaces = tarjetas().map((t) => t.querySelector('a')!.getAttribute('href'));
    expect(enlaces).toEqual(['/tecnico/citas/2/pago', '/tecnico/citas/3/pago', '/tecnico/citas/1/pago']);
    expect(tarjetas()[0].textContent).toContain('Sin costo final');
    expect(tarjetas()[1].textContent).toContain('Pendiente');
    expect(tarjetas()[2].textContent).toContain('Pagado');
    expect(tarjetas()[0].textContent).toContain('Registrar costo final');
    expect(tarjetas()[2].textContent).toContain('Ver cobro');
    expect(tarjetas()[0].textContent).toContain('Cliente: Ana Pérez');
  });

  it('destaca las citas sin costo final y las cuenta', async () => {
    await crear(
      of([citaFinalizadaDe({ id: 1 }), citaFinalizadaDe({ id: 2, estadoPago: 'PAGADO', cliente: { nombre: '', apellido: '', telefono: null } })])
    );

    expect(tarjetas()[0].className).toContain('ring-orange');
    expect(tarjetas()[1].className).not.toContain('ring-orange');
    expect(tarjetas()[1].textContent).not.toContain('Cliente:');
    expect(texto()).toContain('2 citas finalizadas · 1 sin costo final');
  });

  it('usa el singular y omite el aviso cuando todas tienen costo', async () => {
    await crear(of([citaFinalizadaDe({ estadoPago: 'PAGADO' })]));
    expect(texto()).toContain('1 cita finalizada');
    expect(texto()).not.toContain('sin costo final');
  });

  it('muestra un estado de carga accesible', async () => {
    await crear(new Subject<CitaFinalizadaTecnico[]>());
    expect(raiz().querySelector('[role="status"]')?.textContent).toContain('Cargando');
  });

  it('muestra un estado vacío', async () => {
    await crear(of([]));
    expect(raiz().querySelector('[role="status"]')?.textContent).toContain('Aún no tienes citas finalizadas');
  });

  it('trata una respuesta que no es lista como vacía', async () => {
    await crear(of(null));
    expect(tarjetas().length).toBe(0);
    expect(texto()).toContain('Aún no tienes citas finalizadas');
  });

  it('muestra el error del backend y permite reintentar', async () => {
    await crear(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'No pudimos listar tus citas.' } })));
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('No pudimos listar tus citas.');

    obtenerFinalizadas.mockReturnValue(of([citaFinalizadaDe()]));
    Array.from(raiz().querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar'))!.click();
    fixture.detectChanges();

    expect(obtenerFinalizadas).toHaveBeenCalledTimes(2);
    expect(raiz().querySelector('[role="alert"]')).toBeNull();
    expect(tarjetas().length).toBe(1);
  });

  it('cancela la consulta pendiente al destruirse', async () => {
    const respuesta = new Subject<CitaFinalizadaTecnico[]>();
    await crear(respuesta);
    fixture.destroy();
    expect(respuesta.observed).toBe(false);
  });
  it('el encabezado y la lista entran con la animación de aparecer', async () => {
    await crear(of([citaFinalizadaDe()]));
    expect(raiz().querySelector('[appaparecer="simple"] h1')).not.toBeNull();
    expect(raiz().querySelector('ul[appaparecer="lista"]')).not.toBeNull();
  });

});
