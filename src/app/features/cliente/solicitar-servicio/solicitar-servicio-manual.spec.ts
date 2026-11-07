import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { SolicitudServicio } from '../../../core/models/cita';
import { PerfilService } from '../../../core/services/perfil.service';
import { ClienteModule } from '../cliente.module';
import { SolicitarServicioComponent } from './solicitar-servicio.component';

const MANUAL: SolicitudServicio = {
  id: 9,
  tecnicoId: null,
  especialidadId: 1,
  descripcionProblema: 'No centrifuga',
  direccionServicio: 'Calle 6 # 12-34',
  fechaHoraInicio: null,
  fechaHoraFin: null,
  estado: 'PENDIENTE',
  agendamientoManual: true,
  motivoSolicitudEspecial: 'SIN_TECNICOS_ESPECIALIDAD',
};

const DATOS = { especialidadId: 1, descripcionProblema: 'No centrifuga', direccionServicio: 'Calle 6 # 12-34', latitud: 4.3, longitud: -74.3 };

describe('SolicitarServicioComponent: solicitud para agendamiento manual', () => {
  async function crear(): Promise<{ raiz: HTMLElement; flujo: SolicitarServicioComponent; detectar: () => void }> {
    await TestBed.configureTestingModule({
      imports: [ClienteModule, RouterModule.forRoot([])],
      providers: [{ provide: PerfilService, useValue: { obtener: vi.fn().mockReturnValue(of({ telefono: '300 123 4567' })) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(SolicitarServicioComponent);
    fixture.detectChanges();
    return { raiz: fixture.nativeElement, flujo: fixture.componentInstance, detectar: () => {
        fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
        fixture.detectChanges();
      },
    };
  }

  it('si el backend marca la solicitud como manual, muestra que un administrador lo contactará, sin el indicador de pasos', async () => {
    const { raiz, flujo, detectar } = await crear();
    expect(raiz.querySelector('app-stepper')).not.toBeNull();

    flujo.onEspecialidadSeleccionada({ id: 1, nombre: 'Lavadoras' } as never);
    flujo.onDetallesListos({ datos: DATOS, fotos: [] });
    flujo.onSolicitudManual(MANUAL);
    detectar();

    const texto = (raiz.textContent ?? '').replace(/\s+/g, ' ');
    expect(texto).toContain('Recibimos tu solicitud');
    expect(texto).toContain('Por ahora no hay técnicos disponibles para esta especialidad.');
    expect(texto).toContain('300 123 4567');
    expect(raiz.querySelector('app-elegir-franja')).toBeNull();
    expect(raiz.querySelector('app-stepper')).toBeNull();
  });

  it('"Volver al inicio" reinicia el flujo', async () => {
    const { raiz, flujo, detectar } = await crear();
    flujo.onDetallesListos({ datos: DATOS, fotos: [] });
    flujo.onSolicitudManual(MANUAL);
    detectar();

    Array.from(raiz.querySelectorAll('button')).find((b) => b.textContent?.includes('Volver al inicio'))!.click();
    detectar();

    expect(flujo.paso).toBe('especialidad');
    expect(raiz.querySelector('app-solicitud-manual-creada')).toBeNull();
  });
});
