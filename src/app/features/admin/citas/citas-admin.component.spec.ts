import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaCitasAdmin, ResumenCitaAdmin } from '../../../core/models/cita-admin';
import { CitaAdminService } from '../../../core/services/cita-admin.service';
import { TecnicoService } from '../../../core/services/tecnico.service';
import { AdminModule } from '../admin.module';
import { CitasAdminComponent } from './citas-admin.component';

function fila(id: number, estado: ResumenCitaAdmin['estado'] = 'CONFIRMADA'): ResumenCitaAdmin {
  return {
    id,
    fecha: '2026-11-04',
    horaInicio: '14:00',
    horaFin: '15:00',
    estado,
    nombreCliente: 'Ana Pérez',
    nombreTecnico: 'Luis Gómez',
    servicio: 'Lavadoras',
    direccion: 'Calle 6 # 12-34',
  };
}

function pagina(contenido: ResumenCitaAdmin[], datos: Partial<PaginaCitasAdmin> = {}): PaginaCitasAdmin {
  return { contenido, pagina: 0, tamanio: 10, totalElementos: contenido.length, totalPaginas: 1, ...datos };
}

describe('CitasAdminComponent', () => {
  let fixture: ComponentFixture<CitasAdminComponent>;
  let listar: ReturnType<typeof vi.fn>;

  async function crear(respuesta: Observable<PaginaCitasAdmin>): Promise<void> {
    listar = vi.fn().mockReturnValue(respuesta);
    await TestBed.configureTestingModule({
      imports: [AdminModule, RouterModule.forRoot([])],
      providers: [
        { provide: CitaAdminService, useValue: { listar } },
        {
          provide: TecnicoService,
          useValue: { obtenerTecnicos: () => of([{ id: 4, nombre: 'Luis', apellido: 'Gómez' }]) },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CitasAdminComponent);
    fixture.detectChanges();
  }

  const raiz = (): HTMLElement => fixture.nativeElement;
  const filas = (): number => raiz().querySelectorAll('tbody tr').length;
  /** Elige una opción del app-select por su texto, como lo haría una persona. */
  const elegirOpcion = (idBoton: string, texto: string): void => {
    raiz().querySelector<HTMLButtonElement>(idBoton)!.click();
    fixture.detectChanges();
    const opcion = Array.from(raiz().querySelectorAll<HTMLElement>('[role="option"]')).find((o) => o.textContent?.trim() === texto)!;
    opcion.click();
    fixture.detectChanges();
  };
  const poner = (id: string, valor: string, evento = 'change'): void => {
    const campo = raiz().querySelector<HTMLInputElement | HTMLSelectElement>(id)!;
    campo.value = valor;
    campo.dispatchEvent(new Event(evento));
  };
  const enviarFiltros = (): void => {
    raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const boton = (texto: string): HTMLButtonElement =>
    Array.from(raiz().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === texto)!;

  beforeEach(() => TestBed.resetTestingModule());

  it('al abrir carga la primera página y muestra las citas con su insignia', async () => {
    await crear(of(pagina([fila(1), fila(2, 'CANCELADA')])));

    expect(listar).toHaveBeenCalledWith({ pagina: 0, tamanio: 10 });
    expect(filas()).toBe(2);
    expect(raiz().textContent).toContain('Confirmada');
    expect(raiz().textContent).toContain('Cancelada');
    expect(raiz().textContent).toContain('Mostrando 1–2 de 2 citas');
  });

  it('Buscar aplica los filtros desde la página 0', async () => {
    await crear(of(pagina([fila(1)])));

    elegirOpcion('#citas-tecnico', 'Luis Gómez');
    elegirOpcion('#citas-estado', 'En camino');
    poner('#citas-desde', '2026-11-01', 'input');
    poner('#citas-hasta', '2026-11-30', 'input');
    enviarFiltros();

    expect(listar).toHaveBeenLastCalledWith({
      tecnicoId: 4,
      estado: 'EN_CAMINO',
      fechaDesde: '2026-11-01',
      fechaHasta: '2026-11-30',
      pagina: 0,
      tamanio: 10,
    });
  });

  it('rechaza un rango de fechas invertido sin consultar', async () => {
    await crear(of(pagina([fila(1)])));
    listar.mockClear();

    poner('#citas-desde', '2026-11-30', 'input');
    poner('#citas-hasta', '2026-11-01', 'input');
    enviarFiltros();

    expect(listar).not.toHaveBeenCalled();
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('no puede ser posterior');
  });

  it('Limpiar borra los filtros y vuelve a consultar sin ellos', async () => {
    await crear(of(pagina([fila(1)])));
    elegirOpcion('#citas-estado', 'Finalizada');
    enviarFiltros();

    boton('Limpiar').click();
    fixture.detectChanges();

    expect(listar).toHaveBeenLastCalledWith({ pagina: 0, tamanio: 10 });
    expect(raiz().querySelector('#citas-estado')!.textContent).toContain('Todos');
  });

  it('pagina conservando los filtros aplicados', async () => {
    await crear(of(pagina([fila(1)], { totalElementos: 25, totalPaginas: 3 })));
    elegirOpcion('#citas-estado', 'Confirmada');
    enviarFiltros();

    expect(boton('Anterior').disabled).toBe(true);
    expect(raiz().textContent).toContain('Página 1 de 3');

    boton('Siguiente').click();
    fixture.detectChanges();

    expect(listar).toHaveBeenLastCalledWith({ estado: 'CONFIRMADA', tecnicoId: null, fechaDesde: '', fechaHasta: '', pagina: 1, tamanio: 10 });
  });

  it('oculta la paginación cuando solo hay una página', async () => {
    await crear(of(pagina([fila(1)])));
    expect(raiz().querySelector('nav[aria-label="Paginación de citas"]')).toBeNull();
  });

  it('muestra el estado vacío', async () => {
    await crear(of(pagina([])));
    expect(raiz().textContent).toContain('No encontramos citas con esos filtros');
  });

  it('muestra el mensaje del backend si falla y permite reintentar', async () => {
    await crear(throwError(() => new HttpErrorResponse({ status: 500, error: { error: 'Servicio no disponible' } })));

    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Servicio no disponible');

    listar.mockReturnValue(of(pagina([fila(1)])));
    boton('Reintentar').click();
    fixture.detectChanges();
    expect(filas()).toBe(1);
  });
});
