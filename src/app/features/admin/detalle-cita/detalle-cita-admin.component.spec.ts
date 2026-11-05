import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterModule, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { DetalleCita } from '../../../core/models/cita';
import { pagoDe } from '../../../core/models/pago.mock';
import { CitaAdminService } from '../../../core/services/cita-admin.service';
import { PagoService } from '../../../core/services/pago.service';
import { AdminModule } from '../admin.module';
import { DetalleCitaAdminComponent } from './detalle-cita-admin.component';

const cita = (estado: DetalleCita['estado']): DetalleCita => ({
  id: 5,
  estado,
  tecnicoId: 1,
  especialidadId: 1,
  descripcionProblema: 'No centrifuga',
  direccionServicio: 'Calle 6',
  fechaHoraInicio: '2026-11-04T14:00:00',
  fechaHoraFin: '2026-11-04T15:00:00',
  diagnostico: null,
  historial: [],
});

describe('DetalleCitaAdminComponent: pago', () => {
  let fixture: ComponentFixture<DetalleCitaAdminComponent>;
  const obtenerPago = vi.fn();

  async function crear(estado: DetalleCita['estado']): Promise<void> {
    obtenerPago.mockReset().mockReturnValue(of(pagoDe({ metodo: 'EFECTIVO', estado: 'PAGADO' })));
    await TestBed.configureTestingModule({
      imports: [AdminModule, RouterModule.forRoot([])],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '5' })) } },
        { provide: CitaAdminService, useValue: { obtener: vi.fn().mockReturnValue(of(cita(estado))) } },
        {
          provide: PagoService,
          useValue: { obtener: obtenerPago, obtenerComprobante: vi.fn().mockReturnValue(of({})) },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DetalleCitaAdminComponent);
    fixture.detectChanges();
  }

  it('en una cita finalizada el administrador consulta el pago sin acciones', async () => {
    await crear('FINALIZADA');

    expect(obtenerPago).toHaveBeenCalledWith(5);
    expect(fixture.nativeElement.querySelector('app-panel-pago')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-selector-metodo-pago')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-costo-final-form')).toBeNull();
  });

  it('en una cita sin finalizar no muestra el pago', async () => {
    await crear('CONFIRMADA');

    expect(obtenerPago).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-panel-pago')).toBeNull();
  });
});
