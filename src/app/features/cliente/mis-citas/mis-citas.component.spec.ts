import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CitaResumen, EstadoCita } from '../../../core/models/cita';
import { CitaClienteService } from '../../../core/services/cita-cliente.service';
import { ClienteModule } from '../cliente.module';
import { MisCitasComponent } from './mis-citas.component';

function cita(id: number, estado: EstadoCita): CitaResumen {
  return {
    id,
    estado,
    tecnicoId: 1,
    tecnicoNombre: 'Luis',
    tecnicoApellido: 'Gómez',
    especialidadId: 1,
    especialidadNombre: 'Lavadoras',
    descripcionProblema: 'No centrifuga',
    direccionServicio: 'Calle 6 # 12-34',
    fechaHoraInicio: '2026-11-04T14:00:00',
    fechaHoraFin: '2026-11-04T15:00:00',
  };
}

describe('MisCitasComponent', () => {
  let fixture: ComponentFixture<MisCitasComponent>;

  async function crear(respuesta: Observable<CitaResumen[]>): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ClienteModule, RouterModule.forRoot([])],
      providers: [{ provide: CitaClienteService, useValue: { listar: vi.fn().mockReturnValue(respuesta) } }],
    }).compileComponents();
    fixture = TestBed.createComponent(MisCitasComponent);
    fixture.detectChanges();
  }

  const raiz = (): HTMLElement => fixture.nativeElement;
  const tarjetas = (): number => raiz().querySelectorAll('li').length;

  it('lista las citas con su insignia de estado y su técnico', async () => {
    await crear(of([cita(1, 'CONFIRMADA'), cita(2, 'CANCELADA')]));

    expect(tarjetas()).toBe(2);
    expect(raiz().textContent).toContain('Confirmada');
    expect(raiz().textContent).toContain('Cancelada');
    expect(raiz().textContent).toContain('Luis Gómez');
  });

  it('filtra por estado y avisa cuando ninguna coincide', async () => {
    await crear(of([cita(1, 'CONFIRMADA'), cita(2, 'CANCELADA')]));
    const filtrar = (texto: string): void => {
      raiz().querySelector<HTMLButtonElement>('#citas-filtro')!.click();
      fixture.detectChanges();
      Array.from(raiz().querySelectorAll<HTMLElement>('[role="option"]')).find((o) => o.textContent?.trim() === texto)!.click();
      fixture.detectChanges();
    };

    filtrar('Cancelada');
    expect(tarjetas()).toBe(1);

    filtrar('Finalizada');
    expect(tarjetas()).toBe(0);
    expect(raiz().textContent).toContain('No tienes citas con ese estado');
  });

  it('muestra el estado vacío', async () => {
    await crear(of([]));
    expect(raiz().textContent).toContain('Aún no tienes citas');
  });

  it('muestra el mensaje del backend si falla la carga', async () => {
    await crear(throwError(() => new HttpErrorResponse({ status: 500, error: { error: 'Servicio no disponible' } })));
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Servicio no disponible');
  });
});
