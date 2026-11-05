import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Cotizacion } from '../../../../core/models/pago';
import { PagoService } from '../../../../core/services/pago.service';
import { ClienteModule } from '../../cliente.module';
import { CotizacionEstimadaComponent, NOTA_COTIZACION } from './cotizacion-estimada.component';

function cotizacion(parcial: Partial<Cotizacion> = {}): Cotizacion {
  return {
    especialidadId: 3,
    especialidad: 'Lavadoras',
    montoEstimado: 80000,
    moneda: 'COP',
    disponible: true,
    nota: null,
    ...parcial,
  };
}

describe('CotizacionEstimadaComponent', () => {
  let fixture: ComponentFixture<CotizacionEstimadaComponent>;
  const cotizarEspecialidad = vi.fn();

  const texto = (): string => (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ');

  async function crear(respuesta: unknown): Promise<void> {
    cotizarEspecialidad.mockReset().mockReturnValue(respuesta);
    await TestBed.configureTestingModule({
      imports: [ClienteModule],
      providers: [{ provide: PagoService, useValue: { cotizarEspecialidad } }],
    }).compileComponents();
    fixture = TestBed.createComponent(CotizacionEstimadaComponent);
    fixture.componentRef.setInput('especialidadId', 3);
    fixture.detectChanges();
  }

  it('consulta la cotización de la especialidad elegida', async () => {
    await crear(of(cotizacion()));
    expect(cotizarEspecialidad).toHaveBeenCalledWith(3);
  });

  it('muestra el valor estimado en pesos con la nota de que el técnico registra el costo final', async () => {
    await crear(of(cotizacion()));
    expect(texto()).toContain('$ 80.000');
    expect(texto()).toContain(NOTA_COTIZACION);
  });

  it('prefiere la nota que envía el backend', async () => {
    await crear(of(cotizacion({ nota: 'Valor referencial de visita.' })));
    expect(texto()).toContain('Valor referencial de visita.');
    expect(texto()).not.toContain(NOTA_COTIZACION);
  });

  it('sin costo de referencia muestra la nota y ningún valor', async () => {
    await crear(of(cotizacion({ disponible: false, montoEstimado: null, nota: 'Aún no hay costo de referencia.' })));
    expect(texto()).toContain('Aún no hay costo de referencia.');
    expect(texto()).not.toContain('$');
  });

  it('sin costo de referencia ni nota usa el texto por defecto', async () => {
    await crear(of(cotizacion({ disponible: false, montoEstimado: null })));
    expect(texto()).toContain(NOTA_COTIZACION);
  });

  it('muestra un estado de carga', async () => {
    await crear(new Subject<Cotizacion>());
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('Consultando');
  });

  it('si falla muestra el mensaje del backend y deja continuar', async () => {
    await crear(throwError(() => new HttpErrorResponse({ status: 404, error: { detail: 'Especialidad no encontrada.' } })));
    expect(texto()).toContain('Especialidad no encontrada.');
    expect(texto()).toContain('Puedes continuar con tu solicitud');
  });
});
