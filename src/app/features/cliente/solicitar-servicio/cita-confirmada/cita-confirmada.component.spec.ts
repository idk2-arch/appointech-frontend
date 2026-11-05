import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Cita } from '../../../../core/models/cita';
import { ClienteModule } from '../../cliente.module';
import { CitaConfirmadaComponent } from './cita-confirmada.component';

function citaDe(parcial: Partial<Cita> = {}): Cita {
  return {
    id: 9,
    estado: 'CONFIRMADA',
    tecnicoId: 1,
    tecnicoNombre: 'Luis',
    tecnicoApellido: 'Gómez',
    tecnicoTelefono: '3001234567',
    especialidadId: 1,
    especialidadNombre: 'Lavadoras',
    descripcionProblema: 'No centrifuga',
    direccionServicio: 'Calle 6 # 12-34',
    fechaHoraInicio: '2026-11-04T14:00:00',
    fechaHoraFin: '2026-11-04T15:00:00',
    ...parcial,
  } as Cita;
}

describe('CitaConfirmadaComponent', () => {
  let fixture: ComponentFixture<CitaConfirmadaComponent>;
  const texto = (): string => (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ');

  async function crear(cita: Cita, especialidadNombre: string | null = null): Promise<void> {
    await TestBed.configureTestingModule({ imports: [ClienteModule, RouterModule.forRoot([])] }).compileComponents();
    fixture = TestBed.createComponent(CitaConfirmadaComponent);
    fixture.componentRef.setInput('cita', cita);
    fixture.componentRef.setInput('especialidadNombre', especialidadNombre);
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('muestra los datos de la cita sobre una tarjeta con spotlight', async () => {
    await crear(citaDe());

    expect(texto()).toContain('Tu cita está confirmada');
    expect(texto()).toContain('Lavadoras');
    expect(texto()).toContain('Luis Gómez');
    expect(texto()).toContain('Calle 6 # 12-34');
    expect(texto()).toContain('Confirmada');
    expect(fixture.nativeElement.querySelector('a[href^="tel:"]')?.textContent).toContain('3001234567');
    expect(fixture.nativeElement.querySelector('.spotlight-card dl')).not.toBeNull();
  });

  it('usa la especialidad de respaldo y omite lo que la cita no trae', async () => {
    await crear(citaDe({ especialidadNombre: null, tecnicoNombre: null, tecnicoApellido: null, tecnicoTelefono: null }), 'Neveras');

    expect(texto()).toContain('Neveras');
    expect(texto()).not.toContain('Teléfono del técnico');
    expect(texto()).not.toContain('Técnico');
  });

  it('sin especialidad en ningún lado no muestra la fila', async () => {
    await crear(citaDe({ especialidadNombre: null }));
    expect(texto()).not.toContain('Especialidad');
  });

  it('avisa que se vuelve al inicio', async () => {
    await crear(citaDe());
    const volver = vi.fn();
    fixture.componentInstance.volverInicio.subscribe(volver);

    const botones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    botones.find((b) => b.textContent?.includes('Volver al inicio'))!.click();
    expect(volver).toHaveBeenCalledOnce();
  });
});
