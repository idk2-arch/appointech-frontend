import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { Cita, SolicitudServicio } from '../../../../core/models/cita';
import { FranjaDisponible } from '../../../../core/models/disponibilidad';
import { CitaService } from '../../../../core/services/cita.service';
import { PagoService } from '../../../../core/services/pago.service';
import { ClienteModule } from '../../cliente.module';
import { ConfirmarCitaComponent } from './confirmar-cita.component';

describe('ConfirmarCitaComponent: cotización estimada', () => {
  let fixture: ComponentFixture<ConfirmarCitaComponent>;
  const confirmarCita = vi.fn();

  async function crear(cotizacion: unknown): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ClienteModule],
      providers: [
        { provide: PagoService, useValue: { cotizarEspecialidad: vi.fn().mockReturnValue(cotizacion) } },
        { provide: CitaService, useValue: { confirmarCita } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ConfirmarCitaComponent);
    fixture.componentRef.setInput('especialidad', { id: 3, nombre: 'Lavadoras', descripcion: '' });
    fixture.componentRef.setInput('solicitud', { id: 1, descripcionProblema: 'x', direccionServicio: 'y' } as SolicitudServicio);
    fixture.componentRef.setInput('franja', {
      tecnicoId: 2,
      inicio: '2026-11-04T14:00:00',
      fin: '2026-11-04T15:00:00',
      distanciaKm: 3,
    } as FranjaDisponible);
    fixture.detectChanges();
  }

  const boton = (): HTMLButtonElement => {
    const raiz: HTMLElement = fixture.nativeElement;
    return Array.from(raiz.querySelectorAll('button')).find((b) => b.textContent?.includes('Confirmar cita'))!;
  };

  it('muestra la cotización estimada de la especialidad elegida en el último paso', async () => {
    await crear(
      of({ especialidadId: 3, especialidad: 'Lavadoras', montoEstimado: 80000, moneda: 'COP', disponible: true, nota: null })
    );

    const texto = (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ');
    expect(texto).toContain('Cotización estimada');
    expect(texto).toContain('$ 80.000');
  });

  it('si la cotización falla, no bloquea confirmar la cita', async () => {
    await crear(throwError(() => new HttpErrorResponse({ status: 500, error: { detail: 'Error interno.' } })));
    confirmarCita.mockReturnValue(of({ id: 1 } as Cita));
    const confirmada = vi.fn();
    fixture.componentInstance.confirmada.subscribe(confirmada);

    expect(boton().disabled).toBe(false);
    boton().click();

    expect(confirmarCita).toHaveBeenCalledOnce();
    expect(confirmada).toHaveBeenCalledOnce();
  });
});
